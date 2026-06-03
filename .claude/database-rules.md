# Database Rules

## Philosophy

Database is a business asset.

Code can be rewritten.
Database mistakes are expensive.

Prioritize:

1. Data integrity
2. Consistency
3. Auditability
4. Performance

Never optimize prematurely.

---

# Database Engine

Primary Database:

PostgreSQL

Do not introduce additional databases unless justified.

Avoid polyglot persistence.

---

# ORM

Use:

- Drizzle ORM

Never:

- Raw SQL in application code
- String concatenation queries

Allowed:

- Drizzle Query Builder
- Prepared Statements

---

# Naming Conventions

Tables:

snake_case plural

Examples:

users
tickets
ticket_comments

Columns:

snake_case

Examples:

created_at
updated_at
assigned_user_id

Primary Key:

id

Foreign Key:

entity_id

Examples:

user_id
ticket_id
role_id

---

# Primary Keys

Use:

UUID v7

Never use:

- auto increment integer
- random UUID v4

Reason:

- better indexing
- better distributed scalability

Example:

id UUID PRIMARY KEY

---

# Audit Columns

Every business table must contain:

created_at
updated_at

Example:

created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL

---

# Soft Delete

Never physically delete business data.

Use:

deleted_at TIMESTAMP NULL

Examples:

tickets
users
comments

Allowed hard delete:

- cache tables
- temporary tables

---

# Foreign Keys

Always define foreign key constraints.

Never rely on application logic.

Example:

ticket.user_id
references users.id

---

# Constraints

Always use database constraints.

Examples:

NOT NULL

UNIQUE

CHECK

Foreign Keys

Never rely solely on frontend validation.

---

# Transactions

Required when:

- multiple table updates
- financial operations
- workflow transitions

Example:

create ticket
create audit log
create notification

must be atomic

---

# Migrations

All schema changes must be migration driven.

Never:

- edit production database manually

Every migration must be:

- reversible
- reviewed
- tested

---

# Indexing

Required:

Primary Keys

Foreign Keys

Frequently filtered columns

Examples:

status
email
ticket_number

Never create indexes without evidence.

Review indexes quarterly.

---

# Query Rules

Never use:

SELECT \*

Always specify columns.

Bad:

SELECT \* FROM users

Good:

SELECT id, name, email FROM users

---

# Pagination

Always paginate list endpoints.

Never return unlimited rows.

Default:

20 items

Maximum:

100 items

---

# N+1 Queries

Must be avoided.

Review:

- ORM relations
- nested loops
- repeated queries

Use:

- joins
- batching

---

# Repository Pattern

Database access only inside repositories.

Forbidden:

Route -> Database

Allowed:

Route
→ Service
→ Repository
→ Database

---

# Database Responsibilities

Database owns:

- integrity
- constraints
- relationships

Application owns:

- business logic
- workflows

Never mix responsibilities.

---

# Enums

Prefer PostgreSQL enums.

Examples:

ticket_status

OPEN
IN_PROGRESS
PENDING
RESOLVED
CLOSED

Avoid magic strings.

---

# File Storage

Never store files inside database.

Store:

- metadata only

Example:

file_name
file_url
file_size

Actual file:

- S3
- MinIO

---

# Audit Logs

Critical operations must create audit logs.

Examples:

Ticket Created

Ticket Assigned

Role Changed

User Deleted

Permission Updated

Audit logs are immutable.

Never update audit logs.

---

# Performance Rules

Target:

P95 query < 100ms

Review:

- slow queries
- missing indexes
- table scans

Use EXPLAIN ANALYZE for optimization.

---

# Backup Rules

Production:

Daily backup

Retention:

30 days minimum

Backup restoration test:

Monthly

Unverified backup = no backup.

---

# Database Review Checklist

Before Merge:

- Migration exists
- Index reviewed
- Foreign keys defined
- Constraints defined
- Audit logs considered
- Soft delete considered
- Transaction considered
- Query performance reviewed
