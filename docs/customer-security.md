# Customer Security

## Data Privacy

Customer APIs must never expose:

- Purchase price, landed cost, supplier price, profit, margin, supplier details, accounting mappings, Tally exports, admin users, audit logs, internal notes, private stock locations, internal stock reasons, or private file-storage identifiers.

Use customer-safe DTO mappers for every public/customer endpoint.

## Authentication Boundaries

- Admin users remain in the existing admin user model.
- Customer identities use a separate `CustomerAccount` model linked to `CustomerModel`.
- Customer tokens must not authorize admin routes.
- Admin tokens must not be accepted by customer account routes unless a deliberate support impersonation flow is designed later with audit logging.

## Ownership Rules

- Customers can access only their own profile, addresses, wishlist, cart, orders, payments, invoices, returns, refunds, reviews, and notifications.
- Guest order tracking requires secure verification.
- URL identifiers must never be the only authorization check.

## Checkout Security

- Server revalidates cart lines, prices, discounts, shipping, tax, COD eligibility, and stock.
- Payment success is verified by the API and provider webhooks.
- Stock reservations expire.
- Order creation is idempotent.

## Input and Abuse Protection

- Keep Zod validation at API boundaries.
- Add rate limits for login, registration, password reset, verification, contact, newsletter, search suggestions, and order tracking.
- Store password hashes only.
- Store verification codes as hashes with expiry.
- Keep explicit marketing consent separate from transactional communication.

## Browser Security

- Configure API URL through environment files.
- Use HTTPS in production.
- If cookies are used, configure `HttpOnly`, `Secure`, and appropriate `SameSite`.
- Do not cache payment responses, account APIs, order details, or checkout confirmations in PWA caches.

## Audit Events

Audit at minimum:

- Customer registration.
- Login failures and suspicious activity.
- Account linking.
- Email/mobile verification changes.
- Password reset.
- Address changes.
- Checkout reservation creation/expiry.
- Payment verification result.
- Order cancellation and return requests.
