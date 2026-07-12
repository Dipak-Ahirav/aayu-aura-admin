import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { fail } from '../infrastructure/http/api-response.js';
import { AppError } from '../infrastructure/http/app-error.js';
import { logger } from '../infrastructure/logging/logger.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    const fieldErrors = Object.fromEntries(
      error.issues.map((issue) => [issue.path.join('.'), issue.message]),
    );
    res.status(400).json(fail('VALIDATION_FAILED', 'Request validation failed.', fieldErrors));
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json(fail(error.code, error.message, error.fieldErrors));
    return;
  }

  logger.error({ error }, 'Unhandled API error');
  res.status(500).json(fail('INTERNAL_SERVER_ERROR', 'Something went wrong.'));
};
