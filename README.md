# Untungin

Aplikasi web sederhana untuk mengelola bisnis reseller/dropship: produk, supplier,
pesanan, dan laporan untung. **Mobile-first**, dipakai satu tangan dari HP.

Dibangun dengan **Next.js 15 (App Router) + TypeScript + Tailwind CSS + Prisma +
Supabase (PostgreSQL)**. Target deploy: **Vercel**.

## Fitur

- 🔐 Login 1 password (tanpa akun/email), sesi 7 hari via cookie httpOnly
- 📊 Dashboard: untung & omzet bulan ini, pesanan pending, stok menipis
- 📦 Produk: CRUD, margin otomatis, pilih/tambah supplier langsung dari form
- 🏭 Supplier: CRUD + jumlah produk + tombol WA
- 🧾 Pesanan: multi-item, harga jual di-snapshot, filter status, update status
- 📈 Laporan: grafik untung per bulan (Recharts), rentang tanggal, produk terlaris
- 💰 Stok otomatis berkurang saat pesanan `dikirim`/`selesai`, dan kembali bila dibatalkan

## Menjalankan secara lokal

```bash
npm install
# isi .env (lihat .env.example)
npm run db:push      # buat tabel di Supabase
npm run dev          # buka http://localhost:3000
```

Perintah lain:

- `npm run build` – build produksi (otomatis `prisma generate`)
- `npm run db:push` – sinkronkan schema Prisma ke database
- `npm run db:generate` – generate Prisma Client

## Environment variables

| Nama           | Kegunaan                                                         |
| -------------- | --------------------------------------------------------------- |
| `APP_PASSWORD` | Password login tunggal                                          |
| `DATABASE_URL` | Koneksi runtime — **Transaction pooler** Supabase (port 6543)   |
| `DIRECT_URL`   | Koneksi migrasi — **Session pooler** Supabase (port 5432)       |

> **Penting soal Supabase:** jangan pakai "Direct connection" (`db.<ref>.supabase.co`).
> Host itu sekarang IPv6-only dan biasanya tak bisa dijangkau dari laptop maupun
> Vercel, sehingga muncul error `P1001: Can't reach database server`. Selalu pakai
> **Connection Pooler** seperti contoh di `.env.example`.

---

## Setup Supabase (manual, sekali saja)

1. Buka [supabase.com](https://supabase.com) → **New project**. Catat **database
   password** saat pembuatan project.
2. Setelah project jadi, buka **Project Settings → Database → Connection string**.
3. Pilih tab **Transaction pooler** → salin ke `DATABASE_URL` (port 6543, tambahkan
   `?pgbouncer=true`).
4. Pilih tab **Session pooler** → salin ke `DIRECT_URL` (port 5432).
   - Ganti `[YOUR-PASSWORD]` dengan password dari langkah 1.
   - Username-nya berbentuk `postgres.<project-ref>` (sudah otomatis di string pooler).
5. Isi `APP_PASSWORD` dengan password login pilihanmu.
6. Jalankan `npm run db:push` untuk membuat semua tabel.

## Deploy ke Vercel (manual)

1. Push project ini ke GitHub (repo boleh privat).
2. Buka [vercel.com](https://vercel.com) → **Add New → Project** → import repo-nya.
3. Framework preset otomatis terdeteksi **Next.js**. Biarkan default.
4. Di **Environment Variables**, tambahkan (untuk Production & Preview):
   - `APP_PASSWORD`
   - `DATABASE_URL` (transaction pooler, port 6543, `?pgbouncer=true`)
   - `DIRECT_URL` (session pooler, port 5432)
5. Klik **Deploy**.
6. Jika schema berubah nanti, jalankan `npm run db:push` dari komputermu (mengarah ke
   database Supabase yang sama), lalu redeploy — tabel akan ikut ter-update.

Selesai. Buka URL Vercel, login dengan `APP_PASSWORD`, dan mulai catat produk & pesanan.

## Struktur

```
app/
  (app)/            # halaman terproteksi + bottom nav
    dashboard/ produk/ supplier/ pesanan/ laporan/
  login/            # halaman login (di luar proteksi)
components/ui/      # Button, Card, Input, Modal, BottomNav, dsb.
lib/
  actions/          # server actions (produk, supplier, pesanan, auth)
  prisma.ts calc.ts format.ts auth.ts cn.ts
prisma/schema.prisma
middleware.ts       # proteksi semua route kecuali /login
```
