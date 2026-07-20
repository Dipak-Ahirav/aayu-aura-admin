import { Router } from 'express';
import {
  archiveAccountingExport,
  createAccountingExport,
  createLedgerMapping,
  deactivateLedgerMapping,
  downloadAccountingExport,
  listAccountingExports,
  updateAccountingExport,
  updateLedgerMapping,
} from '../domain/accounting-exports/accounting-export.controller.js';
import {
  createAuditLog,
  exportAuditLogs,
  getAuditLog,
  listAuditLogs,
  reviewAuditLog,
} from '../domain/audit-logs/audit-log.controller.js';
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
  cancelExpense,
  createExpense,
  exportExpenses,
  getExpense,
  listExpenses,
  updateExpense,
} from '../domain/expenses/expense.controller.js';
import {
  getModuleOverviewBySlug,
  listModuleOverviews,
} from '../domain/module-overviews/module-overview.controller.js';
import {
  createInvoice,
  downloadInvoicePdf,
  getInvoice,
  listInvoices,
} from '../domain/invoices/invoice.controller.js';
import {
  createStockMovement,
  listInventory,
  reverseStockMovement,
  updateStockMovement,
} from '../domain/inventory/inventory.controller.js';
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
import {
  cancelPurchase,
  createPurchase,
  getPurchase,
  listPurchases,
  updatePurchase,
} from '../domain/purchases/purchase.controller.js';
import {
  cancelShipment,
  createShipment,
  downloadOrderPackingSlip,
  downloadPackingSlip,
  getShipment,
  listShipments,
  updateShipment,
} from '../domain/shipping/shipping.controller.js';
import {
  createSettingsBackup,
  downloadSettingsBackup,
  getBusinessSettings,
  listSettings,
  updateBusinessSettings,
} from '../domain/settings/settings.controller.js';
import { storefrontHome } from '../domain/storefront-home/storefront-home.controller.js';
import { storefrontCollections } from '../domain/storefront-collections/storefront-collections.controller.js';
import {
  storefrontProductDetail,
  storefrontProducts,
} from '../domain/storefront-products/storefront-products.controller.js';
import { storefrontSearch } from '../domain/storefront-search/storefront-search.controller.js';
import {
  storefrontDownloadInvoice,
  storefrontTrackOrder,
} from '../domain/storefront-tracking/storefront-tracking.controller.js';
import {
  cancelReturn,
  createExchange,
  createReturn,
  getReturn,
  listReturns,
  updateReturn,
} from '../domain/returns/return.controller.js';
import {
  archiveReport,
  createReport,
  exportReports,
  getReport,
  listReports,
  updateReport,
} from '../domain/reports/report.controller.js';
import {
  createSupplier,
  deactivateSupplier,
  exportSuppliers,
  getSupplier,
  listSuppliers,
  updateSupplier,
} from '../domain/suppliers/supplier.controller.js';
import {
  createUser,
  deactivateUser,
  getUser,
  listUsers,
  updateUser,
} from '../domain/users/user.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { ok } from '../infrastructure/http/api-response.js';

export const v1Router = Router();

v1Router.get('/health', (_req, res) => {
  res.json(ok({ status: 'ok', service: 'aayu-aura-api' }));
});

v1Router.get('/ready', (_req, res) => {
  res.json(ok({ status: 'ready' }));
});

