# 13 — SaaS Commercialization, Billing & Payments

This document captures how Waailo becomes a **sellable, multi-tenant SaaS product** — the
productization work still outstanding, the subscription/billing architecture, and the payment
strategy for collecting money from Indian and international customers. It is a planning doc:
nothing here is built yet. It exists so we can pick this up later without re-deciding.

> Disclaimer: payment fees, RBI/FEMA rules, GST treatment, and provider capabilities change
> over time and vary by business category. Confirm current rates and tax treatment with the
> provider and a CA (chartered accountant) who handles SaaS exporters before going live.

---

## 13.1 Where Waailo stands today

Waailo is **architecturally SaaS already**, but **not yet a commercial SaaS**.

Already in place:

- **Multi-tenant** — every record is isolated by `companyId`, so many companies share one
  deployment with separated data.
- **Cloud-deployable** — Vercel (frontend) + Render (backend) + Neon (Postgres).
- **Self-serve signup + RBAC** — a company can create an account; OWNER / HR_ADMIN / MANAGER /
  EMPLOYEE roles.
- **Real modules** — Auth, Employees, Documents, Attendance (with team muster roll), Leaves,
  Holidays, Payroll, Recruitment, Performance.

Missing before we can charge customers (the work this doc plans):

1. **Billing / subscriptions** — plans, per-seat pricing, recurring collection. *(The #1 gap
   that turns "an app" into "a SaaS business".)*
2. **Plan enforcement (gating)** — seat limits and feature flags per plan.
3. **Production hardening** — rate limiting, DB-level row-level security (RLS), pagination,
   caching, real object storage (S3), real email/WhatsApp providers (today stubbed).
4. **Commercial surface** — public pricing page, billing settings, customer billing portal.
5. **Reliability** — backups, monitoring, error tracking, audit logs.

---

## 13.2 Business model (what we are copying)

The model is **per-seat recurring subscriptions** — e.g. "₹X per employee per month", billed
monthly or annually. This is exactly how Zoho People and most HRMS products price.

Reference point — **how Zoho makes money** (FY25, year ended Mar 2025): ~₹12,313 crore
operating revenue (~$1.5B, +18% YoY), of which the app suite was ~57%. The model is almost
entirely **subscription SaaS** (plus perpetual/term licences for on-prem ManageEngine).
Notably **bootstrapped** — no ads, no selling user data, no VC. The mechanics of *collection*:
card/UPI-mandate on file → auto-charged each cycle → settled to a regional bank account in
local currency → tax handled per country. We replicate this collection loop below.

---

## 13.3 Payment strategy — decision

**Decision: launch India-first with Razorpay Subscriptions only. Add a Merchant of Record
(Paddle / Dodo Payments) later, when real foreign customers appear.**

Rationale (cheaper, more trusted, more useful for an India-first HRMS for SMBs):

| Criterion | Razorpay (India) | Merchant of Record (Paddle/Dodo) |
|-----------|------------------|----------------------------------|
| **Cost** | ~2–3% per txn (+18% GST on fee) | ~5% + $0.50 per txn — roughly double |
| **Trust (our buyers)** | High — Indian SMBs know it; familiar UPI/PhonePe/GPay checkout; INR + GST invoice | Lower for Indian buyers — foreign-looking USD checkout |
| **Recurring billing** | Native **Subscriptions** product (plans, UPI Autopay / card e-mandate, dunning, webhooks) | Native subscriptions too |
| **Foreign tax / FEMA** | **We** handle VAT/GST abroad + FIRA paperwork (not an MoR) | **They** handle all foreign tax + compliance (the MoR value) |
| **Best when** | Selling to Indian customers | Selling to customers outside India |

So: **Razorpay for Indian customers; a Merchant of Record for everyone outside India.** The
checkout flow routes to one or the other based on the customer's country. Don't pay the MoR's
~5% premium before there are foreign customers to justify it.

Notes:
- **Stripe** is invite-only in India since 2024, so it isn't the default starting point.
- **UPI Autopay limit (2026):** auto-debits up to ~₹15,000–25,000 per charge go through
  without extra authentication; above that the customer re-authenticates each cycle. Per-seat
  HRMS pricing is usually well within the auto limit, so renewals are silent.

---

## 13.4 Billing architecture

Fits the existing NestJS + Prisma + tenant-by-`companyId` design. Five pieces.

