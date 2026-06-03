# Ticket Lifecycle

## States

| State | Deskripsi |
|---|---|
| `open` | Ticket baru dibuat, belum ditangani |
| `in_progress` | Sedang dikerjakan oleh support |
| `pending` | Menunggu informasi/respons dari requester |
| `resolved` | Pekerjaan selesai, menunggu konfirmasi requester |
| `closed` | Ticket selesai final — tidak bisa berubah |

---

## State Machine

```
                         ┌───────────────────────────────────┐
                         │                                   │
              ┌──────────▼──────────┐                        │
    CREATE ──>│        OPEN         │                        │
              └──────────┬──────────┘                        │
                         │                                   │
            assign / pick up (Support, Admin)      close (Admin, Super Admin)
                         │                                   │
              ┌──────────▼──────────┐                        │
              │     IN_PROGRESS     │────────────────────────┤
              └──────────┬──────────┘                        │
                         │                                   │
           ┌─────────────┴─────────────┐                     │
           │                           │                     │
  need info (Support, Admin)    resolve (Support, Admin)     │
           │                           │                     │
┌──────────▼──────────┐    ┌───────────▼─────────┐          │
│       PENDING       │    │      RESOLVED        │          │
└──────────┬──────────┘    └───────────┬──────────┘          │
           │                           │                     │
     ┌─────┴──────────────┐    ┌───────┴──────────────┐      │
     │                    │    │                       │      │
  reply (any)           close  confirm / auto-close  reopen  │
  resume (Support)    (Admin)  (Requester / system)  (Req.)  │
     │                    │    │                       │      │
     └──> IN_PROGRESS      │    └──> CLOSED             └──> IN_PROGRESS
                           │
                           └──────────────────────────────> CLOSED
```

---

## Transitions

### OPEN → IN_PROGRESS
- Trigger: Support atau Admin assign ticket (termasuk assign ke diri sendiri)
- Actor: Support, Admin, Super Admin
- Side effects:
  - Set `assignee_id`
  - Notifikasi ke assignee: `ticket_assigned`
  - Notifikasi ke requester: `ticket_updated`
  - Audit log: `ticket.assigned`

### OPEN → CLOSED
- Trigger: Admin menutup ticket secara langsung (duplikat, spam, tidak valid)
- Actor: Admin, Super Admin
- Side effects:
  - Set `closed_at = now()`
  - Notifikasi ke requester: `ticket_closed`
  - Audit log: `ticket.closed`

### IN_PROGRESS → PENDING
- Trigger: Support membutuhkan informasi tambahan dari requester
- Actor: Support, Admin, Super Admin
- Side effects:
  - Notifikasi ke requester: `ticket_updated` (perlu respons)
  - Audit log: `ticket.pending`

### IN_PROGRESS → RESOLVED
- Trigger: Support menandai issue sudah diselesaikan
- Actor: Support, Admin, Super Admin
- Side effects:
  - Set `resolved_at = now()`
  - Notifikasi ke requester: `ticket_resolved`
  - Audit log: `ticket.resolved`

### IN_PROGRESS → CLOSED
- Trigger: Admin force-close
- Actor: Admin, Super Admin
- Side effects:
  - Set `closed_at = now()`
  - Notifikasi ke requester: `ticket_closed`
  - Audit log: `ticket.closed`

### PENDING → IN_PROGRESS
- Trigger: Requester membalas (menambah comment), atau Support melanjutkan
- Actor: Employee (requester), Support, Admin, Super Admin
- Side effects:
  - Notifikasi ke assignee: `ticket_updated`
  - Audit log: `ticket.resumed`

### PENDING → CLOSED
- Trigger: Auto-close jika tidak ada respons dalam 3 hari kerja, atau Admin close manual
- Actor: System (cron), Admin, Super Admin
- Side effects:
  - Set `closed_at = now()`
  - Notifikasi ke requester: `ticket_closed`
  - Audit log: `ticket.closed` (actor_id = null jika system)

### RESOLVED → CLOSED
- Trigger: Requester mengkonfirmasi selesai, atau auto-close setelah 3 hari kerja tanpa respons
- Actor: Employee (requester), System (cron), Admin, Super Admin
- Side effects:
  - Set `closed_at = now()`
  - Notifikasi ke assignee: `ticket_closed`
  - Audit log: `ticket.closed`

### RESOLVED → IN_PROGRESS
- Trigger: Requester menyatakan issue belum selesai (reopen)
- Actor: Employee (requester), Admin, Super Admin
- Side effects:
  - Clear `resolved_at = null`
  - Notifikasi ke assignee: `ticket_updated`
  - Audit log: `ticket.reopened`

---

## Closed is Terminal

Ticket yang sudah `closed` **tidak dapat diubah statusnya**.

Jika issue muncul kembali, requester harus membuat ticket baru.

Alasan:
- Menjaga histori yang akurat
- Menghindari SLA gaming (reopen ticket lama untuk bypass timer)

---

## Permission Matrix

| Transition | Employee | Support | Admin | Super Admin |
|---|:---:|:---:|:---:|:---:|
| Create ticket | ✓ | ✓ | ✓ | ✓ |
| OPEN → IN_PROGRESS | — | ✓ | ✓ | ✓ |
| OPEN → CLOSED | — | — | ✓ | ✓ |
| IN_PROGRESS → PENDING | — | ✓ | ✓ | ✓ |
| IN_PROGRESS → RESOLVED | — | ✓ | ✓ | ✓ |
| IN_PROGRESS → CLOSED | — | — | ✓ | ✓ |
| PENDING → IN_PROGRESS | ✓ (reply) | ✓ | ✓ | ✓ |
| PENDING → CLOSED (manual) | — | — | ✓ | ✓ |
| RESOLVED → IN_PROGRESS (reopen) | ✓ | ✓ | ✓ | ✓ |
| RESOLVED → CLOSED (confirm) | ✓ | — | ✓ | ✓ |

---

## Auto-Close Rules

| From State | Trigger | Delay |
|---|---|---|
| `pending` | Tidak ada comment baru dari requester | 3 hari kerja |
| `resolved` | Tidak ada aksi dari requester | 3 hari kerja |

Auto-close dijalankan via scheduled job (cron).
Actor di audit log: `null` (system action).

---

## Ticket Number Format

```
TKT-YYYYMM-NNNN

Contoh:
TKT-202601-0001
TKT-202601-0002
TKT-202602-0001  ← reset setiap bulan
```

Sequence di-generate di application layer, bukan DB sequence,
agar format dapat dikontrol dan diprediksi.
