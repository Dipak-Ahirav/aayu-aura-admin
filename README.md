# Aayu & Aura Admin Portal

Aayu & Aura is a production-oriented admin portal foundation for an online saree business. The first scope is the admin portal and backend APIs; the backend is designed to support a separate customer portal later.

## Stack

- Angular standalone admin app with Angular Material, SCSS, signals, lazy routes, guards, and interceptors.
- Node.js and Express API with TypeScript.
- MongoDB with Mongoose.
- Zod validation.
- JWT authentication foundation.
- npm workspaces.

## Folder Structure

```text
apps/
  admin-web/
  api/
packages/
  shared-types/
docs/
docker-compose.yml
package.json
```

## Environment

Copy `.env.example` to `.env` and replace secrets before running the API.

Required foundation values:

- `PORT`
- `ADMIN_WEB_URL`
- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `COOKIE_SECRET`

Provider placeholders are included for Cloudinary, S3, SMTP email, WhatsApp Business, and invoice links.

## Local Development

Install dependencies:

```bash
npm install
```

Start MongoDB:

```bash
docker compose up -d
```

Seed a development owner account:

```bash
npm run seed:dev --workspace @aayu-aura/api
```

Default development login:

```text
Email: owner@aayuaura.local
Password: ChangeMe123!
```

Start the API:

```bash
npm run dev:api
```

Start the admin web app:

```bash
npm run dev:web
```

Build all workspaces:

```bash
npm run build
```

Run tests:

```bash
npm run test
```

## Current Foundation

Implemented:

- Monorepo workspace structure.
- Shared API response, user, permission, and product DTO contracts.
- Express app with `/api/v1`, health/readiness endpoints, request IDs, Helmet, CORS, rate limiting, JSON body limits, centralized errors, and MongoDB connection.
- Initial login and current-user auth service.
- Angular login page, guarded admin shell, responsive navigation, dashboard, and settings screen.
- Docker Compose MongoDB.
- Architecture, database model, and implementation plan docs.

## Known Limitations

- The development seed uses a temporary password and should not be used for production.
- Refresh-token rotation is not implemented yet.
- Permission enforcement is scaffolded but not yet applied to all API route groups.
- Dashboard values are sample UI data until reporting APIs are implemented.
- Product, purchase, order, invoice, payment, returns, and Tally modules are planned for later phases.

## Future Customer Portal Plan

Customer APIs must use public DTOs and must never expose purchase price, landed cost, supplier details, profit, internal notes, or internal stock-location data.