### 13.4.1 Data model (new Prisma tables)

- **`Plan`** — `name`, `priceMinor` (paise), `interval` (MONTH/YEAR), `seatLimit`,
  `features` (JSON flags, e.g. payroll/recruitment on/off), `providerPlanId`.
- **`Subscription`** — one per company: `companyId`, `planId`, `status`
  (TRIALING/ACTIVE/PAST_DUE/CANCELLED), `currentPeriodEnd`, `seats`, and provider IDs
  (`providerCustomerId`, `providerSubscriptionId`).
- **`Invoice`** *(optional)* — billing history: `companyId`, `amountMinor`, `status`,
  `issuedAt`, `providerInvoiceId`, `firaRef` (for foreign remittances).

`Subscription` hangs off the company, matching the existing tenant isolation.

### 13.4.2 Backend `BillingModule`

- `POST /billing/checkout` — creates a provider checkout/subscription session, returns a URL
  to redirect the user to. Never touches raw card data.
- `POST /billing/webhook` — **the source of truth.** Provider calls this on payment
  success/failure, renewal, and cancellation; handler updates the `Subscription` row. Must be
  **signature-verified and idempotent** (same event may arrive twice).
- `GET /billing/portal` — returns a link to the provider-hosted customer portal (manage card,
  cancel, see invoices).
- `GET /billing/subscription` — current plan + status for the company's settings page.

### 13.4.3 Plan enforcement (gating)

A NestJS guard/interceptor checks the company's subscription before side-effectful actions:

- Block adding an employee when `activeEmployees >= plan.seatLimit`.
- Hide/deny modules the plan doesn't include (feature flags).
- Report seat count to the provider so **per-seat billing scales with headcount**.

### 13.4.4 Frontend

- Public **pricing page**.
- **Upgrade** button → calls `/billing/checkout` → redirects to provider.
- **Billing** section in settings → current plan + "Manage billing" → provider portal.

### 13.4.5 End-to-end flow

```
User clicks Upgrade
  → backend creates provider checkout session
  → user authorizes payment / mandate on provider's hosted page (UPI Autopay / card e-mandate)
  → provider fires webhook → backend marks Subscription ACTIVE (idempotent, signature-verified)
  → gating guard now permits paid features
  → each cycle: provider auto-charges the mandate → webhook keeps status current
  → failed charge → provider dunning retries → webhook → may move to PAST_DUE
```

The **webhook handler is the critical, highest-risk piece** — it must be idempotent and
signature-verified, because it is the only trustworthy signal that money actually moved.
Everything else is straightforward CRUD.

> Operational guardrail (per project safety rules): we wire the code and data model, but the
> actual provider account, API keys, and any live payment confirmation must be set up and
> triggered by the user — we do not enter payment credentials or move money.

---

## 13.5 Productization checklist (beyond billing)

Order of attack once billing exists:

1. **Security hardening** — DB row-level security (tenant backstop), rate limiting, audit logs.
2. **Real infra adapters** — S3 object storage for documents/payslips; real email + WhatsApp
   providers replacing the stubbed log providers.
3. **Scale** — pagination everywhere, fix N+1 queries, caching for hot reads.
4. **Onboarding** — company setup wizard; per-plan usage limits surfaced in the UI.
5. **Reliability** — automated DB backups, monitoring, error tracking (e.g. Sentry).

---

## 13.6 Suggested build sequence (commercialization)

1. Razorpay Subscriptions integration (India) — `Plan`/`Subscription` model, checkout,
   webhook, customer portal link.
2. Plan-gating guard (seat limit + feature flags) + pricing page + billing settings.
3. Security hardening (RLS, rate limiting, audit logs).
4. Real S3 + email/WhatsApp providers.
5. Merchant-of-Record integration (Paddle/Dodo) — only when foreign demand is real.

---

## 13.7 References

- Razorpay Subscriptions — https://razorpay.com/subscriptions/
- Razorpay UPI Autopay — https://razorpay.com/upi-autopay/
- Indian SaaS international payments (Stripe Atlas / Paddle / Razorpay / FIRC) —
  https://niryatbox.com/blog/india-saas-international-payments-stripe-atlas-paddle-razorpay-guide
- Paddle (Merchant of Record) for Indian SaaS — https://productgrowth.in/tools/payments/paddle/
