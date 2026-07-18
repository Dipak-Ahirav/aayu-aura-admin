# Customer App API Gap Analysis

## Baseline

- Repository inspected: `D:\Aayu&Aura\Admin pannel`.
- Angular major version: 20.2.x in `apps/admin-web`.
- Backend base path: `/api/v1`.
- Existing API framework: Express, TypeScript, Mongoose, Zod, JWT access token auth, centralized API response/error handling, request IDs, Helmet, CORS, rate limiting, and structured logging.
- Existing public endpoints: `GET /api/v1/health`, `GET /api/v1/ready`.
- Existing admin auth endpoints: `POST /api/v1/auth/login`, `GET /api/v1/auth/me`.
- All business CRUD routes currently require admin authentication.

Baseline verification before customer changes:

- `npm run test`: passed after allowing build output writes. Admin web has no unit tests yet; API response helper assertions passed.
- `npm run build:api`: passed.
- `npm run build:web`: passed with a non-fatal Angular compiler cache warning: missing optional `lmdb` cache module.

## Existing Reusable APIs

The following admin APIs can be reused internally by services, but not exposed directly to customers because they use admin DTOs or admin ownership assumptions:

- Products: `GET /products`, `POST /products`, `PATCH /products/:id`.
- Master data: catalogue and order setup values.
- Customers: customer business records.
- Orders: order creation/list/detail for admin/offline flows.
- Payments: payment record listing and manual creation.
- Invoices: invoice list/create/detail/PDF download.
- Shipping: shipment list/create/detail/update/cancel and packing slips.
- Returns: return/exchange admin lifecycle.
- Inventory: stock list and stock movements.
- Settings: business settings and backups.
- Audit logs: audit recording and review.

## Existing Models That Can Be Reused

- `ProductModel`: source of truth for active/archived products, stock, public cover image, GST, HSN, and admin costs.
- `CustomerModel`: business customer profile created from admin, phone, WhatsApp, Instagram, or future web orders.
- `OrderModel`: operational order record, item price snapshots, customer snapshots, payment/fulfilment status.
- `PaymentModel`: recorded payment ledger.
- `InvoiceModel`: existing invoice engine and PDF generation.
- `ShipmentModel`: shipment tracking source.
- `ReturnRequestModel`: return/exchange source.
- `StockMovementModel`: inventory movement/reservation audit source.
- `BusinessSettingsModel`: business profile and future storefront settings anchor.
- `AuditLogModel`: required for account-linking and security events.
- `MasterDataModel`: categories, fabrics, order setup, and catalogue values.

## Current Customer Gaps

Public/customer endpoints do not yet exist. The current admin DTOs expose fields that must never reach the storefront, including purchase price, landed cost, exact stock, internal notes, supplier/accounting details, admin users, and audit details.

Required public API groups:

- `GET /public/storefront-settings`
- `GET /public/home`
- `GET /public/products`
- `GET /public/products/:slug`
- `GET /public/products/:slug/related`
- `GET /public/categories`
- `GET /public/categories/:slug/products`
- `GET /public/collections`
- `GET /public/collections/:slug/products`
- `GET /public/search/suggestions`
- `GET /public/search`
- `POST /public/newsletter-subscriptions`
- `POST /public/back-in-stock-subscriptions`
- `POST /public/contact-requests`
- `POST /public/track-order/start`
- `POST /public/track-order/verify`

Required customer-authenticated API groups:

- `POST /customer/auth/register`
- `POST /customer/auth/login`
- `POST /customer/auth/refresh`
- `POST /customer/auth/logout`
- `POST /customer/auth/forgot-password`
- `POST /customer/auth/reset-password`
- `POST /customer/auth/verify-email`
- `POST /customer/auth/verify-mobile`
- `GET /customer/account`
- `PATCH /customer/account/profile`
- `PATCH /customer/account/preferences`
- `POST /customer/account/change-password`
- `GET /customer/addresses`
- `POST /customer/addresses`
- `PATCH /customer/addresses/:id`
- `DELETE /customer/addresses/:id`
- `GET /customer/wishlist`
- `POST /customer/wishlist/items`
- `DELETE /customer/wishlist/items/:productId`
- `POST /customer/cart/validate`
- `POST /customer/cart/merge`
- `POST /customer/checkout/session`
- `POST /customer/checkout/:sessionId/address`
- `POST /customer/checkout/:sessionId/delivery`
- `POST /customer/checkout/:sessionId/coupon`
- `POST /customer/checkout/:sessionId/reserve`
- `POST /customer/checkout/:sessionId/payment`
- `POST /customer/orders`
- `GET /customer/orders`
- `GET /customer/orders/:orderNumber`
- `POST /customer/orders/:orderNumber/cancel`
- `GET /customer/invoices`
- `GET /customer/invoices/:id/pdf`
- `POST /customer/returns`
- `GET /customer/returns`
- `GET /customer/refunds`
- `GET /customer/notifications`
- `PATCH /customer/notifications/:id/read`
- `POST /customer/reviews`

