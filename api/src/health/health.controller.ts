import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

/**
 * Liveness/readiness probe.
 *
 * Unthrottled and intentionally cheap — load balancers and uptime monitors
 * hit this on a fixed interval. If we ever need a real readiness check
 * (DB ping, Redis ping, etc.), split this into /live vs /ready.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  @SkipThrottle()
  @Get()
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Returns 200 with a small JSON payload as long as the API process is up.',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        uptime: { type: 'number', example: 123.456 },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2026-06-11T19:00:00.000Z',
        },
      },
    },
  })
  check(): { status: 'ok'; uptime: number; timestamp: string } {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
