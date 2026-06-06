# Waailo HR — Backend (Phase 1: Core HR)

NestJS + Prisma + PostgreSQL API implementing the Phase 1 modules from the design docs:
**Auth**, **Company**, **Employees**, and **Documents**. See `../docs/` for the full HLD/LLD.

## Stack

- **NestJS 10** (TypeScript) — modular monolith, clean layering (controller → service → repository)
- **Prisma 5** — schema, migrations, type-safe data access (PostgreSQL)
- **JWT access + rotated refresh tokens** — global auth guard, role-based access control
- **class-validator / class-transformer** — DTO validation; **Swagger** auto-docs
- **Jest** — unit tests

## Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL/Redis) — or a reachable PostgreSQL instance

## Quick start

```bash
# 1. Start Postgres + Redis (from the repo root)
docker compose up -d

# 2. Configure environment
cd backend
cp .env.example .env          # adjust secrets as needed

# 3. Install dependencies
npm install

# 4. Apply the schema and seed reference data + a demo company
npm run prisma:migrate        # creates the database schema
npm run seed                  # roles, statutory rates, templates, demo-co

# 5. Run the API (dev, hot reload)
npm run start:dev
```

The API is served at `http://localhost:3001/api/v1`, with interactive Swagger docs at
`http://localhost:3001/api/v1/docs`.

Demo login after seeding: company slug `demo-co`, email `owner@demo.co`, password
`Password123!`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run start:dev` | Run with hot reload |
| `npm run build` | Compile to `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (zero warnings allowed) |
| `npm test` | Run unit tests |
| `npm run test:cov` | Tests with coverage |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run prisma:deploy` | Apply migrations (CI/prod) |
| `npm run prisma:validate` | Validate the Prisma schema |
| `npm run seed` | Seed reference data + demo company |

## Project structure

```
src/
  common/              # cross-cutting: config, prisma, auth guards, errors, dto, utils
    auth/              # JwtAuthGuard, RolesGuard, decorators (@Roles, @Public, @CurrentUser)
    config/            # env validation (zod) + typed AppConfigService
    errors/            # AppException hierarchy
    filters/           # GlobalExceptionFilter (consistent error envelope)
    prisma/            # PrismaService / PrismaModule
  modules/
    auth/              # login, refresh rotation, invites, password reset, RBAC
    company/           # tenant signup, settings, departments/designations/locations
    employees/         # records, salary structures, lifecycle state machine
    documents/         # presigned upload/download, access control, storage port
  health/              # /health, /ready probes
  main.ts              # bootstrap: prefix, CORS, validation pipe, Swagger
prisma/
  schema.prisma        # full data model (all modules)
  seed.ts              # idempotent reference + demo seed
test/unit/             # pure-logic unit tests
```

## Key design points

- **Multi-tenancy**: `companyId` is taken only from the verified JWT and applied in every
  repository query. Never trust a companyId from the URL/body. (docs/07 §7.3)
- **Auth**: short-lived JWT access tokens + opaque refresh tokens stored hashed and rotated
  on use, with reuse detection. (docs/05 §5.1, docs/07 §7.1)
- **Errors**: every error becomes the `{ error: { code, message, details, requestId } }`
  envelope from docs/06 §6.3, with stable machine-readable codes.
- **Layering**: controllers are thin; business rules live in services; Prisma is only
  touched in repositories.

## Phase 2 (implemented)

- **Attendance** — `/attendance` check-in/out, regularisation requests + approval, monthly
  summary.
- **Holidays** — `/holiday-calendars` calendars + holidays, location→company fallback.
- **Leaves** — `/leave-types`, `/leave-policies`, `/leave-balances`, `/leave-requests`
  (apply/approve/reject/cancel) with balance reservation and working-day calc.
- **Notifications** — templated email/WhatsApp driven by domain events.

> Phase 2 added **no new tables** — the Prisma schema already contained these models, so the
> Phase 1 migration created them. No extra migration is needed.

> **Notifications & queues:** for zero-dependency local dev, domain events run through an
> in-process `DomainEventBus` (`src/common/events`) and stub log providers — **Redis is not
> required**. In production this seam is swapped for BullMQ/Redis (see `../docs/08`), keeping
> the publisher API unchanged.

## What's next (Phase 3)

Payroll: runs, statutory calculations (EPF/ESI/PT/TDS), payslip PDFs — see
`../docs/09-roadmap.md`.
