import { Routes } from '@angular/router';
import { customerAuthGuard } from './core/guards/customer-auth.guard';
import { StorefrontLayoutComponent } from './layout/storefront-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: StorefrontLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/home/home-page.component').then((m) => m.HomePageComponent),
      },
      {
        path: 'shop',
        loadComponent: () =>
          import('./features/catalogue/catalogue-page.component').then(
            (m) => m.CataloguePageComponent,
          ),
      },
      {
        path: 'collections',
        loadComponent: () =>
          import('./features/content/content-page.component').then((m) => m.ContentPageComponent),
        data: { title: 'Collections', description: 'Curated saree collections.' },
      },
      {
        path: 'collections/:collectionSlug',
        loadComponent: () =>
          import('./features/catalogue/catalogue-page.component').then(
            (m) => m.CataloguePageComponent,
          ),
      },
      {
        path: 'category/:categorySlug',
        loadComponent: () =>
          import('./features/catalogue/catalogue-page.component').then(
            (m) => m.CataloguePageComponent,
          ),
      },
      {
        path: 'saree/:productSlug',
        loadComponent: () =>
          import('./features/product/product-detail-page.component').then(
            (m) => m.ProductDetailPageComponent,
          ),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./features/search/search-page.component').then((m) => m.SearchPageComponent),
      },
      {
        path: 'wishlist',
        loadComponent: () =>
          import('./features/wishlist/wishlist-page.component').then(
            (m) => m.WishlistPageComponent,
          ),
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('./features/cart/cart-page.component').then((m) => m.CartPageComponent),
      },
      {
        path: 'checkout',
        loadComponent: () =>
          import('./features/checkout/checkout-page.component').then(
            (m) => m.CheckoutPageComponent,
          ),
      },
      {
        path: 'checkout/:step',
        loadComponent: () =>
          import('./features/checkout/checkout-page.component').then(
            (m) => m.CheckoutPageComponent,
          ),
      },
      {
        path: 'order-success',
        loadComponent: () =>
          import('./features/orders/order-result-page.component').then(
            (m) => m.OrderResultPageComponent,
          ),
        data: { result: 'success' },
      },
      {
        path: 'order-failure',
        loadComponent: () =>
          import('./features/orders/order-result-page.component').then(
            (m) => m.OrderResultPageComponent,
          ),
        data: { result: 'failure' },
      },
      {
        path: 'track-order',
        loadComponent: () =>
          import('./features/tracking/track-order-page.component').then(
            (m) => m.TrackOrderPageComponent,
          ),
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/authentication/login-page.component').then(
            (m) => m.LoginPageComponent,
          ),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/authentication/register-page.component').then(
            (m) => m.RegisterPageComponent,
          ),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/authentication/auth-placeholder-page.component').then(
            (m) => m.AuthPlaceholderPageComponent,
          ),
        data: { title: 'Forgot password' },
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/authentication/auth-placeholder-page.component').then(
            (m) => m.AuthPlaceholderPageComponent,
          ),
        data: { title: 'Reset password' },
      },
      {
        path: 'verify-email',
        loadComponent: () =>
          import('./features/authentication/auth-placeholder-page.component').then(
            (m) => m.AuthPlaceholderPageComponent,
          ),
        data: { title: 'Verify email' },
      },
      {
        path: 'verify-mobile',
        loadComponent: () =>
          import('./features/authentication/auth-placeholder-page.component').then(
            (m) => m.AuthPlaceholderPageComponent,
          ),
        data: { title: 'Verify mobile' },
      },
      {
        path: 'account',
        canActivate: [customerAuthGuard],
        loadComponent: () =>
          import('./features/account/account-page.component').then((m) => m.AccountPageComponent),
      },
      {
        path: 'account/:section',
        canActivate: [customerAuthGuard],
        loadComponent: () =>
          import('./features/account/account-page.component').then((m) => m.AccountPageComponent),
      },
      {
        path: 'account/orders/:orderNumber',
        canActivate: [customerAuthGuard],
        loadComponent: () =>
          import('./features/orders/order-detail-page.component').then(
            (m) => m.OrderDetailPageComponent,
          ),
      },
      {
        path: ':slug',
        loadComponent: () =>
          import('./features/content/content-page.component').then((m) => m.ContentPageComponent),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/content/not-found-page.component').then((m) => m.NotFoundPageComponent),
  },
];
