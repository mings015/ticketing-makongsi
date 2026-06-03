# Coding Standards

## General Principles

Always prefer:

1. Readability
2. Maintainability
3. Simplicity
4. Performance

Never sacrifice readability for clever code.

---

# SOLID

All business logic must follow SOLID principles.

---

# DRY

Avoid duplication.

Extract reusable code.

---

# KISS

Keep solutions simple.

Avoid over engineering.

---

# TypeScript

Never use:

- any
- unknown as escape hatch

Always define proper types.

Bad:

const data: any

Good:

const data: Ticket

---

# Functions

Maximum:

- 50 lines

Prefer:

- 20-30 lines

One responsibility only.

---

# Components

Svelte Components:

Maximum:

300 lines

If larger:

Split component.

---

# API Route

Route handlers must be thin.

Bad:

route -> business logic

Good:

route -> service -> repository

---

# Services

Services contain:

- business logic
- validation
- workflow

Services must not contain SQL.

---

# Repository

Repository contains:

- database queries

Repository must not contain business logic.

---

# Validation

All input validation must use Zod.

Never trust frontend data.

---

# Error Handling

Never:

throw new Error("something")

Use domain errors.

Example:

TicketNotFoundError
UnauthorizedError

---

# Logging

Use structured logging.

Never console.log in production.

---

# Testing

Required:

- unit test
- integration test

Coverage target:

80%

---

# Naming

Files:

ticket.service.ts
ticket.repository.ts

Variables:

camelCase

Types:

PascalCase

Constants:

UPPER_CASE

---

# Security

Never:

- raw SQL
- string concatenation query

Always:

- parameterized query
- ORM query builder

---

# Pull Request Checklist

Before merge:

- Typecheck pass
- Lint pass
- Test pass
- No any
- No TODO
- No console.log