v1Router.get('/public/home', storefrontHome);
v1Router.get('/public/collections', storefrontCollections);
v1Router.get('/public/collections/:collectionSlug', storefrontCollections);
v1Router.get('/public/products/:productSlug', storefrontProductDetail);
v1Router.get('/public/products', storefrontProducts);
v1Router.get('/public/search', storefrontSearch);
v1Router.post('/public/track-order', storefrontTrackOrder);
v1Router.get(
  '/public/track-order/:orderNumber/invoice/:invoiceId/pdf',
  storefrontDownloadInvoice,
);
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
v1Router.get('/suppliers', authenticate, listSuppliers);
v1Router.get('/suppliers/export', authenticate, exportSuppliers);
v1Router.post('/suppliers', authenticate, createSupplier);
v1Router.get('/suppliers/:id', authenticate, getSupplier);
v1Router.patch('/suppliers/:id', authenticate, updateSupplier);
v1Router.delete('/suppliers/:id', authenticate, deactivateSupplier);
v1Router.get('/orders', authenticate, listOrders);
v1Router.post('/orders', authenticate, createOrder);
v1Router.get('/orders/:id/packing-slip', authenticate, downloadOrderPackingSlip);
v1Router.get('/orders/:id', authenticate, getOrder);
v1Router.get('/purchases', authenticate, listPurchases);
v1Router.post('/purchases', authenticate, createPurchase);
v1Router.get('/purchases/:id', authenticate, getPurchase);
v1Router.patch('/purchases/:id', authenticate, updatePurchase);
v1Router.delete('/purchases/:id', authenticate, cancelPurchase);
v1Router.get('/inventory', authenticate, listInventory);
v1Router.post('/stock-transactions', authenticate, createStockMovement);
v1Router.patch('/stock-transactions/:id', authenticate, updateStockMovement);
v1Router.delete('/stock-transactions/:id', authenticate, reverseStockMovement);
v1Router.get('/payments', authenticate, listPayments);
v1Router.post('/payments', authenticate, createPayment);
v1Router.get('/invoices', authenticate, listInvoices);
v1Router.post('/invoices', authenticate, createInvoice);
v1Router.get('/invoices/:id/pdf', authenticate, downloadInvoicePdf);
v1Router.get('/invoices/:id', authenticate, getInvoice);
v1Router.get('/shipments', authenticate, listShipments);
v1Router.post('/shipments', authenticate, createShipment);
v1Router.get('/shipments/:id/packing-slip', authenticate, downloadPackingSlip);
v1Router.get('/shipments/:id', authenticate, getShipment);
v1Router.patch('/shipments/:id', authenticate, updateShipment);
v1Router.delete('/shipments/:id', authenticate, cancelShipment);
v1Router.get('/returns', authenticate, listReturns);
v1Router.post('/returns', authenticate, createReturn);
v1Router.get('/returns/:id', authenticate, getReturn);
v1Router.patch('/returns/:id', authenticate, updateReturn);
v1Router.post('/returns/:id/exchange', authenticate, createExchange);
v1Router.delete('/returns/:id', authenticate, cancelReturn);
v1Router.get('/expenses', authenticate, listExpenses);
v1Router.get('/expenses/export', authenticate, exportExpenses);
v1Router.post('/expenses', authenticate, createExpense);
v1Router.get('/expenses/:id', authenticate, getExpense);
v1Router.patch('/expenses/:id', authenticate, updateExpense);
v1Router.delete('/expenses/:id', authenticate, cancelExpense);
v1Router.get('/reports', authenticate, listReports);
v1Router.get('/reports/export', authenticate, exportReports);
v1Router.post('/reports', authenticate, createReport);
v1Router.get('/reports/:id', authenticate, getReport);
v1Router.patch('/reports/:id', authenticate, updateReport);
v1Router.delete('/reports/:id', authenticate, archiveReport);
v1Router.get('/accounting-exports', authenticate, listAccountingExports);
v1Router.post('/accounting-exports', authenticate, createAccountingExport);
v1Router.get('/accounting-exports/:id/file', authenticate, downloadAccountingExport);
v1Router.patch('/accounting-exports/:id', authenticate, updateAccountingExport);
v1Router.delete('/accounting-exports/:id', authenticate, archiveAccountingExport);
v1Router.post('/accounting-mappings', authenticate, createLedgerMapping);
v1Router.patch('/accounting-mappings/:id', authenticate, updateLedgerMapping);
v1Router.delete('/accounting-mappings/:id', authenticate, deactivateLedgerMapping);
v1Router.get('/users', authenticate, listUsers);
v1Router.post('/users', authenticate, createUser);
v1Router.get('/users/:id', authenticate, getUser);
v1Router.patch('/users/:id', authenticate, updateUser);
v1Router.delete('/users/:id', authenticate, deactivateUser);
v1Router.get('/audit-logs', authenticate, listAuditLogs);
v1Router.get('/audit-logs/export', authenticate, exportAuditLogs);
v1Router.post('/audit-logs', authenticate, createAuditLog);
v1Router.get('/audit-logs/:id', authenticate, getAuditLog);
v1Router.patch('/audit-logs/:id/review', authenticate, reviewAuditLog);
v1Router.get('/settings', authenticate, listSettings);
v1Router.get('/settings/business', authenticate, getBusinessSettings);
v1Router.patch('/settings/business', authenticate, updateBusinessSettings);
v1Router.post('/settings/backups', authenticate, createSettingsBackup);
v1Router.get('/settings/backups/:id/file', authenticate, downloadSettingsBackup);
v1Router.get('/module-overviews', authenticate, listModuleOverviews);
v1Router.get('/module-overviews/:slug', authenticate, getModuleOverviewBySlug);
