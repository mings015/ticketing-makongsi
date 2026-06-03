# PRD 002 — User Management

## Goal

Admin dapat mengelola seluruh akun pengguna dalam sistem: membuat, melihat, mengubah,
mengaktifkan/menonaktifkan, dan menghapus user. Termasuk pengelolaan role per user.

---

## Roles & Permission Matrix

| Action | Super Admin | Admin | Support | Employee |
|---|:---:|:---:|:---:|:---:|
| List users | ✓ | ✓ | — | — |
| Get user detail | ✓ | ✓ | — | — |
| Create user | ✓ | ✓ | — | — |
| Update user | ✓ | ✓ | — | — |
| Activate user | ✓ | ✓ | — | — |
| Deactivate user | ✓ | ✓ | — | — |
| Delete user (soft) | ✓ | — | — | — |
| Assign role | ✓ | ✓ | — | — |
| Remove role | ✓ | ✓ | — | — |
| View own profile | ✓ | ✓ | ✓ | ✓ |
| Update own profile | ✓ | ✓ | ✓ | ✓ |

Admin **tidak bisa** menghapus user — hanya Super Admin.
Admin **tidak bisa** mengelola akun Super Admin lain.

---

## Endpoints

### GET /users

List semua user dengan pagination dan filter.

Query params:
```
page:     number (default: 1)
limit:    number (default: 20, max: 100)
search:   string (cari by name atau email)
role:     string (filter by role: super_admin | admin | support | employee)
isActive: boolean (filter by status)
```

