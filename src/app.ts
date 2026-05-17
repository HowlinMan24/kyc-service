import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import YAML from 'yaml';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { authRouter } from './routes/auth.js';
import { kycRouter } from './routes/kyc.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NotFound } from './utils/errors.js';

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '256kb' }));
  app.use(pinoHttp({ logger }));
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

  // OpenAPI docs
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const specPath = join(here, '..', 'docs', 'openapi.yaml');
    const spec = YAML.parse(readFileSync(specPath, 'utf-8'));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
  } catch (err) {
    logger.warn({ err }, 'OpenAPI spec not loaded');
  }

  app.use('/api/auth', authRouter);
  app.use('/api/kyc', kycRouter);

  app.use((_req, _res, next) => next(NotFound('Route not found')));
  app.use(errorHandler);
  return app;
}
