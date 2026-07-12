# Implementation Plan

## Phase 1: Analysis and Foundation

Status: started.

Completed in this foundation pass:

- Created npm workspace monorepo.
- Added Angular admin app scaffold.
- Added Express API scaffold.
- Added shared DTO package.
- Added MongoDB connection layer.
- Added environment validation.
- Added initial JWT auth foundation.
- Added guarded admin shell and dashboard.
- Added Docker Compose MongoDB.
- Added architecture and data model docs.

Remaining Phase 1 work:

- Add seed script for owner user and default roles.
- Add OpenAPI generation.
- Add ESLint configuration after dependency install stabilizes.
- Add API integration tests.
- Add frontend unit tests.
- Add local visual verification after dev server starts.

## Phase 2: Authentication and Shell

- Refresh-token rotation and revocation.
- Forgot/reset/change password.
- Account activation/deactivation.
- Optional 2FA architecture.
- Persisted permissions and backend authorization middleware.
- Permission-aware frontend navigation and actions.
- Profile screen.

## Phase 3: Master Data and Products

- Master-data CRUD.
- Product CRUD with variants.
- Product image metadata and provider abstraction.
- Pricing and landed-cost calculations.
- Inventory fields and stock status.
- Product import/export.

## Phase 4: Suppliers, Purchases, and Inventory

- Supplier CRUD and ledger.
- Purchase drafts and receiving.
- Stock transactions.
- Supplier payments.
- Inventory reports.

## Phase 5: Customers and Orders

- Customer CRM.
- Address book.
- Manual order creation.
- Stock reservation and release.
- Order status history.

## Phase 6: Payments and Invoices

- Payment allocation.
- Invoice sequence locking.
- GST-ready invoice calculations.
- PDF generation.
- Email provider.
- WhatsApp click-to-chat and official provider adapter.

## Phase 7: Shipping, Returns, and Expenses

- Shipment tracking.
- Packing slip.
- Returns, exchanges, refunds, credit notes.
- Expense capture.

## Phase 8: Reports and Tally Export

- Dashboard backed by real data.
- Sales, purchase, inventory, customer, GST, and P&L reports.
- Tally mapping and export history.
- XML, JSON, Excel, and CSV export providers.

## Phase 9: Quality and Deployment

- Unit, integration, and E2E tests.
- Accessibility and responsive review.
- Security review.
- Docker production setup.
- Deployment guides.
- Backup and restore workflow.
