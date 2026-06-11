import * as Joi from 'joi';

const requiredInProd = (rule: Joi.Schema) =>
  Joi.alternatives().conditional('NODE_ENV', {
    is: 'production',
    then: rule.required(),
    otherwise: rule.optional().allow(''),
  });

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().port().default(5432),
  DB_USER: Joi.string().default('postgres'),
  DB_PASSWORD: Joi.string().default('postgres'),
  DB_NAME: Joi.string().default('flamingo'),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string()
    .min(16)
    .default('dev-only-refresh-secret-change-me'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // 32-byte key, base64 (44 chars) or hex (64 chars). Required in production.
  ENCRYPTION_KEY: requiredInProd(
    Joi.string().pattern(/^([A-Za-z0-9+/=]{43,}|[A-Fa-f0-9]{64})$/),
  ).default('ZGV2LW9ubHktMzItYnl0ZS1rZXktY2hhbmdlLW5vdyE='),

  WEB_ORIGIN: Joi.string().uri().default('http://localhost:5173'),
  COOKIE_DOMAIN: Joi.string().optional().allow(''),

  REDIS_URL: Joi.string().uri().optional().allow(''),

  PLAID_CLIENT_ID: requiredInProd(Joi.string()),
  PLAID_SECRET: requiredInProd(Joi.string()),
  PLAID_ENV: Joi.string().valid('sandbox', 'production').default('sandbox'),
  PLAID_PRODUCTS: Joi.string().optional().allow(''),
  PLAID_COUNTRY_CODES: Joi.string().optional().allow(''),
  PLAID_LANGUAGE: Joi.string().optional().allow(''),
  PLAID_WEBHOOK_URL: Joi.string().uri().optional().allow(''),
  PLAID_WEBHOOK_VERIFICATION_KEY: Joi.string().optional().allow(''),
}).unknown(true);
