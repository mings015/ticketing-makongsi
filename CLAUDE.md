# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Pre-Implementation Checklist

Before implementing any feature, read these files in `.claude/`:

1. `vision.md` — product goals
2. `architecture.md` — system design
3. `coding-standards.md` — code style
4. `database-rules.md` — DB constraints
5. `security-rules.md` — security requirements

For every code change, explicitly address: security implications, database implications, performance risks, and edge cases.

Reject implementations that: use `any` types, mix business logic with infrastructure, bypass validation, or violate `database-rules.md` / `security-rules.md`.

## Tech Stack

**Backend**: ElysiaJS + TypeScript + Drizzle ORM + PostgreSQL  
**Frontend**: SvelteKit (Svelte 5 Runes) + TypeScript  
**Auth**: JWT (short-lived access token) + Argon2id password hashing  
**Validation**: Zod + Elysia schema

## Architecture

### Backend Layer Order

```
Route → Controller → Service → Repository → Database
```

- Routes only handle HTTP: no business logic, no DB access
- Services own business logic and workflow
- Repositories are the only layer that touches the database

### Frontend Patterns

- Prefer `+page.server.ts` / `+layout.server.ts` over client-side fetches
- Use Form Actions and Server Load Functions
- State: URL state first, then server state, then TanStack Query
- Progressive enhancement — works without JS

## Database Rules (critical)

- **ORM**: Drizzle only — no raw SQL, no string-concatenated queries
- **Primary keys**: UUID v7 (never auto-increment or UUID v4)
- **Soft deletes**: `deleted_at TIMESTAMP NULL` on all business tables; never `DELETE`
- **Audit columns**: every business table needs `created_at`, `updated_at`
- **Transactions**: required for any multi-table write (e.g., create ticket + audit log + notification)
- **Queries**: never `SELECT *` — always specify columns; always paginate lists (default 20, max 100)
- **Schema changes**: migration files only — never edit the DB manually
- **Foreign keys**: always defined as DB constraints, not just application logic

## Security Rules (critical)

- **Authorization**: every endpoint must verify identity AND permissions (RBAC); never trust frontend role checks
- **Input validation**: validate body, params, query, and headers on every endpoint using Elysia schema or Zod
- **Output validation**: type all API responses to prevent data leakage
- **Rate limiting**: required on auth routes (login, forgot-password) — 5 req/min default
- **Error responses**: never expose stack traces, SQL errors, or internal architecture details
- **CORS**: explicit domain whitelist only — no `*` in production
- **Audit logs**: immutable; required for auth, role changes, permission changes, ticket assignment, user management

## Commands

> Commands will be defined once the project is initialized. Expected setup:

```bash
bun install          # install dependencies
bun dev              # start dev servers
bun build            # production build
bun test             # run test suite
bun run db:migrate   # run pending migrations
bun audit            # dependency security audit
```
