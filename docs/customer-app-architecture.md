# Customer App Architecture

## Scope

The customer storefront extends the existing monorepo. It does not replace the admin portal and does not introduce a second backend. Admin users, customers, products, orders, invoices, inventory, payments, shipping, returns, settings, and audit logs remain in the existing API and MongoDB database.

## Applications

```text
apps/
  admin-web/      Existing Angular admin portal.
  api/            Existing Express API.
  customer-web/   New Angular 20 customer storefront.
packages/
  shared-types/   Shared DTOs and public-safe contracts.
```

## Customer Web Foundation

`apps/customer-web` uses the same Angular major version as the admin portal:

- Angular 20 standalone components.
- Angular Router with lazy route entry points.
- Signals for local UI state.
- RxJS for HTTP workflows and debounced search later.
- Reactive Forms.
- SCSS theme files.
- Environment-based API configuration.
- Feature-owned folders under `src/app/features`.

Proposed structure:

```text
apps/customer-web/
  angular.json
  package.json
  tsconfig.json
  tsconfig.app.json
  tsconfig.spec.json
  public/
    robots.txt
  src/
    index.html
    main.ts
    styles.scss
    environments/
      environment.ts
      environment.production.ts
    app/
      app.component.ts
      app.config.ts
      app.routes.ts
      core/
        api/
        configuration/
        errors/
        guards/
        interceptors/
        storage/
      layout/
        announcement-bar/
        footer/
        header/
        mobile-navigation/
        storefront-layout.component.ts
      shared/
        models/
        ui/
        utilities/
      state/
        cart/
        session/
        storefront/
        wishlist/
      features/
        home/
        catalogue/
        product/
        search/
        authentication/
        account/
        addresses/
        wishlist/
        cart/
        checkout/
        orders/
        tracking/
        content/
```

## API Boundaries

Keep existing admin endpoints working as-is. Add new route namespaces inside the existing `/api/v1` router:

- `/public/*` for anonymous storefront browsing and content.
- `/customer/*` for authenticated customer account, cart, checkout, orders, returns, and notifications.
- Existing admin routes can remain at their current paths initially to reduce regression risk; a future `/admin/*` alias can be added without removing current paths.

Controllers should stay thin. Customer-facing business rules belong in domain services and customer DTO mappers. Public mappers must never return Mongoose documents directly.

## Authentication

Admin authentication remains separate from customer authentication. Customer accounts should use a `CustomerAccount` model linked to `CustomerModel`, with separate password hash, verification status, refresh-token/session records, and account status.

Registration must link to an existing customer business record only after verified ownership of email or mobile. Linking events must be audited.

## Product Catalogue

The current `ProductModel` is sufficient only for an admin inventory foundation. Customer catalogue phases require extending product data with storefront fields, variants, galleries, slugs, filter attributes, and SEO metadata. Public list/detail APIs should calculate friendly availability from stock and settings.

## Cart and Checkout

Guest carts are client-side but untrusted. Logged-in carts may be persisted. Every checkout path must call backend validation for product status, stock, price, tax, shipping, coupon eligibility, COD eligibility, and reservation expiry. Order creation must use server-calculated totals and immutable snapshots.

## Deployment

The customer web app is a separate frontend deployable, intended for Vercel but not hardcoded to Vercel. The API remains deployable on Render. API URL and customer origin are environment-configured.

## Phase Plan Based On Current Repository

1. Phase 1: inspection, gap analysis, architecture, checkout/payment/security docs, baseline verification.
2. Phase 2: customer Angular app foundation, routing, theme, layout, HTTP infrastructure, scripts, README/environment updates.
3. Phase 3: public storefront backed by new customer-safe public catalogue APIs.
4. Phase 4: customer auth identity, account linking, profile, and addresses.
5. Phase 5: wishlist and cart architecture with backend validation.
6. Phase 6: checkout session and stock reservation.
7. Phase 7: payment adapter, COD, idempotent order creation, callbacks, and webhooks.
8. Phase 8: customer orders, invoices, shipment tracking, cancellations.
9. Phase 9: returns, exchanges, refunds.
10. Phase 10: reviews, notifications, content management.
11. Phase 11: SEO, accessibility, performance, PWA readiness.
12. Phase 12: tests, deployment, production security review.
