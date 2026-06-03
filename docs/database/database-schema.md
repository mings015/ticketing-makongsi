# Database Schema

## Conventions

- Primary key: `id` UUID v7
- Audit columns: `created_at`, `updated_at` wajib di semua business table
- Soft delete: `deleted_at TIMESTAMP NULL` untuk data bisnis
- Partial unique index untuk kolom unique + soft delete: `UNIQUE WHERE deleted_at IS NULL`
- Foreign key: selalu didefinisikan di DB level
- Enums: pakai PostgreSQL native enum

---

## Enums

```sql
CREATE TYPE ticket_status AS ENUM (
  'open',
  'in_progress',
  'pending',
  'resolved',
  'closed'
);

CREATE TYPE ticket_priority AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

CREATE TYPE notification_type AS ENUM (
  'ticket_created',
  'ticket_assigned',
  'ticket_updated',
  'ticket_resolved',
  'ticket_closed',
  'comment_added'
);
```

---

## Tables

### users

```sql
CREATE TABLE users (
  id                    UUID PRIMARY KEY,
  email                 VARCHAR(255) NOT NULL,
  password_hash         VARCHAR(255) NOT NULL,
  full_name             VARCHAR(255) NOT NULL,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until          TIMESTAMP NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT now(),
  updated_at            TIMESTAMP NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMP NULL
);

-- Email unik hanya untuk user yang belum dihapus
CREATE UNIQUE INDEX users_email_unique ON users (email)
  WHERE deleted_at IS NULL;

CREATE INDEX users_is_active_idx ON users (is_active);
```

---

### roles

```sql
CREATE TABLE roles (
  id          UUID PRIMARY KEY,
  name        VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- Seed data: super_admin, admin, support, employee
```

---

### permissions

```sql
CREATE TABLE permissions (
  id          UUID PRIMARY KEY,
  resource    VARCHAR(100) NOT NULL,
  action      VARCHAR(50) NOT NULL,
  description TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (resource, action)
);
```

Contoh permissions:
```
resource      | action
------------- | ------
tickets       | create
tickets       | read
tickets       | update
tickets       | delete
tickets       | assign
users         | create
users         | read
users         | update
users         | deactivate
roles         | assign
reports       | read
```

---

### role_permissions

```sql
CREATE TABLE role_permissions (
  id            UUID PRIMARY KEY,
  role_id       UUID NOT NULL REFERENCES roles (id),
  permission_id UUID NOT NULL REFERENCES permissions (id),
  created_at    TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (role_id, permission_id)
);

CREATE INDEX role_permissions_role_id_idx ON role_permissions (role_id);
```

---

### user_roles

```sql
CREATE TABLE user_roles (
  id          UUID PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users (id),
  role_id     UUID NOT NULL REFERENCES roles (id),
  assigned_by UUID NOT NULL REFERENCES users (id),
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);

CREATE INDEX user_roles_user_id_idx ON user_roles (user_id);
```

---

### refresh_tokens

```sql
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users (id),
  token_hash  VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hex dari raw token
  expires_at  TIMESTAMP NOT NULL,
  revoked_at  TIMESTAMP NULL,
  ip_address  VARCHAR(45),                 -- support IPv6
  user_agent  TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);
CREATE INDEX refresh_tokens_expires_at_idx ON refresh_tokens (expires_at);
```

Token yang sudah expired dan revoked dapat dibersihkan dengan scheduled job.

---

### categories

```sql
CREATE TABLE categories (
  id          UUID PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMP NULL
);

CREATE UNIQUE INDEX categories_name_unique ON categories (name)
  WHERE deleted_at IS NULL;
```

---

### tickets

