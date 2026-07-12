# Aayu & Aura Architecture

## Selected Architecture

Aayu & Aura uses a TypeScript monorepo with npm workspaces:

- `apps/admin-web`: Angular standalone admin portal.
- `apps/api`: Express REST API under `/api/v1`.
- `packages/shared-types`: DTOs and shared contracts used by both apps.
- `docs`: architecture, data model, and implementation records.

The backend is designed as the long-lived business API for the admin portal now and a separate customer portal later. Public customer-facing DTOs must be distinct from internal admin DTOs so purchase price, landed cost, supplier data, internal notes, and profit never leak to public APIs.

## Key Decisions

- Angular uses standalone components, lazy feature routes, Angular signals for local UI state, RxJS for HTTP workflows, Angular Material, and SCSS.
- Express controllers stay thin. Validation, domain rules, persistence, and provider integrations live outside route declarations.
- MongoDB stores normalized business records with references where financial or inventory history must remain immutable.
- Financial values are represented in paise as integers at API boundaries. Future accounting logic should use a decimal library for tax and allocation calculations.
- API responses use a consistent `{ success, data, meta }` or `{ success, error }` shape.
- Integrations use provider abstractions for file storage, email, WhatsApp, PDF invoices, and accounting exports.
- Authentication starts with JWT access tokens and will be extended with refresh-token rotation, revocation, password reset, and optional 2FA.

## Runtime Targets

- Production target: current supported Node.js LTS, documented as Node 24 LTS for deployment planning.
- Local scaffold compatibility: Node `20.19.5` is currently installed in this workspace, so package engines allow `>=20.19.0`.
- API: Express, Mongoose, Zod, Helmet, CORS allowlist, rate limiting, request IDs, centralized error handling.
- Database: MongoDB Atlas in production; local Docker MongoDB for development.

## API Boundaries

All routes are versioned under `/api/v1`.

Initial foundation routes:

- `GET /api/v1/health`
- `GET /api/v1/ready`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/settings/business`

Planned route groups:

- `/auth`, `/users`, `/roles`
- `/products`, `/product-variants`, `/categories`
- `/inventory`, `/stock-transactions`
- `/suppliers`, `/purchases`
- `/customers`, `/orders`, `/invoices`, `/payments`
- `/shipments`, `/returns`, `/expenses`
- `/reports`, `/accounting-exports`, `/communications`
- `/settings`, `/audit-logs`

## Security Posture

- Secrets are loaded from environment variables and never committed.
- Passwords are hashed with a secure algorithm before storage.
- Access tokens are not logged.
- Refresh tokens will be stored as hashed, revocable records.
- Backend permission checks are mandatory. Frontend permissions are only a user experience layer.
- Audit logs are immutable business records and must not be edited by normal admins.

## Future Customer Portal

The customer portal should consume public APIs and public DTOs only. Admin-only product fields, supplier details, costing, profit, internal inventory locations, and internal notes must remain isolated in admin services and admin DTOs.
