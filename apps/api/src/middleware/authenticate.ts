import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../infrastructure/http/app-error.js';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    next(new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.'));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    req.userId = typeof payload.sub === 'string' ? payload.sub : undefined;
    if (!req.userId) {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid access token.');
    }
    next();
  } catch {
    next(new AppError(401, 'INVALID_TOKEN', 'Invalid access token.'));
  }
};
