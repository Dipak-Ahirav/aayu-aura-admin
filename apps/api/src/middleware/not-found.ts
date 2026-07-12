import type { RequestHandler } from 'express';
import { fail } from '../infrastructure/http/api-response.js';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json(fail('ROUTE_NOT_FOUND', `No route exists for ${req.method} ${req.path}.`));
};
