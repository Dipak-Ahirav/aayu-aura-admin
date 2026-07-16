import { Router } from 'express';
import { login, me } from '../domain/auth/auth.controller.js';
import {
  createCustomer,
  deactivateCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from '../domain/customers/customer.controller.js';
import { dashboardSummary } from '../domain/dashboard/dashboard.controller.js';
import {
  getModuleOverviewBySlug,
  listModuleOverviews,
} from '../domain/module-overviews/module-overview.controller.js';
import { createInvoice, getInvoice, listInvoices } from '../domain/invoices/invoice.controller.js';
import {
  createMasterData,
  deactivateMasterData,
  getMasterData,
  listMasterData,
  updateMasterData,
} from '../domain/master-data/master-data.controller.js';
import { createOrder, getOrder, listOrders } from '../domain/orders/order.controller.js';
import { createPayment, listPayments } from '../domain/payments/payment.controller.js';
import {
  createProduct,
  listProducts,
  updateProduct,
} from '../domain/products/product.controller.js';
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
v1Router.get('/master-data', authenticate, listMasterData);
v1Router.post('/master-data', authenticate, createMasterData);
v1Router.get('/master-data/:id', authenticate, getMasterData);
v1Router.patch('/master-data/:id', authenticate, updateMasterData);
v1Router.delete('/master-data/:id', authenticate, deactivateMasterData);
v1Router.get('/products', authenticate, listProducts);
v1Router.post('/products', authenticate, createProduct);
v1Router.patch('/products/:id', authenticate, updateProduct);
v1Router.get('/customers', authenticate, listCustomers);
v1Router.post('/customers', authenticate, createCustomer);
v1Router.get('/customers/:id', authenticate, getCustomer);
v1Router.patch('/customers/:id', authenticate, updateCustomer);
v1Router.delete('/customers/:id', authenticate, deactivateCustomer);
v1Router.get('/orders', authenticate, listOrders);
v1Router.post('/orders', authenticate, createOrder);
v1Router.get('/orders/:id', authenticate, getOrder);
v1Router.get('/payments', authenticate, listPayments);
v1Router.post('/payments', authenticate, createPayment);
v1Router.get('/invoices', authenticate, listInvoices);
v1Router.post('/invoices', authenticate, createInvoice);
v1Router.get('/invoices/:id', authenticate, getInvoice);
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
