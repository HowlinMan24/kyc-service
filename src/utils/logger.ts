import pino from 'pino';
import { env } from '../config/env.js';

const base = {
  level: env.LOG_LEVEL,
  redact: {
    paths: ['req.headers.authorization', 'password', '*.password', '*.passwordHash'],
    censor: '[REDACTED]',
  },
};

export const logger =
  env.NODE_ENV === 'development'
    ? pino({ ...base, transport: { target: 'pino-pretty', options: { colorize: true } } })
    : pino(base);
