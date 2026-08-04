# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Untungin — a mobile-first web app (Indonesian UI text) for a reseller/dropship business to track produk (products), supplier, pesanan (orders), and profit reports. Single-user app: one shared login password, no user accounts. Built with Next.js 15 (App Router) + TypeScript + Tailwind CSS + Prisma + Supabase (PostgreSQL). Deploys to Vercel.

## Commands

```bash
npm run dev          # dev server, http://localhost:3000
npm run build         # prisma generate && next build
npm run start          # production server on port 3001
npm run lint            # next lint
npm run db:push        # push prisma/schema.prisma to the Supabase database
npm run db:generate   # regenerate Prisma Client (also runs on postinstall)
```

There is no test suite in this repo.

## Environment / database

Requires `APP_PASSWORD`, `DATABASE_URL`, `DIRECT_URL` (see `.env.example`). Supabase must be reached through the **connection pooler**, never the direct `db.<ref>.supabase.co` host — that host is IPv6-only and unreachable from most laptops and from Vercel, causing `P1001`. `DATABASE_URL` = Transaction pooler (port 6543, `?pgbouncer=true`), used at runtime. `DIRECT_URL` = Session pooler (port 5432), used by `prisma db push`/migrations.

After changing `prisma/schema.prisma`, run `npm run db:push` locally (it targets the same Supabase database Vercel uses) and redeploy — there is no migration-on-deploy step.

## Architecture

**Auth**: single shared password, no user table. `lib/auth.ts` derives a session token as `SHA256("untungin:" + APP_PASSWORD)` using Web Crypto (so the exact same code runs in both the Edge middleware runtime and Node server actions). The token itself, not a random session ID, is stored in the `untungin_session` cookie (httpOnly, 7-day maxAge) — there is no server-side session store. `middleware.ts` gates every route except `/login` (matcher excludes `_next` and files with an extension) and redirects based on `isValidSession`.

**Route groups**: `app/(app)/` holds every protected page (dashboard, produk, supplier, pesanan, laporan, settings) and shares `app/(app)/layout.tsx`, which renders children inside a `max-w-2xl` centered column plus the `BottomNav`. `app/login/` sits outside that group and outside the protected layout.

**Data flow pattern** (consistent across all four resources — produk, supplier, pesanan, and the read-only laporan):
1. `page.tsx` is a Server Component: reads searchParams if needed, queries Prisma directly, shapes rows into plain-serializable objects.
2. It renders a client `*Manager.tsx` component (e.g. `ProdukManager`, `PesananManager`, `SupplierManager`), passing the fetched data as props.
3. The Manager owns all UI state (which modal is open, editing target, form state) and calls `"use server"` functions from `lib/actions/{resource}.ts` directly as form actions or via `useTransition`.
4. Every action returns `ActionResult = { ok: boolean; error?: string }` (defined once in `lib/actions/supplier.ts`, imported elsewhere) and calls `revalidatePath(...)` on every page that displays affected data before returning — there's no client-side cache invalidation.
5. Each route also has a `loading.tsx` using `components/ui/Skeleton.tsx`/`ListSkeleton.tsx` to match the shape of the real content.

**Pesanan (orders) domain logic** — the most complex piece, in `lib/actions/pesanan.ts` and `lib/calc.ts`:
- An order (`Pesanan`) has two kinds of line items: plain `PesananItem` (one produk, qty, snapshotted `hargaSaat` sale price) and `PesananPaket` (a bundle sold at one price, made of `PesananPaketItem` components referencing produk by `pcs`).
- `status` moves through `STATUS_LIST = ["baru", "diproses", "dikirim", "selesai"]`. `isCommitted(status)` is true for `dikirim`/`selesai` — stock (`Produk.stok`) is only decremented once an order becomes committed, and returned if it moves back to uncommitted or is deleted. `updatePesanan`, `updateStatus`, and `deletePesanan` all reconcile stock deltas inside a `prisma.$transaction`, computed via the shared `stockNeeds()` helper (sums quantities across both items and paket components per produk).
- Profit/total math (`marginPersen`, `totalPesanan`, `untungPesanan`, `modalPaket`) lives in `lib/calc.ts` and is reused by the dashboard, laporan, and pesanan views — don't reimplement it inline.
- Form payloads for items/pakets are submitted as JSON strings inside FormData fields and parsed with defensive `parseItems`/`parsePakets` helpers that silently drop malformed entries rather than throwing.

**Prisma client**: `lib/prisma.ts` uses the standard Next.js dev-mode singleton (attached to `globalThis`) to avoid exhausting connections on hot reload.

**UI components** (`components/ui/`): shadcn/ui-style primitives (Button, Card, Input, Modal, Combobox, Command, Popover, Select, Badge, StatusBadge, Skeleton, BottomNav) built on Radix primitives + `class-variance-authority` + `tailwind-merge` (merged via `lib/cn.ts`). Colors are HSL CSS variables defined in `app/globals.css` under `:root` and `.dark` (light/dark themes via `next-themes`, toggled in Settings) — reference them through Tailwind's semantic classes (`bg-primary`, `text-muted`, `border-border`, etc.), not raw hex values.

**Path alias**: `@/*` maps to the repo root (see `tsconfig.json`).

## Notes & Gotchas
- Do not make any changes until you have 95% confidence in what you need to build. Ask me follow-up questions until you reach that confidence.
- After all edits, always tell me what files have been changed.