# Architecture

## Architecture Style

Modular Monolith

Reason:

- Tim kecil
- Deployment mudah
- Development cepat
- Tidak ada distributed complexity

---

## Tech Stack

Frontend

- SvelteKit
- TypeScript
- TailwindCSS
- shadcn ui
- TanStack Query
- Zod

Backend

- ElysiaJS
- TypeScript
- Drizzle ORM
- PostgreSQL

Infrastructure

- Docker
- GitHub Actions
- Nginx

---

## Folder Structure

apps/
├── web/
└── api/

---

# Frontend

apps/web/src/

├── lib/
│ ├── api/
│ ├── components/
│ ├── stores/
│ ├── types/
│ ├── schemas/
│ └── utils/
│
├── routes/
│
├── hooks.server.ts
└── app.html

---

# Backend

apps/api/src/

├── modules/
│
│ ├── auth/
│ ├── users/
│ ├── tickets/
│ ├── comments/
│ ├── categories/
│ ├── notifications/
│ └── reports/
│
├── shared/
│
│ ├── database/
│ ├── middleware/
│ ├── utils/
│ └── constants/
│
└── index.ts

---

## Module Rules

Each module owns:

- controller
- service
- repository
- schema
- tests

No direct cross-module database access.

Communication must happen through services.

---

## Database

PostgreSQL

Main Tables

- users
- roles
- tickets
- comments
- attachments
- notifications
- audit_logs

---

## API Design

REST API

Convention:

GET /tickets
GET /tickets/:id

POST /tickets

PATCH /tickets/:id

DELETE /tickets/:id

---

## Authentication

JWT Access Token

Optional:

- Refresh Token
- Session Table

---

## Authorization

RBAC

Roles:

- super_admin
- admin
- support
- employee

---

## Security

Mandatory:

- Helmet
- Rate Limit
- Input Validation
- SQL Injection Protection
- XSS Protection
- Audit Logs
