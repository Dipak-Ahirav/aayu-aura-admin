import type { RequestHandler } from 'express';
import { ok } from '../../infrastructure/http/api-response.js';
import { loginSchema } from './auth.schemas.js';
import { AuthService } from './auth.service.js';

const authService = new AuthService();

export const login: RequestHandler = async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const session = await authService.login(input);
    res.json(ok(session));
  } catch (error) {
    next(error);
  }
};

export const me: RequestHandler = async (req, res, next) => {
  try {
    const profile = await authService.currentUser(req.userId ?? '');
    res.json(ok(profile));
  } catch (error) {
    next(error);
  }
};
