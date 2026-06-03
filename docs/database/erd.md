# Entity Relationship Diagram

## Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AUTHENTICATION                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌─────────────────────┐
│      users       │       │   refresh_tokens     │
├──────────────────┤       ├─────────────────────┤
│ id (PK)          │──────<│ id (PK)              │
│ email            │       │ user_id (FK)         │
│ password_hash    │       │ token_hash           │
│ full_name        │       │ expires_at           │
│ is_active        │       │ revoked_at           │
│ failed_login_att │       │ ip_address           │
│ locked_until     │       │ user_agent           │
│ created_at       │       │ created_at           │
│ updated_at       │       └─────────────────────┘
│ deleted_at       │
└────────┬─────────┘
         │
         │
┌────────┴─────────────────────────────────────────────────────────────────────┐
│                              RBAC                                             │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────────┐
│      roles       │       │   user_roles     │       │     users            │
├──────────────────┤       ├──────────────────┤       ├──────────────────────┤
│ id (PK)          │──────<│ id (PK)          │>──────│ id (PK)              │
│ name             │       │ role_id (FK)     │       │ ...                  │
│ description      │       │ user_id (FK)     │       └──────────────────────┘
│ created_at       │       │ assigned_by (FK) │──────> users.id
│ updated_at       │       │ created_at       │
└────────┬─────────┘       └──────────────────┘
         │
         │
┌────────┴─────────┐       ┌──────────────────┐       ┌──────────────────────┐
│      roles       │       │ role_permissions  │       │    permissions       │
├──────────────────┤       ├──────────────────┤       ├──────────────────────┤
│ id (PK)          │──────<│ id (PK)          │>──────│ id (PK)              │
│ ...              │       │ role_id (FK)     │       │ resource             │
└──────────────────┘       │ permission_id(FK)│       │ action               │
                           │ created_at       │       │ description          │
                           └──────────────────┘       │ created_at           │
                                                       └──────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              TICKETING                                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────────────────────────────────────┐
│    categories    │       │                   tickets                        │
├──────────────────┤       ├──────────────────────────────────────────────────┤
│ id (PK)          │──────<│ id (PK)                                          │
│ name             │  opt  │ ticket_number (UNIQUE)                           │
│ description      │       │ title                                            │
│ created_at       │       │ description                                      │
│ updated_at       │       │ status (ENUM)                                    │
│ deleted_at       │       │ priority (ENUM)                                  │
└──────────────────┘       │ category_id (FK, nullable)                      │
                           │ requester_id (FK) ──────────────────> users.id  │
                           │ assignee_id (FK, nullable) ─────────> users.id  │
                           │ due_at                                           │
                           │ resolved_at                                      │
                           │ closed_at                                        │
                           │ created_at                                       │
                           │ updated_at                                       │
                           │ deleted_at                                       │
                           └──────────┬───────────────────────────────────────┘
                                      │
              ┌───────────────────────┼──────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
┌──────────────────────┐  ┌───────────────────────┐  ┌────────────────────┐
│      comments        │  │      attachments       │  │   notifications    │
├──────────────────────┤  ├───────────────────────┤  ├────────────────────┤
│ id (PK)              │  │ id (PK)               │  │ id (PK)            │
│ ticket_id (FK)       │  │ ticket_id (FK)        │  │ user_id (FK)       │
│ author_id (FK)       │  │ uploaded_by (FK)      │  │ type (ENUM)        │
│  └──> users.id       │  │  └──> users.id        │  │ title              │
│ body                 │  │ file_name             │  │ body               │
│ is_internal          │  │ stored_name           │  │ ticket_id (FK,opt) │
│ created_at           │  │ file_url              │  │ read_at            │
│ updated_at           │  │ file_size             │  │ created_at         │
│ deleted_at           │  │ mime_type             │  └────────────────────┘
└──────────────────────┘  │ created_at            │
                          └───────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              AUDIT                                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│              audit_logs              │
├──────────────────────────────────────┤
│ id (PK)                              │
│ actor_id (FK, nullable) ──> users.id │
│ action    (e.g. user.login)          │
│ target_type (user/ticket/role)       │
│ target_id (UUID, nullable)           │
│ payload (JSONB)                      │
│ ip_address                           │
│ created_at  ← immutable, no update  │
└──────────────────────────────────────┘
```

---

## Relationship Summary

| From | Cardinality | To | Constraint |
|---|---|---|---|
| users | 1 → many | refresh_tokens | user dapat punya banyak token (multi-device) |
| users | many ↔ many | roles | via user_roles |
| roles | many ↔ many | permissions | via role_permissions |
| users | 1 → many | tickets (requester) | user dapat buat banyak ticket |
| users | 1 → many | tickets (assignee) | support dapat di-assign banyak ticket |
| categories | 1 → many | tickets | optional |
| tickets | 1 → many | comments | |
| tickets | 1 → many | attachments | |
| tickets | 1 → many | notifications | |
| users | 1 → many | notifications | setiap notif milik satu user |
| users | 1 → many | audit_logs (actor) | nullable untuk system action |

---

## Table Count

| Grup | Tables |
|---|---|
| Auth | users, refresh_tokens |
| RBAC | roles, permissions, user_roles, role_permissions |
| Ticketing | tickets, categories, comments, attachments |
| System | notifications, audit_logs |
| **Total** | **10 tables** |
