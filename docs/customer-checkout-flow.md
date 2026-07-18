# Customer Checkout Flow

## Principles

- Browser cart data is never trusted.
- Prices, discounts, tax, shipping, stock, and COD eligibility are calculated by the API.
- Adding to cart does not reduce stock.
- Checkout stock reservations are temporary and expire.
- Orders preserve item, price, tax, payment, and address snapshots.

## Guest Flow

1. Customer adds products to a versioned local cart.
2. Customer opens checkout.
3. Customer app sends cart lines to `POST /public/cart/validate` or `POST /customer/cart/validate`.
4. API validates product status, variant status, stock policy, current prices, and quantity limits.
5. API returns corrected customer-safe line items and warnings for removed/changed items.
6. Customer enters shipping and billing address.
7. API validates PIN code, delivery availability, shipping charge, tax, and COD eligibility.
8. API creates a checkout session with expiry.
9. API reserves stock for the session only after final review.
10. Customer selects COD or online payment.
11. API creates payment attempt or COD order intent.
12. API creates the final order only after successful payment verification or COD confirmation.

Guest order tracking must require secure verification, such as order number plus OTP/token, not only order number.

## Logged-In Flow

1. Customer cart may be persisted server-side.
2. If a guest cart exists during login, API merges carts using product/variant IDs and revalidates quantities.
3. Invalid products, price changes, and stock changes are returned explicitly.
4. Customer selects saved or new address.
5. API stores address snapshots on checkout/order records.
6. Customer proceeds through delivery, coupon, payment, and confirmation using the same server validation as guest checkout.

## Required Backend Capabilities

- Cart validation endpoint.
- Cart merge endpoint.
- Checkout session model with expiry.
- Stock reservation model or stock movement type with reservation ownership and expiry.
- Coupon validation and usage reservation.
- Shipping/tax calculation service.
- COD eligibility service.
- Idempotent order creation service.
- Checkout cleanup job or request-time expiry enforcement.

## Failure Handling

- Expired checkout sessions release reservations.
- Payment failure keeps the order uncreated or in a safe pending state until verified.
- Duplicate callbacks must not create duplicate orders.
- Price or stock changes must require customer confirmation before payment.
