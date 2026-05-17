import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Unauthorized, Forbidden } from '../utils/errors.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'admin' | 'reviewer' | 'user';
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(Unauthorized('Missing bearer token'));
  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    next(Unauthorized('Invalid or expired token'));
  }
}

export function requireRole(...roles: Array<JwtPayload['role']>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(Unauthorized());
    if (!roles.includes(req.user.role)) return next(Forbidden(`Requires role: ${roles.join(', ')}`));
    next();
  };
}