Response `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "string",
      "fullName": "string",
      "isActive": true,
      "roles": ["string"],
      "createdAt": "datetime"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Permission: `users:read`

---

### GET /users/:id

Get detail satu user.

Response `200`:
```json
{
  "id": "uuid",
  "email": "string",
  "fullName": "string",
  "isActive": true,
  "roles": ["string"],
  "failedLoginAttempts": 0,
  "lockedUntil": null,
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

Errors:
- `404` — user tidak ditemukan atau sudah dihapus

Permission: `users:read`

---

### POST /users

Buat user baru. Password dibuat otomatis oleh sistem dan dikirim ke email user.

Request body:
```
fullName: string (min 2, max 255)
email:    string (format email, unik)
roles:    string[] (min 1 role)
```

Flow:
1. Validasi input
2. Cek email tidak duplicate (WHERE deleted_at IS NULL)
3. Generate password sementara (random 12 karakter)
4. Hash password dengan Argon2id
5. Insert user
6. Assign roles (via user_roles)
7. Kirim email berisi password sementara (TODO: email service)
8. Tulis audit log: `user.created`

Response `201`:
```json
{
  "id": "uuid",
  "email": "string",
  "fullName": "string",
  "roles": ["string"],
  "createdAt": "datetime"
}
```

Errors:
- `400` — validasi gagal
- `409` — email sudah digunakan

Permission: `users:create`

---

### PATCH /users/:id

Update data user (bukan password, bukan role — ada endpoint terpisah).

Request body (semua optional, minimal satu field):
```
fullName: string (min 2, max 255)
email:    string (format email, unik)
```

Flow:
1. Cari user, pastikan tidak deleted
2. Jika email berubah: cek tidak duplicate
3. Update kolom yang dikirim saja
4. Set `updated_at = now()`
5. Tulis audit log: `user.updated`

Response `200`:
```json
{
  "id": "uuid",
  "email": "string",
  "fullName": "string",
  "updatedAt": "datetime"
}
```

Errors:
- `404` — user tidak ditemukan
- `409` — email sudah digunakan

Permission: `users:update`

---

### PATCH /users/:id/activate

Aktifkan user yang non-aktif.

Flow:
1. Cari user, pastikan tidak deleted
2. Jika sudah aktif: return `200` tanpa perubahan (idempotent)
3. Set `is_active = true`, `failed_login_attempts = 0`, `locked_until = null`
4. Tulis audit log: `user.activated`

Response `200`:
```json
{ "ok": true }
```

Permission: `users:update`

---

### PATCH /users/:id/deactivate

Nonaktifkan user. User yang non-aktif tidak bisa login meskipun token masih valid
— middleware auth wajib cek `is_active` di setiap request.

Flow:
1. Cari user, pastikan tidak deleted
2. Cegah deactivate diri sendiri
3. Jika sudah non-aktif: return `200` (idempotent)
4. Set `is_active = false`
5. Revoke semua refresh token user (logout dari semua device)
6. Tulis audit log: `user.deactivated`

Response `200`:
```json
{ "ok": true }
```

Errors:
- `400` — tidak bisa menonaktifkan diri sendiri
- `403` — Admin tidak bisa menonaktifkan Super Admin

Permission: `users:update`

---

### DELETE /users/:id

Soft delete user. Hanya Super Admin.

Flow:
1. Cari user, pastikan belum deleted
2. Cegah delete diri sendiri
3. Cegah delete Super Admin lain (via role check)
4. Set `deleted_at = now()`, `is_active = false`
5. Revoke semua refresh token user
6. Tulis audit log: `user.deleted`

Response `200`:
```json
{ "ok": true }
```

Errors:
- `400` — tidak bisa menghapus diri sendiri
- `403` — tidak bisa menghapus Super Admin

Permission: `users:delete`

---

### POST /users/:id/roles

Assign role ke user.

Request body:
```
roleId: string (uuid)
```

Flow:
1. Cari user (tidak deleted)
2. Cari role (harus ada)
3. Cek role belum di-assign ke user (idempotent: jika sudah ada, return 200)
4. Insert ke `user_roles` dengan `assigned_by = currentUser.id`
5. Tulis audit log: `user.role_assigned`

Response `200`:
```json
{ "ok": true }
```

Permission: `roles:assign`

---

### DELETE /users/:id/roles/:roleId

Cabut role dari user.

Flow:
1. Cari user (tidak deleted)
2. Pastikan user punya minimal 1 role setelah pencabutan
3. Delete dari `user_roles`
4. Tulis audit log: `user.role_removed`

Response `200`:
```json
{ "ok": true }
```

Errors:
- `400` — user harus punya minimal 1 role

Permission: `roles:assign`

---

### GET /users/me

User melihat profil sendiri. Semua role bisa akses.

Response `200`:
```json
{
  "id": "uuid",
  "email": "string",
  "fullName": "string",
  "roles": ["string"],
  "isActive": true,
  "createdAt": "datetime"
}
```

Permission: hanya butuh `requireAuth` — tidak butuh permission khusus

---

### PATCH /users/me

User update profil sendiri (nama dan email saja).

Request body:
```
fullName: string (min 2, max 255)
email:    string (format email, unik)
```

Sama dengan `PATCH /users/:id` tetapi `id` diambil dari JWT, bukan param.

Permission: hanya butuh `requireAuth`

---

## UI Components (shadcn-ui)

### Halaman: `/users` — User List

Layout: full-width table dengan sidebar filter

Komponen:
- `DataTable` — kolom: Avatar+Nama, Email, Role badges, Status badge, Tanggal bergabung, Actions
- `Input` search dengan debounce 300ms
- `Select` filter Role
- `Switch` atau `Tabs` filter Status (All / Active / Inactive)
- `Pagination` component di bawah tabel
- `Button` "New User" → buka drawer
- Row actions: dropdown menu (Edit, Activate/Deactivate, Delete)

Status badge:
- Active → `Badge variant="default"` (hijau)
- Inactive → `Badge variant="secondary"` (abu)

---

### Komponen: Create/Edit User — Drawer (bukan modal)

Menggunakan `Sheet` dari shadcn-ui (slide dari kanan, lebih luas untuk form).

Form fields:
- `Input` Full Name
- `Input` Email
- `MultiSelect` Roles (shadcn `Command` + `Popover` pattern)

Validasi: inline dengan Zod + SvelteKit Form Actions.

---

### Komponen: Deactivate Confirmation

Menggunakan `AlertDialog` dari shadcn-ui.

```
Judul: "Nonaktifkan pengguna?"
Body:  "User [nama] tidak akan bisa login. Semua sesi aktif akan dicabut."
CTA:   "Nonaktifkan" (merah) | "Batal"
```

---

### Halaman: `/users/[id]` — User Detail

Layout: 2 kolom (info kiri, activity log kanan)

Komponen kiri:
- `Card` info user (avatar, nama, email, status, tanggal)
- `Card` roles dengan chip per role + tombol tambah/hapus role
- `Button` Activate/Deactivate
- `Button` Edit (buka Sheet)

Komponen kanan:
- Tabel audit log aktivitas user (login, role changes, dll)

---

### Halaman: `/profile` — Profil Sendiri

Layout: centered card

Komponen:
- `Card` berisi form edit nama dan email
- `Separator`
- Section ganti password (PRD terpisah — future)

---

## Security Implications

- Password awal digenerate server-side (random), tidak pernah dibuat oleh admin
- Admin tidak boleh melihat atau mengatur password user lain
- Deactivate harus langsung revoke semua refresh token (session invalidation)
- Endpoint `GET /users` tidak boleh expose `password_hash`, `failed_login_attempts`, `locked_until` — kecuali untuk Super Admin di `GET /users/:id`
- `GET /users/me` harus diletakkan **sebelum** `GET /users/:id` di router untuk menghindari konflik path

---

## Database Implications

- Email uniqueness enforced via partial unique index: `UNIQUE WHERE deleted_at IS NULL`
- Update `updated_at` wajib di setiap PATCH
- Deactivate user harus dalam **satu transaksi**: update `users` + revoke `refresh_tokens`
- Role assignment di `user_roles` dengan `assigned_by` wajib diisi
- Audit log ditulis di luar transaksi (fire and forget acceptable untuk log)

---

## Performance Considerations

- List users: index pada `is_active` sudah ada, tambah index pada `full_name` jika search by name sering
- Gunakan join untuk ambil roles sekaligus (hindari N+1)
- Pagination wajib — default 20, max 100
- Search dengan `ILIKE` harus menggunakan index `gin_trgm` jika dataset besar (future optimization)

---

## Edge Cases

- Deactivate user yang sedang login: token access masih valid sampai 15 menit karena short-lived — middleware harus revalidate `is_active` dari DB di setiap request
- Email update ke email yang pernah dipakai user yang sudah dihapus: diizinkan (partial unique index)
- Delete user yang adalah satu-satunya Super Admin: **harus dicegah** di service layer
- Assign role yang sama dua kali: idempotent, tidak error
- Remove role terakhir user: harus dicegah, user wajib punya minimal 1 role

---

## Acceptance Criteria

- Admin dapat melihat daftar user (paginated)
- Admin dapat membuat user baru dengan role
- Admin dapat update nama/email user
- Admin dapat activate dan deactivate user
- User non-aktif tidak bisa login (dicek di auth middleware setiap request)
- Deactivate mencabut semua sesi aktif (refresh token)
- Hanya Super Admin yang bisa delete user
- Semua aksi tercatat di audit_logs
- Tidak ada password hash yang keluar dari API response
