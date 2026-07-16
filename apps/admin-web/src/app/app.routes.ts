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
