import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../infrastructure/http/app-error.js';
import { ok } from '../../infrastructure/http/api-response.js';
import {
  customerLoginSchema,
  customerOAuthSchema,
  customerRegisterSchema,
} from './customer-auth.schemas.js';
import { CustomerAuthService } from './customer-auth.service.js';

const service = new CustomerAuthService();

function bearerSubject(header?: string): string {
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new AppError(401, 'CUSTOMER_AUTH_REQUIRED', 'Customer authentication is required.');
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (typeof payload === 'string' || payload['typ'] !== 'customer' || !payload.sub) {
    throw new AppError(401, 'INVALID_CUSTOMER_TOKEN', 'Invalid customer session.');
  }
  return String(payload.sub);
}

export const customerRegister: RequestHandler = async (req, res, next) => {
  try {
    const input = customerRegisterSchema.parse(req.body);
    res.status(201).json(ok(await service.register(input)));
  } catch (error) {
    next(error);
  }
};

export const customerLogin: RequestHandler = async (req, res, next) => {
  try {
    const input = customerLoginSchema.parse(req.body);
    res.json(ok(await service.login(input)));
  } catch (error) {
    next(error);
  }
};

export const customerOAuth: RequestHandler = async (req, res, next) => {
  try {
    const input = customerOAuthSchema.parse(req.body);
    res.json(ok(await service.oauth(input)));
  } catch (error) {
    next(error);
  }
};

export const customerMe: RequestHandler = async (req, res, next) => {
  try {
    res.json(ok(await service.current(bearerSubject(req.headers.authorization))));
  } catch (error) {
    next(error);
  }
};
