# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Untungin — a mobile-first web app (Indonesian UI text) for a reseller/dropship business to track produk (products), supplier, pesanan (orders), pelanggan (customers), and profit reports. Single-user app: one shared login password, no user accounts. Built with Next.js 15 (App Router) + TypeScript + Tailwind CSS + Prisma + Supabase (PostgreSQL). Deploys to Vercel.

## Commands

```bash
npm run dev          # dev server, http://localhost:3000
npm run build         # prisma generate && next build
npm run start          # production server on port 3001
npm run lint            # next lint
npm run db:push        # push prisma/schema.prisma to the Supabase database
npm run db:generate   # regenerate Prisma Client (also runs on postinstall)
```

`backfill:modal` and `scripts/backfill-customers.ts` are one-off data migrations already run against production — read a script before rerunning it, they are not meant to be part of the normal workflow.

There is no test suite in this repo.

## Environment / database

Requires `APP_PASSWORD`, `DATABASE_URL`, `DIRECT_URL` (see `.env.example`). Supabase must be reached through the **connection pooler**, never the direct `db.<ref>.supabase.co` host — that host is IPv6-only and unreachable from most laptops and from Vercel, causing `P1001`. `DATABASE_URL` = Transaction pooler (port 6543, `?pgbouncer=true`), used at runtime. `DIRECT_URL` = Session pooler (port 5432), used by `prisma db push`/migrations.

After changing `prisma/schema.prisma`, run `npm run db:push` locally (it targets the same Supabase database Vercel uses) and redeploy — there is no migration-on-deploy step.

`vercel.json` pins Serverless Function region to `sin1` (Singapore) to match the Supabase project's `ap-southeast-1` region — without this, every DB query from a deployed function crosses the Pacific twice (US-default function region ↔ Singapore DB), which dominates page load time far more than anything query-level. If the Supabase project ever moves region, update this to match.

## Architecture

**Auth**: single shared password, no user table. `lib/auth.ts` derives a session token as `SHA256("untungin:" + APP_PASSWORD)` using Web Crypto (so the exact same code runs in both the Edge middleware runtime and Node server actions). The token itself, not a random session ID, is stored in the `untungin_session` cookie (httpOnly, 7-day maxAge) — there is no server-side session store. `middleware.ts` gates every route except `/login` (matcher excludes `_next` and files with an extension) and redirects based on `isValidSession`.

**Route groups**: `app/(app)/` holds every protected page (dashboard, produk, supplier, pesanan, pelanggan, laporan, settings) and shares `app/(app)/layout.tsx`, which renders children inside a `max-w-2xl` centered column plus the `BottomNav`. `app/login/` sits outside that group and outside the protected layout. `app/page.tsx` is a bare redirect to `/dashboard`.

**Data flow pattern** (consistent across every resource — produk, supplier, pesanan, pelanggan, and the read-only laporan):
1. `page.tsx` is a Server Component: reads searchParams if needed, queries Prisma directly, shapes rows into plain-serializable objects.
2. It renders a client `*Manager.tsx` component (e.g. `ProdukManager`, `PesananManager`, `PelangganManager`), passing the fetched data as props.
3. The Manager owns all UI state (which modal is open, editing target, form state) and calls `"use server"` functions from `lib/actions/{resource}.ts` directly as form actions or via `useTransition`.
4. Every action returns `ActionResult = { ok: boolean; error?: string }` (defined once in `lib/actions/supplier.ts`, imported elsewhere) and calls `revalidatePath(...)` on every page that displays affected data before returning — there's no client-side cache invalidation.
5. Each route also has a `loading.tsx` using `components/ui/Skeleton.tsx`/`ListSkeleton.tsx` to match the shape of the real content.

**Pesanan (orders) domain logic** — the most complex piece, in `lib/actions/pesanan.ts`, `lib/actions/pembayaran.ts`, and `lib/calc.ts`:
- An order (`Pesanan`) has two kinds of line items: plain `PesananItem` (one produk, qty, snapshotted `hargaSaat` sale price and `modalSaat` cost) and `PesananPaket` (a bundle sold at one `harga`, made of `PesananPaketItem` components referencing produk by `pcs`, each with its own `modalSaat` snapshot).
- `status` (`lib/calc.ts` `STATUS_LIST`) is purely **payment-driven**: `"belum_bayar" | "nyicil" | "lunas"` — there is no separate fulfillment step. **Stock (`Produk.stok`) leaves the moment an order is created**, regardless of status, and returns on delete or on a qty-reducing edit; `createPesanan`/`updatePesanan`/`deletePesanan` reconcile stock deltas inside a `prisma.$transaction`, computed via the shared `stockNeeds()` helper (sums quantities across both items and paket components per produk).
- Payments are separate rows (`Pembayaran`, one per full payment or installment, with an optional free-text `metode` — e.g. "Cash"/"Transfer"/"QRIS" — and no other bookkeeping behind it). `tambahPembayaran`/`hapusPembayaran` in `lib/actions/pembayaran.ts` re-derive status from `totalDibayar` vs `totalPesanan()` via `recomputeStatus()` — adding a payment never *downgrades* an already-`lunas` order (extra payment = overpayment, not a status change), but removing one always can. `tandaiLunas` force-completes an underpaid order (discount/write-off); the resulting profit can go negative.
- Profit/total math (`marginPersen`, `totalPesanan`, `modalPesanan`, `untungPesanan`, `modalPaket`) lives in `lib/calc.ts` and is reused by the dashboard, laporan, and pesanan views — don't reimplement it inline.
- Form payloads for items/pakets are submitted as JSON strings inside FormData fields and parsed with defensive `parseItems`/`parsePakets` helpers that silently drop malformed entries rather than throwing.
- `Pelanggan` (`Customer`) is resolved, not chosen, from the order form: `resolveCustomerId()` (`lib/actions/customer.ts`) matches an existing customer by case-insensitive name or creates one — it never overwrites an existing customer's `noHp`, the order keeps its own `noHp` snapshot regardless.

**Prisma client**: `lib/prisma.ts` uses the standard Next.js dev-mode singleton (attached to `globalThis`) to avoid exhausting connections on hot reload.

**UI components** (`components/ui/`): shadcn/ui-style primitives (Button, Card, Input, Modal, Combobox, Command, Popover, Badge, StatusBadge, Skeleton, ListSkeleton, SearchInput, PageHeader, BottomNav) built on Radix primitives + `class-variance-authority` + `tailwind-merge`. `lib/cn.ts` re-exports `cn` from `lib/utils.ts` for backwards compatibility — import either, they're the same function. Colors are HSL CSS variables defined in `app/globals.css` under `:root` and `.dark` (light/dark themes via `next-themes`, toggled in Settings) — reference them through Tailwind's semantic classes (`bg-primary`, `text-muted`, `border-border`, etc.), not raw hex values. An optional dropdown (e.g. the payment `metode` field) is a plain native `<select>`, not the Radix-based primitive — Radix's `Select` reserves the empty string as its "clear" signal and throws if any `<option>`-equivalent uses it, so a nullable choice is simpler as native HTML.

**Path alias**: `@/*` maps to the repo root (see `tsconfig.json`).

## Notes & Gotchas
- Do not make any changes until you have 95% confidence in what you need to build. Ask me follow-up questions until you reach that confidence.
- After all edits, always tell me what files have been changed.
