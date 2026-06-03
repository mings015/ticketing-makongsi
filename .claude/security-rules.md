# Security Rules

## Security Philosophy

Assume:

- every request is malicious
- every user input is hostile
- every endpoint will be attacked

Trust nothing.

Validate everything.

---

# OWASP

Follow:

OWASP Top 10

Security is mandatory.

Not optional.

---

# Authentication

Use:

JWT Access Token

Optional:

Refresh Token

Rules:

- short-lived access token
- secure secret management

Never:

- store passwords
- expose secrets

---

# Passwords

Hash using:

Argon2id

Alternative:

bcrypt

Never:

- plaintext
- encrypted passwords

Minimum Requirements:

- 8+ chars
- complexity enforced

---

# Authorization

Authentication != Authorization

Every endpoint must verify:

- user identity
- permissions

Use RBAC.

Never trust frontend role checks.

---

# Principle of Least Privilege

Users receive minimum access required.

Example:

Employee

Cannot:

- access admin routes
- access other user tickets

---

# Input Validation

All input must be validated.

Use:

- Zod
- Elysia schema

Validate:

- body
- params
- query
- headers

Never trust client data.

---

# Output Validation

API responses must be typed.

Prevent:

- data leakage
- accidental field exposure

---

# Secrets Management

Store secrets:

Environment Variables

Production:

Secret Manager preferred.

Never:

- hardcode secrets
- commit secrets

Examples:

API keys
JWT secrets
Database passwords

---

# SQL Injection

Prevent using:

- Drizzle ORM
- Parameterized queries

Never:

string concatenation SQL

Forbidden:

SELECT \* FROM users WHERE email = '${email}'

---

# XSS

Escape untrusted content.

Sanitize:

- comments
- descriptions
- rich text

Never render raw HTML.

---

# CSRF

If using cookies:

Enable CSRF protection.

If using Authorization header:

Risk reduced but still review.

---

# Rate Limiting

Required:

Authentication routes

Examples:

login
forgot-password

Default:

5 requests/minute

---

# Brute Force Protection

Required:

- login attempts
- OTP endpoints

Temporary lockout recommended.

---

# File Upload Security

Validate:

- mime type
- file size
- extension

Scan uploads if possible.

Never trust filename.

Rename uploaded files.

---

# Logging

Log:

- login attempts
- permission changes
- critical actions

Never log:

- passwords
- tokens
- secrets

---

# Error Handling

Production errors must not expose:

- stack traces
- SQL errors
- internal architecture

Bad:

SQL Error at line 52

Good:

Internal Server Error

---

# CORS

Whitelist domains.

Never:

Access-Control-Allow-Origin: \*

Production must be explicit.

---

# Security Headers

Required:

Content-Security-Policy

X-Frame-Options

X-Content-Type-Options

Referrer-Policy

Strict-Transport-Security

---

# HTTPS

Production:

HTTPS only

Never allow:

HTTP login

Use HSTS.

---

# Session Security

Cookies:

HttpOnly

Secure

SameSite=Lax or Strict

Never expose tokens to JavaScript when avoidable.

---

# Audit Logs

Required For:

Authentication

Authorization

Role Changes

Permission Changes

Ticket Assignment

User Management

Audit logs must be immutable.

---

# Dependency Security

Before release:

Run:

bun audit

Review:

- vulnerable packages
- abandoned packages

Avoid unnecessary dependencies.

---

# Infrastructure Security

Production Servers:

- firewall enabled
- SSH key authentication
- fail2ban
- automatic security updates

Never expose:

database ports publicly

Example:

5432 closed to public internet

---

# Docker Security

Run containers:

non-root user

Never:

USER root

Use:

read-only filesystem where possible

---

# API Security

Every endpoint must:

- authenticate
- authorize
- validate
- audit

Checklist:

Request
↓
Authentication
↓
Authorization
↓
Validation
↓
Business Logic
↓
Audit Log
↓
Response

---

# Incident Response

If breach suspected:

1. Revoke tokens
2. Rotate secrets
3. Review logs
4. Isolate affected systems
5. Investigate root cause
6. Document findings

---

# Security Review Checklist

Before Merge:

□ No secrets committed

□ No any types bypassing validation

□ Input validation exists

□ Output validation exists

□ Authorization reviewed

□ Audit log reviewed

□ Rate limiting considered

□ Error handling reviewed

□ Security headers enabled

□ Dependency audit passed

□ HTTPS enforced

□ Sensitive data protected

No item may be skipped.
