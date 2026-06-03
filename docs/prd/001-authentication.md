# PRD 001 — Authentication

## Goal

Mengamankan akses aplikasi menggunakan JWT access token + refresh token yang disimpan di database,
dikirim melalui HttpOnly cookie.

---

## Token Strategy

| Token | Storage | Transport | TTL |
|---|---|---|---|
| Access Token | Tidak disimpan di DB | HttpOnly Cookie | 15 menit |
| Refresh Token | DB table `refresh_tokens` (disimpan sebagai SHA-256 hash) | HttpOnly Cookie | 7 hari |

Alasan cookie:
- Token tidak dapat diakses JavaScript (XSS protection)
- SameSite=Lax melindungi dari CSRF pada mutating requests
- Revocation dapat dilakukan server-side via DB

---

## Endpoints

### POST /auth/login

Request body:
```
email: string (format email)
password: string (min 8 karakter)
```

Flow:
1. Validate input (Zod)
2. Cari user by email
3. Cek `is_active = true`
4. Cek `locked_until` — jika masih terkunci, tolak dengan 429
5. Verify password dengan Argon2id
6. Jika gagal: increment `failed_login_attempts`, lock jika >= 5
7. Jika berhasil: reset `failed_login_attempts = 0`, `locked_until = null`
8. Generate access token (JWT, exp 15m)
9. Generate refresh token (random 64 bytes, simpan SHA-256 ke DB)
10. Set dua cookie: `access_token`, `refresh_token`
11. Tulis audit log: `user.login`

Response `200`:
```json
{
  "user": {
    "id": "uuid",
    "email": "string",
    "full_name": "string",
    "roles": ["string"]
  }
}
```

Errors:
- `400` — validasi gagal
- `401` — credential salah
- `403` — akun non-aktif
- `429` — akun terkunci (sertakan `retryAfter` dalam detik)

---

### POST /auth/refresh

Flow:
1. Baca cookie `refresh_token`
2. Hash dengan SHA-256, cari di DB
3. Cek `revoked_at IS NULL` dan `expires_at > now()`
4. Cek user `is_active = true`
5. Revoke token lama (rotation — satu token hanya boleh dipakai sekali)
6. Generate access token baru + refresh token baru
7. Set dua cookie baru
8. Tulis audit log: `user.token_refreshed`

Response `200`:
```json
{ "ok": true }
```

Errors:
- `401` — token tidak valid / sudah dipakai / expired

---

### POST /auth/logout

Flow:
1. Baca cookie `refresh_token`
2. Hash SHA-256, revoke di DB (`revoked_at = now()`)
3. Clear kedua cookie
4. Tulis audit log: `user.logout`

Response `200`:
```json
{ "ok": true }
```

---

## Cookie Config

```
access_token:
  httpOnly: true
  secure: true (production)
  sameSite: lax
  path: /
  maxAge: 900 (15 menit)

refresh_token:
  httpOnly: true
  secure: true (production)
  sameSite: lax
  path: /auth/refresh
  maxAge: 604800 (7 hari)
```

Refresh token cookie di-scope ke `/auth/refresh` saja — tidak dikirim pada setiap request.

---

## Brute Force Protection

- Setelah 5 kali gagal login: `locked_until = now() + 15 menit`
- Counter reset setelah login berhasil
- Kolom di tabel `users`: `failed_login_attempts`, `locked_until`

---

## Security Headers

Setiap response dari auth endpoints harus menyertakan:
```
Cache-Control: no-store
```

---

## Acceptance Criteria

- User dapat login dengan credential valid
- Invalid credential ditolak dengan `401`
- Akun non-aktif tidak bisa login (403)
- Akun terkunci setelah 5 kali gagal login
- Refresh token hanya dapat dipakai sekali (rotation)
- Logout mencabut refresh token di DB
- Semua cookie bersifat HttpOnly
- Semua auth events masuk ke audit_logs
