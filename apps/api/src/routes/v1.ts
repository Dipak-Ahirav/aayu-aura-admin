import { Router } from 'express';
import { login, me } from '../domain/auth/auth.controller.js';
import { dashboardSummary } from '../domain/dashboard/dashboard.controller.js';
import {
  getModuleOverviewBySlug,
  listModuleOverviews,
} from '../domain/module-overviews/module-overview.controller.js';
import { createOrder, getOrder, listOrders } from '../domain/orders/order.controller.js';
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
v1Router.get('/dashboard/summary', authenticate, dashboardSummary);
v1Router.get('/orders', authenticate, listOrders);
v1Router.post('/orders', authenticate, createOrder);
v1Router.get('/orders/:id', authenticate, getOrder);
v1Router.get('/module-overviews', authenticate, listModuleOverviews);
v1Router.get('/module-overviews/:slug', authenticate, getModuleOverviewBySlug);

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
