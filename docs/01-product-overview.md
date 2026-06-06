# 01 — Product Overview

## 1.1 Vision

Waailo HR gives small and mid-sized businesses (typically 10–500 employees) a single,
affordable, cloud-hosted system to run the operational side of HR without spreadsheets or
several disconnected tools. The product is opinionated and simple by default, but built on
a domain model rich enough to grow into recruitment, performance and AI-assisted workflows
without re-platforming.

The guiding product principle is **"correct, compliant, and quick to operate"**: a small
HR team (often one or two people, sometimes a founder) should be able to run monthly
payroll, approve leave, and answer employee questions in minutes, with the system handling
statutory calculations and reminders.

## 1.2 Target users & personas

| Persona | Role | Primary jobs-to-be-done |
|---------|------|--------------------------|
| **Priya — HR Admin** | Owns HR operations for the company | Onboard/offboard employees, configure leave policies and holidays, run payroll, generate payslips, respond to requests |
| **Raj — Company Owner / Admin** | Founder or director | Set up the company, manage billing, see headcount and cost dashboards, grant access to others |
| **Sara — Manager** | Team lead | Approve/reject leave for their reports, view team attendance, see who is in/out today |
| **Arjun — Employee** | Individual contributor | Mark attendance, apply for leave, view payslips, download documents, update personal details |
| **(Future) Recruiter** | Talent acquisition | Manage job openings, candidates and interviews |

## 1.3 Scope

### In scope (v1)

The first release ("v1") delivers the operational HR core for a single country (India) with
a data model that does not preclude other geographies later.

- **Authentication & access** — email/password login, JWT access + refresh tokens,
  role-based access control (RBAC), password reset, invite-based onboarding.
- **Company & org structure** — company (tenant) settings, departments, designations,
  locations, and the org hierarchy (manager relationships).
- **Employee records** — full profile, employment details, compensation, bank details,
  statutory IDs (PAN, Aadhaar reference, UAN, ESI), lifecycle states (invited → active →
  on-notice → exited).
- **Attendance** — daily check-in/check-out, work-from-home/on-site, regularisation
  requests, monthly attendance summary feeding payroll.
- **Leave management** — configurable leave types and policies, accrual, balances,
  application → approval workflow, calendar view.
- **Holidays** — company/location-specific holiday calendars per year.
- **Simple payroll** — monthly payroll runs, earnings/deductions, statutory components
  (EPF, ESI, professional tax, TDS at a basic level), payslip generation (PDF).
- **Documents** — upload/store employee and company documents with access control and
  expiry reminders (e.g. ID proofs, contracts, certifications).
- **Notifications** — transactional WhatsApp and email messages (leave decisions, payslip
  ready, document expiry, birthdays/anniversaries) delivered via background queues.
- **Dashboards & self-service portal** — admin dashboard (headcount, attendance, leave,
  payroll cost) and an employee self-service portal.

### Out of scope (v1), planned for later

Recruitment / applicant tracking, performance management & reviews, AI assistant, native
mobile apps, multi-currency payroll, biometric/hardware attendance integrations, and
advanced analytics. These are sequenced in [document 09](./09-roadmap.md).

### Explicit non-goals

Waailo HR is **not** an accounting/ERP system, not a full-suite global payroll engine for
many countries at launch, and not a learning-management or benefits-marketplace platform.

## 1.4 Modules (bounded contexts)

The system is divided into nine modules. Each is a backend NestJS module and a bounded
context in the domain model (see [document 03](./03-domain-model.md)).

| Module | Responsibility |
|--------|----------------|
| **Auth** | Identity, sessions, tokens, RBAC, password lifecycle |
| **Company** | Tenant, departments, designations, locations, settings |
| **Employees** | Employee profiles, employment & compensation, lifecycle |
| **Attendance** | Daily attendance, regularisation, monthly summaries |
| **Leaves** | Leave types, policies, balances, applications, approvals |
| **Holidays** | Holiday calendars per company/location/year |
| **Payroll** | Payroll runs, payslips, statutory calculations |
| **Notifications** | Templated WhatsApp/email delivery via queues |
| **Documents** | Document storage, access control, expiry reminders |

## 1.5 Key product flows

The four flows below are the spine of the product; their LLD sequence diagrams are in
[document 05](./05-lld-modules.md).

1. **Onboarding** — Admin invites an employee → employee accepts and completes profile →
   employee becomes active and appears in attendance, leave and payroll.
2. **Attendance** — Employee checks in/out daily; gaps or errors are fixed through
   regularisation requests approved by a manager.
3. **Leave request** — Employee applies → balance validated → manager approves/rejects →
   balance updated → both parties notified → leave reflected on the calendar.
4. **Payroll viewing** — Admin runs payroll for a period → system computes earnings,
   deductions and statutory components → payslips generated → employees notified and can
   download their payslip.

## 1.6 Success metrics (product-level)

- Time to run monthly payroll for a 100-person company: **under 15 minutes**.
- Leave request to decision median time: **under 1 business day** (system removes friction).
- Self-service adoption: **> 70%** of employees mark attendance / apply leave themselves.
- Payslip and statutory-calculation accuracy: **100%** against a verified reference set.

## 1.7 Glossary (ubiquitous language)

This vocabulary is used identically in the domain model, database, API and UI.

| Term | Meaning |
|------|---------|
| **Company / Tenant** | An isolated customer organisation. The unit of multi-tenancy. |
| **User** | A login identity. May be linked to an Employee. Has one or more Roles. |
| **Employee** | A person employed by a Company; the subject of HR records. |
| **Department** | An organisational grouping within a Company. |
| **Designation** | A job title / role label (distinct from access Role). |
| **Role** | An access-control role (e.g. OWNER, HR_ADMIN, MANAGER, EMPLOYEE). |
| **Attendance Record** | One day's attendance for one employee. |
| **Regularisation** | A correction request for a wrong/missing attendance record. |
| **Leave Type** | A category of leave (e.g. Casual, Sick, Earned). |
| **Leave Policy** | Rules for a leave type: accrual, caps, carry-forward, eligibility. |
| **Leave Balance** | Remaining entitlement of a leave type for an employee in a period. |
| **Leave Request** | An employee's application for leave, with an approval workflow. |
| **Holiday Calendar** | The set of holidays for a Company/location in a year. |
| **Payroll Run** | A batch computation of pay for all eligible employees in a period. |
| **Payslip** | One employee's pay statement for one payroll run. |
| **Earning / Deduction** | A line item that increases / decreases net pay. |
| **EPF / ESI / PT / TDS** | Indian statutory components (see document 07). |
| **Document** | A stored file attached to a Company or Employee, with access rules. |
| **Notification** | A queued, templated message sent via WhatsApp or email. |
| **Audit Log** | An immutable record of who did what, when, to which entity. |
