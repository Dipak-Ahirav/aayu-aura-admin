import type { RequestHandler } from 'express';
import crypto from 'node:crypto';

export const requestId: RequestHandler = (req, res, next) => {
  const requestIdHeader = req.header('x-request-id');
  const id = requestIdHeader?.trim() || crypto.randomUUID();
  res.setHeader('x-request-id', id);
  next();
};
