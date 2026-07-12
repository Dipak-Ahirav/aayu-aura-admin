import { Router } from 'express';
import { login, me } from '../domain/auth/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { ok } from '../infrastructure/http/api-response.js';

export const v1Router = Router();

v1Router.get('/health', (_req, res) => {
  res.json(ok({ status: 'ok', service: 'aayu-aura-api' }));
});

v1Router.get('/ready', (_req, res) => {
  res.json(ok({ status: 'ready' }));
});

v1Router.post('/auth/login', login);
v1Router.get('/auth/me', authenticate, me);

v1Router.get('/settings/business', authenticate, (_req, res) => {
  res.json(
    ok({
      displayName: 'Aayu & Aura',
      legalName: 'Aayu & Aura',
      currency: 'INR',
      locale: 'en-IN',
      timeZone: 'Asia/Kolkata',
      financialYearStartMonth: 4,
      gstEnabled: false,
    }),
  );
});
