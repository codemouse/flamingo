import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Redis } from 'ioredis';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ScheduleModule } from '@nestjs/schedule';
import { PlaidModule } from './plaid/plaid.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { HealthController } from './health/health.controller';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true },
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const env = config.get<string>('NODE_ENV');
        const isProd = env === 'production';
        const isTest = env === 'test';
        return {
          pinoHttp: {
            level: isTest ? 'silent' : isProd ? 'info' : 'debug',
            transport: isProd
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: { singleLine: true, colorize: true },
                },
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'res.headers["set-cookie"]',
                '*.password',
                '*.passwordHash',
                '*.accessToken',
                '*.refreshToken',
              ],
              censor: '[REDACTED]',
            },
            customLogLevel: (_req, res, err) => {
              if (err || res.statusCode >= 500) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },
          },
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const env = config.get<string>('NODE_ENV');
        const isTest = env === 'test';
        const redisUrl = config.get<string>('REDIS_URL');

        // Redis-backed storage in non-test environments when REDIS_URL is set.
        // Falls back to the default in-memory storage otherwise (single-replica
        // dev / tests).
        const storage =
          !isTest && redisUrl
            ? new ThrottlerStorageRedisService(new Redis(redisUrl))
            : undefined;

        return {
          throttlers: [
            { name: 'default', ttl: 60_000, limit: isTest ? 100_000 : 100 },
            // Stricter named throttler used by /auth routes via
            // `@Throttle({ auth: { limit, ttl } })`.
            { name: 'auth', ttl: 60_000, limit: 10 },
          ],
          // Globally bypass throttling in tests; per-route @Throttle() overrides
          // would otherwise still kick in regardless of module-level limits.
          skipIf: () => isTest,
          ...(storage ? { storage } : {}),
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'flamingo'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        migrationsRun: false,
      }),
      inject: [ConfigService],
    }),
    PlaidModule,
    UsersModule,
    AuthModule,
    AdminModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Strips fields marked with `@Exclude({ toPlainOnly: true })` (e.g.
    // password_hash, access_token, token_hash) from any entity returned by a
    // controller. Defence in depth on top of explicit DTOs.
    {
      provide: APP_INTERCEPTOR,
      useFactory: (reflector: Reflector) =>
        new ClassSerializerInterceptor(reflector, {
          excludeExtraneousValues: false,
        }),
      inject: [Reflector],
    },
  ],
})
export class AppModule {}
