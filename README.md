# Waailo HR

https://waailo.vercel.app/

Cloud, multi-tenant HRMS for small and mid-sized businesses. This repository contains the
design documentation and the Phase 1 (Core HR) implementation.

```
waailo/
├── docs/          # HLD + LLD: architecture, domain model, DB schema, API, security, roadmap
├── backend/       # NestJS + Prisma + PostgreSQL API (Auth, Company, Employees, Documents)
├── frontend/      # Next.js + React + Tailwind web app
└── docker-compose.yml   # Postgres + Redis + backend + frontend for local dev
```

The backend and frontend are **independent, separately deployable projects** (each has its
own `package.json` and `Dockerfile`). They communicate only over HTTP, so you can deploy the
backend to Render/Railway/AWS and the frontend to Vercel without coupling.

## What's built

**Phase 1 — Core HR**

- **Auth** — login, JWT access + rotated refresh tokens, invites, password reset, RBAC.
- **Company** — tenant signup, settings, departments / designations / locations.
- **Employees** — records, invite/onboard, salary structures, lifecycle state machine.
- **Documents** — presigned upload/download, access control, soft delete.

**Phase 2 — Time, Leave & Notifications**

- **Attendance** — check-in/out, worked-hours calculation, regularisation requests +
  manager approval, monthly summary feeding payroll.
- **Holidays** — company/location holiday calendars per year, with location→company
  fallback resolution consumed by Leaves.
- **Leaves** — leave types & policies, balances (entitled/used/pending/available),
  apply → approve/reject → cancel with balance reservation, working-day calc (excludes
  weekly-offs + holidays), overlap detection, team calendar.
- **Notifications** — templated email/WhatsApp delivery driven by domain events
  (employee invited, leave requested/decided, regularisation decided). Runs in-process
  via an event bus (no Redis required for local dev); the seam swaps to BullMQ/Redis in
  production.

**Phase 3 — Payroll**

- **Salary structures** — per-employee annual CTC + basic, versioned (one active at a time).
- **Payroll runs** — create per month, process (idempotent), `DRAFT → COMPLETED → PAID`.
- **Statutory deductions** — EPF, ESI, Professional Tax computed from versioned rate tables
  (no hard-coded rates). Payslips with itemised earnings/deductions and net pay.
- HR run-management UI + employee "my payslips" view. See
  [`docs/10-payroll-how-it-works.md`](./docs/10-payroll-how-it-works.md).

**Frontend** — login/signup, protected dashboard, and pages for employees (with detail +
salary), attendance, leaves, payroll, holidays, company setup and documents — wired to the
API with a typed client (auto token-refresh on 401).

See [`docs/09-roadmap.md`](./docs/09-roadmap.md) for what comes next (recruitment,
performance management, AI assistant, mobile; plus payroll polish: TDS, attendance-based
loss-of-pay, payslip PDFs).

## Run the whole stack with Docker

```bash
# from the repo root
docker compose up --build
```

- Frontend → http://localhost:3000
- Backend API + Swagger → http://localhost:3001/api/v1/docs
- PostgreSQL → localhost:5432, Redis → localhost:6379

Seed reference data + a demo company once the stack is up (run on the host inside `backend/`
after `npm install`, pointing at the same DB):

```bash
cd backend && npm run seed
```

Demo login: company slug `demo-co`, email `owner@demo.co`, password `Password123!`.

## Run for development (hot reload)

Start only the datastores with Docker, then run each app on the host:

```bash
docker compose up -d postgres redis

# Terminal 1 — backend
cd backend
cp .env.example .env
npm install
npm run prisma:migrate
npm run seed
npm run start:dev          # http://localhost:3001

# Terminal 2 — frontend
cd frontend
cp .env.example .env.local
npm install
npm run dev                # http://localhost:3000
```

> Note: if a partial `backend/node_modules` exists from an earlier environment, delete it
> first (`rm -rf backend/node_modules`) before `npm install`.

## How they connect

The frontend reads `NEXT_PUBLIC_API_URL` (default `http://localhost:3001/api/v1`). The typed
API client (`frontend/src/lib/api`) attaches the JWT, transparently refreshes it once on a
401, and converts the backend's error envelope into a typed `ApiError`. Tenant scoping is
enforced entirely on the backend from the JWT — the frontend never sends a `companyId`.

## Deployment split

| Part | Suggested host | Notes |
|------|----------------|-------|
| Frontend | Vercel | Set `NEXT_PUBLIC_API_URL` to the deployed API URL at build time |
| Backend | Render / Railway / AWS | Set DB, Redis, JWT secrets, `CORS_ORIGIN` to the frontend URL |
| PostgreSQL | Managed (RDS / Neon / Railway) | Run `prisma migrate deploy` in the release step |
| Redis | Managed | Used from Phase 2 (queues/cache) |

## Tests

- Backend: `cd backend && npm test` (unit tests: lifecycle, RBAC, password, utils).
- Frontend: `cd frontend && npm test` (API client: auth header, refresh-on-401, error parsing).
