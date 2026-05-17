import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: { code: 'internal_error', message: 'Internal server error' } });
}
