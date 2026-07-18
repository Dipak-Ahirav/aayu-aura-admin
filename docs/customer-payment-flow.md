# Customer Payment Flow

## Scope

Payment integration is intentionally not implemented in Phase 2. This document defines the architecture for later phases.

## Payment Adapter

Use a provider-neutral interface:

```ts
interface CustomerPaymentProvider {
  createPaymentOrder(input: PaymentOrderInput): Promise<PaymentOrderResult>;
  verifyClientReturn(input: PaymentReturnInput): Promise<PaymentVerificationResult>;
  verifyWebhook(input: RawWebhookInput): Promise<VerifiedWebhookEvent>;
}
```

Provider secrets must remain on the API. The customer app receives only public provider keys or order tokens required by the provider.

## Online Payment Flow

1. Customer confirms checkout review.
2. API validates checkout session and reservation.
3. API creates a payment attempt with idempotency key.
4. API asks provider adapter to create a payment order.
5. Customer completes provider checkout.
6. Customer returns to success/failure route.
7. API verifies provider signature/status server-side.
8. Webhook also verifies payment result.
9. Order is created or updated exactly once.
10. Payment record is linked to order/invoice.

## COD Flow

1. API validates COD eligibility from settings, order amount, PIN code, customer risk flags, and product rules.
2. Customer confirms COD.
3. API creates order with unpaid or COD-pending payment status.
4. Existing admin order workflow handles confirmation, shipment, and collection.

## Idempotency

Persist provider event IDs and local idempotency keys. Duplicate webhooks, duplicate browser callbacks, refreshes, and retry submissions must return the existing result instead of creating a second order/payment.

## Security

- Verify all signatures server-side.
- Do not store card, UPI credential, or provider secret data.
- Do not trust frontend payment success.
- Keep webhook raw body support where the provider requires it.
- Keep internal payment comments out of customer DTOs.