Required webhook/payment API groups:

- `POST /public/payments/provider-webhook`
- `POST /public/payments/callback`

Provider-specific implementations should live behind a payment adapter and use idempotency keys.

## Required Database Changes

- Add `CustomerAccount` collection for storefront identities separate from admin users.
- Add customer address collection or embedded address documents with immutable order snapshots.
- Extend product catalogue for customer fields: slug, saree type, fabric, colours, pattern, work, occasion, collection, description, care instructions, dimensions, blouse info, gallery images, SEO metadata, flags, and public availability settings.
- Add product variant documents or embedded variants with customer-safe IDs, price/stock policy, images, and status.
- Add collection/category metadata with slugs and storefront visibility.
- Add storefront content/settings for homepage sections, banners, footer, WhatsApp links, policy pages, and configurable claims.
- Add wishlist and cart persistence for logged-in customers; keep guest cart client-side and revalidate server-side.
- Add checkout session and stock reservation records with expiry.
- Add coupon usage/reservation records if not already present.
- Add payment transaction/order attempt records with idempotency and webhook event de-duplication.
- Add order tracking verification tokens for guest tracking.
- Add review, back-in-stock subscription, notification, and consent event records.

## Required Admin Portal Extensions

- Manage storefront product fields, slugs, variants, gallery images, badges, SEO metadata, and public visibility.
- Manage categories, collections, homepage banners, homepage section ordering, footer content, policies, and promotional messages.
- Manage customer accounts and account-linking state without exposing passwords or tokens.
- Moderate reviews and back-in-stock subscriptions.
- Configure guest checkout, COD eligibility, stock display policy, shipping rules, return rules, tax text, analytics provider, and customer CORS origins.
- Surface customer web orders, checkout failures, payment attempts, webhook failures, returns, exchanges, refunds, and notification failures in existing operational modules.

## Environment Variable Changes

Backend:

- `CUSTOMER_WEB_URL=http://localhost:4300`
- `CORS_ALLOWED_ORIGINS=http://localhost:4200,http://127.0.0.1:4200,http://localhost:4300,http://127.0.0.1:4300`
- `CUSTOMER_JWT_ACCESS_SECRET`
- `CUSTOMER_JWT_REFRESH_SECRET`
- `CUSTOMER_JWT_ACCESS_EXPIRES_IN`
- `CUSTOMER_JWT_REFRESH_EXPIRES_IN`
- `PAYMENT_PROVIDER`
- `PAYMENT_WEBHOOK_SECRET`
- `PAYMENT_KEY_ID`
- `PAYMENT_KEY_SECRET`
- `CHECKOUT_RESERVATION_TTL_MINUTES`
- `ORDER_TRACKING_TOKEN_SECRET`
- `CUSTOMER_EMAIL_VERIFICATION_TTL_MINUTES`
- `CUSTOMER_MOBILE_VERIFICATION_TTL_MINUTES`

Customer web:

- `apiBaseUrl` via Angular environment files.
- `customerWebUrl` for canonical URLs.
- Feature flags for guest checkout, analytics, and PWA readiness.

## CORS Changes

Keep the existing `ADMIN_WEB_URL` behavior. Add `CUSTOMER_WEB_URL` and include local/production storefront origins in `CORS_ALLOWED_ORIGINS` or `CORS_ALLOWED_ORIGIN_PATTERNS`. Customer auth cookies, if used, must be scoped with secure SameSite settings appropriate for the deployed domains.

## Root Workspace Script Changes

Add scripts without replacing existing admin/API scripts:

- `dev:customer`
- `build:customer`
- `test:customer`
- `lint:customer`
- `e2e:customer`

`build:customer` must build `@aayu-aura/shared-types` before `@aayu-aura/customer-web`.

## Customer-Safe DTO Boundary

Public product DTOs may include selling price and friendly availability but must exclude purchase price, landed cost, exact stock count by default, internal notes, supplier data, profit, audit data, and admin user data.

Customer order DTOs may include the customer's own order number, status, item snapshots, totals, payments, invoices, shipment timeline, return eligibility, and customer-visible notes. They must exclude internal order notes, admin comments, staff ownership, supplier/accounting links, and internal stock movement reasons.
