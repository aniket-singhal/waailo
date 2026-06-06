# Waailo HR — Design & Architecture Documentation

Waailo HR is a cloud, multi-tenant Human Resource Management System (HRMS) for small and
mid-sized businesses (SMBs). It covers the full employee lifecycle: employee records,
attendance, leave management, holidays, simple payroll, document storage, notifications
(WhatsApp/email), dashboards and an employee self-service portal. Future phases add
recruitment, performance management, an AI assistant and a mobile app.

This `docs/` folder is the single source of truth for the **high-level design (HLD)** and
**low-level design (LLD)** of the system. It is written before any application code so that
module boundaries, the data model, and the cross-cutting concerns (security, multi-tenancy,
compliance) are agreed up front.

## How to read these documents

The documents are ordered so that each one builds on the previous. Read them top to bottom
for a full picture, or jump to the one relevant to your task.

| # | Document | What it answers |
|---|----------|-----------------|
| 01 | [Product Overview](./01-product-overview.md) | What we are building, for whom, scope, glossary |
| 02 | [High-Level Architecture](./02-high-level-architecture.md) | System context, containers, tech stack, deployment |
| 03 | [Domain Model & Module Boundaries](./03-domain-model.md) | DDD bounded contexts, aggregates, context map |
| 04 | [Database Schema](./04-database-schema.md) | PostgreSQL tables, ERD, indexes, Prisma schema |
| 05 | [Low-Level Module Designs](./05-lld-modules.md) | Class & sequence diagrams per module |
| 06 | [API Design](./06-api-design.md) | REST conventions, endpoint catalog, error model |
| 07 | [Security & Compliance](./07-security-compliance.md) | AuthN/Z, tenancy isolation, GDPR, EPF/ESI/TDS |
| 08 | [Non-Functional Requirements](./08-nfr-observability.md) | Performance, caching, queues, observability |
| 09 | [Roadmap](./09-roadmap.md) | Phased delivery plan and future modules |

## Diagram conventions

All diagrams are written in [Mermaid](https://mermaid.js.org/) and embedded directly in the
Markdown using fenced code blocks. They render on GitHub, in VS Code (with the Mermaid
extension), and in most documentation viewers. Diagram types used:

- **C4-style context / container** — system landscape and deployable units.
- **`erDiagram`** — the relational data model.
- **`classDiagram`** — service, entity and DTO structure for each module (LLD).
- **`sequenceDiagram`** — runtime collaboration for the key flows of each module.
- **`flowchart`** — process and decision flows (e.g. payroll run, leave approval).

## Architectural principles (applied throughout)

1. **Domain-Driven Design** — the system is partitioned into bounded contexts that map 1:1
   to backend NestJS modules. The ubiquitous language in document 03 is used consistently
   in code, the database, and the API.
2. **SOLID & clean architecture** — thin controllers, business logic in services, data
   access behind repositories, dependencies injected. No framework types leak into the
   domain layer.
3. **Multi-tenancy first** — every tenant-owned row carries a `company_id`; isolation is
   enforced at the query layer and verified in tests. See documents 02 and 07.
4. **Security & privacy by design** — JWT + refresh tokens, role-based access control,
   audit trail, encryption of sensitive fields, GDPR data-subject rights.
5. **TypeScript end-to-end** — shared types between the NestJS backend and the Next.js
   frontend reduce drift between layers.

## Document status

| Field | Value |
|-------|-------|
| Version | 0.1 (initial design baseline) |
| Status | Draft for review |
| Last updated | 2026-06-05 |
| Owner | Engineering |

> These are living documents. When an architectural decision changes, update the relevant
> document and note it in document 09's changelog so the design and the code stay in sync.
