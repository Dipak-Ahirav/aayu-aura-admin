import type { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { AdminLayoutComponent } from './layout/admin-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/products/products-page.component').then(
            (m) => m.ProductsPageComponent,
          ),
      },
      {
        path: 'orders/new',
        loadComponent: () =>
          import('./features/orders/new-order.component').then((m) => m.NewOrderComponent),
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('./features/customers/customers-page.component').then(
            (m) => m.CustomersPageComponent,
          ),
      },
      {
        path: 'suppliers',
        loadComponent: () =>
          import('./features/suppliers/suppliers-page.component').then(
            (m) => m.SuppliersPageComponent,
          ),
      },
      {
        path: 'purchases',
        loadComponent: () =>
          import('./features/purchases/purchases-page.component').then(
            (m) => m.PurchasesPageComponent,
          ),
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./features/inventory/inventory-page.component').then(
            (m) => m.InventoryPageComponent,
          ),
      },
      {
        path: 'shipping',
        loadComponent: () =>
          import('./features/shipping/shipping-page.component').then(
            (m) => m.ShippingPageComponent,
          ),
      },
      {
        path: 'returns',
        loadComponent: () =>
          import('./features/returns/returns-page.component').then((m) => m.ReturnsPageComponent),
      },
      {
        path: 'expenses',
        loadComponent: () =>
          import('./features/expenses/expenses-page.component').then(
            (m) => m.ExpensesPageComponent,
          ),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/reports-page.component').then((m) => m.ReportsPageComponent),
      },
      {
        path: 'accounting-exports',
        loadComponent: () =>
          import('./features/accounting-exports/accounting-exports-page.component').then(
            (m) => m.AccountingExportsPageComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/users/users-page.component').then((m) => m.UsersPageComponent),
      },
      {
        path: 'audit-logs',
        loadComponent: () =>
          import('./features/audit-logs/audit-logs-page.component').then(
            (m) => m.AuditLogsPageComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/orders/orders-page.component').then((m) => m.OrdersPageComponent),
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./features/payments/payments-page.component').then(
            (m) => m.PaymentsPageComponent,
          ),
      },
      {
        path: 'master-data',
        loadComponent: () =>
          import('./features/master-data/master-data-page.component').then(
            (m) => m.MasterDataPageComponent,
          ),
      },
      {
        path: 'invoices',
        loadComponent: () =>
          import('./features/invoices/invoices-page.component').then(
            (m) => m.InvoicesPageComponent,
          ),
      },
      {
        path: ':module',
        loadComponent: () =>
          import('./features/operations/operations-page.component').then(
            (m) => m.OperationsPageComponent,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