```sql
CREATE TABLE tickets (
  id            UUID PRIMARY KEY,
  ticket_number VARCHAR(20) NOT NULL UNIQUE, -- format: TKT-YYYYMM-NNNN
  title         VARCHAR(255) NOT NULL,
  description   TEXT NOT NULL,
  status        ticket_status NOT NULL DEFAULT 'open',
  priority      ticket_priority NOT NULL DEFAULT 'medium',
  category_id   UUID REFERENCES categories (id),
  requester_id  UUID NOT NULL REFERENCES users (id),
  assignee_id   UUID REFERENCES users (id),
  due_at        TIMESTAMP NULL,
  resolved_at   TIMESTAMP NULL,
  closed_at     TIMESTAMP NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMP NULL
);

CREATE INDEX tickets_status_idx ON tickets (status);
CREATE INDEX tickets_requester_id_idx ON tickets (requester_id);
CREATE INDEX tickets_assignee_id_idx ON tickets (assignee_id);
CREATE INDEX tickets_created_at_idx ON tickets (created_at);
CREATE INDEX tickets_ticket_number_idx ON tickets (ticket_number);
```

---

### comments

```sql
CREATE TABLE comments (
  id          UUID PRIMARY KEY,
  ticket_id   UUID NOT NULL REFERENCES tickets (id),
  author_id   UUID NOT NULL REFERENCES users (id),
  body        TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false, -- true = hanya visible untuk support/admin
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMP NULL
);

CREATE INDEX comments_ticket_id_idx ON comments (ticket_id);
```

---

### attachments

```sql
CREATE TABLE attachments (
  id            UUID PRIMARY KEY,
  ticket_id     UUID NOT NULL REFERENCES tickets (id),
  uploaded_by   UUID NOT NULL REFERENCES users (id),
  file_name     VARCHAR(255) NOT NULL,  -- nama original dari user
  stored_name   VARCHAR(255) NOT NULL,  -- nama file yang di-rename (UUID)
  file_url      VARCHAR(1000) NOT NULL, -- URL di S3/MinIO
  file_size     INTEGER NOT NULL,       -- bytes
  mime_type     VARCHAR(100) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX attachments_ticket_id_idx ON attachments (ticket_id);
```

---

### notifications

```sql
CREATE TABLE notifications (
  id        UUID PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES users (id),
  type      notification_type NOT NULL,
  title     VARCHAR(255) NOT NULL,
  body      TEXT NOT NULL,
  ticket_id UUID REFERENCES tickets (id),
  read_at   TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_id_idx ON notifications (user_id);
CREATE INDEX notifications_read_at_idx ON notifications (user_id, read_at)
  WHERE read_at IS NULL; -- partial index untuk unread notifications
```

---

### audit_logs

```sql
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY,
  actor_id    UUID REFERENCES users (id), -- NULL untuk system action
  action      VARCHAR(100) NOT NULL,      -- format: resource.verb (user.login, ticket.assigned)
  target_type VARCHAR(100),               -- user, ticket, role, permission
  target_id   UUID,
  payload     JSONB,                      -- context tambahan
  ip_address  VARCHAR(45),
  created_at  TIMESTAMP NOT NULL DEFAULT now()
  -- tidak ada updated_at — audit log bersifat immutable
);

CREATE INDEX audit_logs_actor_id_idx ON audit_logs (actor_id);
CREATE INDEX audit_logs_target_id_idx ON audit_logs (target_type, target_id);
CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at);
```

Immutability: enforce via DB trigger yang menolak UPDATE dan DELETE.

---

## Drizzle Schema Pattern

Gunakan `pgTable` dari `drizzle-orm/pg-core` dengan UUID v7:

```typescript
import { pgTable, uuid, varchar, timestamp, boolean, integer, text, pgEnum } from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'

export const users = pgTable('users', {
  id:                   uuid('id').primaryKey().$defaultFn(() => uuidv7()),
  email:                varchar('email', { length: 255 }).notNull(),
  passwordHash:         varchar('password_hash', { length: 255 }).notNull(),
  fullName:             varchar('full_name', { length: 255 }).notNull(),
  isActive:             boolean('is_active').notNull().default(true),
  failedLoginAttempts:  integer('failed_login_attempts').notNull().default(0),
  lockedUntil:          timestamp('locked_until'),
  createdAt:            timestamp('created_at').notNull().defaultNow(),
  updatedAt:            timestamp('updated_at').notNull().defaultNow(),
  deletedAt:            timestamp('deleted_at'),
})
```
