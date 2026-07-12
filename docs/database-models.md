# Database Models

## Modeling Principles

- Use separate collections for independent business entities.
- Keep financial and inventory history immutable.
- Use soft deletion where records may be referenced by orders, invoices, purchases, returns, or stock transactions.
- Avoid unlimited arrays inside single documents.
- Store money in paise and calculate authoritative totals on the backend.
- Keep image binary data outside product documents. Product records store image metadata and provider keys only.

## Initial Foundation Collections

### users

Fields:

- `name`
- `email`
- `passwordHash`
- `role`
- `isActive`
- `failedLoginAttempts`
- `lastLoginAt`
- timestamps

Indexes:

- unique `email`
- `isActive`

### roles and permissions

The first foundation stores role permissions in code to bootstrap authorization. A later phase should persist custom roles and permissions in MongoDB while preserving the default roles:

- Owner
- Administrator
- Accountant
- Inventory Manager
- Order Manager
- Viewer

### businessSettings

Planned fields:

- display and legal business names
- address and contact details
- GSTIN, PAN, state, state code
- currency, locale, timezone
- financial year start
- invoice footer, terms, return policy
- logo, invoice logo, signatures, UPI QR code

## Planned Core Collections

Product and catalogue:

- `products`
- `productVariants`
- `productImages`
- `categories`
- `productAttributes`
- `collections`
- `brands`
- `fileAssets`

Procurement:

- `suppliers`
- `purchases`
- `purchaseReturns`
- `supplierPayments`

Sales:

- `customers`
- `customerAddresses`
- `orders`
- `orderItems`
- `invoices`
- `invoiceItems`
- `payments`
- `refunds`
- `shipments`
- `returns`
- `exchanges`

Inventory:

- `stockTransactions`
- `stockReservations`
- `warehouses`
- `stockLocations`

Finance and operations:

- `expenses`
- `expenseCategories`
- `invoiceSequences`
- `accountingMappings`
- `accountingExports`
- `communications`
- `notifications`
- `auditLogs`
- `systemSettings`

## Required Indexes

Create indexes for:

- product `sku`, `barcode`, and text search on product name
- customer `mobile` and `email`
- order number and status
- invoice number and status
- purchase number
- supplier invoice number
- shipment tracking number
- created date fields for reports

Unique indexes are required for SKU, barcode where present, order numbers, invoice numbers, and sequence-controlled document IDs.

## Inventory Rule

Stock must never be changed by directly editing current stock alone. Every change requires a stock transaction that records:

- product or variant
- movement type
- quantity
- previous balance
- new balance
- business reason
- linked entity
- user
- timestamp

## Invoice Rule

Finalized invoices are locked. Corrections must use cancellation, credit note, debit note, revision workflow, or authorized override with audit history.
