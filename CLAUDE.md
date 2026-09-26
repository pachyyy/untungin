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

`backfill:modal`, `scripts/backfill-customers.ts`, and `scripts/backfill-nomor-nota.ts` are one-off data migrations already run against production (the last one is guarded to be a no-op once nota numbers follow creation order — it must never renumber orders whose numbers customers have already seen) — read a script before rerunning it, they are not meant to be part of the normal workflow.

There is no test suite in this repo.

## Environment / database

Requires `APP_PASSWORD`, `DATABASE_URL`, `DIRECT_URL` (see `.env.example`). Supabase must be reached through the **connection pooler**, never the direct `db.<ref>.supabase.co` host — that host is IPv6-only and unreachable from most laptops and from Vercel, causing `P1001`. `DATABASE_URL` = Transaction pooler (port 6543, `?pgbouncer=true&connection_limit=1&sslmode=require`), used at runtime. `DIRECT_URL` = Session pooler (port 5432, `?sslmode=require`), used by `prisma db push`/migrations.

`connection_limit=1` on `DATABASE_URL` matters specifically because of serverless: each Vercel function instance opens its own Prisma pool, and without a cap a burst of concurrent invocations can exhaust the pooler's connections (`P2024`/`too many clients`). `sslmode=require` is on both — the connection crosses the public internet (Vercel ↔ Supabase), so it must be encrypted; Prisma's unset default (`prefer`) would silently accept a plaintext fallback instead of failing loud.

After changing `prisma/schema.prisma`, run `npm run db:push` locally (it targets the same Supabase database Vercel uses) and redeploy — there is no migration-on-deploy step.

`vercel.json` pins Serverless Function region to `sin1` (Singapore) to match the Supabase project's `ap-southeast-1` region — without this, every DB query from a deployed function crosses the Pacific twice (US-default function region ↔ Singapore DB), which dominates page load time far more than anything query-level. If the Supabase project ever moves region, update this to match.

**History**: this briefly ran on a self-hosted Postgres container on a Contabo VPS (via Coolify) instead of Supabase. That's been reverted — Supabase is the live database again — but the VPS Postgres instance is left running as a dormant rollback safety net for now, holding a stale copy of the data as of the reversion. Don't confuse references to it (or to a "split deployment") found in old commits/docs with the current setup.

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
- Every line (`PesananItem`, `PesananPaket` — not individual paket components) has an optional `keterangan` note (max 200 chars, `KETERANGAN_MAX` in `lib/services/pesanan-input.ts`), printed on the struk. The normalizer returns `undefined` when the key is *absent* vs `null` when sent empty: `updatePesanan` deletes and recreates all lines, so for an absent key (an APK built before the field existed) it carries the old note over from the line at the same position if it's still the same product/dropship name/paket name. Lines are read `orderBy: { id: "asc" }` everywhere so those positions line up.
- `Pesanan.nomor` is a sequential nota number (Postgres autoincrement, never reused — deletes leave gaps), shown as `formatNomorNota(prefixNota, nomor)` (`lib/format.ts`), e.g. `INV-0042`.
- `Pelanggan` (`Customer`) is resolved, not chosen, from the order form: `resolveCustomerId()` (`lib/actions/customer.ts`) matches an existing customer by case-insensitive name or creates one — it never overwrites an existing customer's `noHp`, the order keeps its own `noHp` snapshot regardless.

**Cetak Struk (receipt image)**: order detail → `StrukModal` (`app/(app)/pesanan/StrukModal.tsx`) renders `components/struk/Struk.tsx` (inline styles, always black-on-white regardless of theme; `80mm` = 400px strip that grows with the order, `a5` = 560px with a 148:210 minimum height that also grows) and captures it to a PNG with `html-to-image` (`lib/struk-image.ts`). The PNG is rendered *before* the user taps Bagikan, because iOS Safari only allows `navigator.share()` shortly after a tap; `shareOrDownload` uses the Web Share API with a file (WhatsApp etc. via the OS share sheet) and falls back to a download on desktop. There is no printer integration. Header/footer/payment info/logo/toggles live in the singleton `StrukSetting` row (`lib/services/struk.ts`), edited at `/settings/struk` (`StrukEditor.tsx`, with a live preview on a hard-coded sample order) or from the mobile app via owner-only `PATCH /api/v1/struk-setting`. Both paths call `updateStrukSetting` and `revalidateStrukWrite()`. `getStrukSetting()` never writes — it returns defaults until the first save creates the row. The logo is downscaled in the browser to ≤300px and stored as a `data:image/...` URL in that row (server caps it at 200k chars).

**Prisma client**: `lib/prisma.ts` uses the standard Next.js dev-mode singleton (attached to `globalThis`) to avoid exhausting connections on hot reload.

**UI components** (`components/ui/`): shadcn/ui-style primitives (Button, Card, Input, Modal, Combobox, Command, Popover, Badge, StatusBadge, Skeleton, ListSkeleton, SearchInput, PageHeader, BottomNav) built on Radix primitives + `class-variance-authority` + `tailwind-merge`. `lib/cn.ts` re-exports `cn` from `lib/utils.ts` for backwards compatibility — import either, they're the same function. Colors are HSL CSS variables defined in `app/globals.css` under `:root` and `.dark` (light/dark themes via `next-themes`, toggled in Settings) — reference them through Tailwind's semantic classes (`bg-primary`, `text-muted`, `border-border`, etc.), not raw hex values. An optional dropdown (e.g. the payment `metode` field) is a plain native `<select>`, not the Radix-based primitive — Radix's `Select` reserves the empty string as its "clear" signal and throws if any `<option>`-equivalent uses it, so a nullable choice is simpler as native HTML.

**Path alias**: `@/*` maps to the repo root (see `tsconfig.json`).

## Mobile client (backend done, Expo app in progress)

A native Android app lives in a **separate repository** (`01_untungin_mobile`, Expo / React Native + TypeScript). It is a client of this repo, not a fork of it, and this has consequences here:

- The API is served from the same Vercel deployment as the web app (`app/api/v1/*`), so it inherits Vercel's TLS and needs no separate host or domain.
- Domain logic is not reimplemented on the device. Stock reconciliation (`stockNeeds()` inside `prisma.$transaction`) and the `status`/`statusRank` pairing stay server-side, in `lib/services/*.ts`, called by both the web's `"use server"` actions and the API's route handlers.
- The pure helpers — `lib/calc.ts`, `lib/format.ts`, `lib/date.ts`, `lib/parse.ts` — are copied into the mobile repo verbatim (`01_untungin_mobile/src/lib/`, each file noting the source). They have no server dependencies, so keep them that way: do not import Prisma, `next/*`, or anything Node-only into them.
- API routes are versioned (`/api/v1/...`). Installed APKs keep calling old endpoints for months, unlike a web page that redeploys atomically — a `/v2` would sit alongside `/v1`, not replace it.
- Auth is per-device and revocable (`Device`/`EnrollCode`, `lib/api/auth.ts`), not the web's shared-password cookie — the app is sideloaded to staff phones, and a lost/former-staff phone must be revocable without changing `APP_PASSWORD` for everyone else.

**Status:**
- ✅ **Service layer** — `lib/services/*.ts` holds the real logic (validation, Prisma writes, stock/status invariants) as plain functions returning `ServiceResult<T>` (`lib/services/types.ts`). `lib/actions/*.ts` (web) and `app/api/v1/*` (mobile) are both thin callers of the same functions.
- ✅ **Schema** — `Device` (an enrolled phone/tablet; role `"owner" | "staff"`; holds only a hash of its current refresh token, plus the previous one for one rotation, never the token itself; revoked via `revokedAt`, never deleted) and `EnrollCode` (a short-lived single-use code the owner generates so staff can enroll without learning `APP_PASSWORD`) are live on Supabase. `Pesanan.createdByDeviceId` / `Pembayaran.createdByDeviceId` are written by the API (`null` = created from the web) — attribution is recorded at creation only, not on later edits.
- ✅ **API** — the full route table is live under `app/api/v1/`: `auth/{owner,enroll,refresh,logout}`, `me`, `devices` (list/generate-code/revoke), `pesanan` (list/create/get/update/delete/payments/lunas), `produk` (list/create/update/delete/restock), `pelanggan` (list/create/update/delete), `supplier` (list/create/update/delete), `dashboard`, `laporan`, `struk-setting` (get/update). `lib/api/auth.ts` issues/verifies JWT access tokens (15 min) and rotates refresh tokens (60 days, reuse-detected); `lib/api/serialize.ts` strips cost/profit fields from every staff-facing response, enforced by what's actually in the JSON. Role matrix: staff can create/edit orders, record payments, and manage produk/pelanggan day-to-day; deleting a payment, forcing Lunas while underpaid, deleting an order, and anything supplier- or device-management-related is owner-only. Regression-tested by `scripts/api-smoke.ts` (`npx tsx scripts/api-smoke.ts` against a running `npm run dev` — creates and cleans up its own `__SMOKE_*`-named rows against the real dev database, there is no separate test DB).
- ✅ **Device management UI** — Settings → Perangkat (`app/(app)/settings/PerangkatManager.tsx`, `lib/actions/devices.ts`): generate an enrollment code (shown once, with a live 10-minute countdown), see active/revoked devices and last-active date, revoke a device. The whole web-side surface for the mobile app is now in place.
- ✅ **Struk/keterangan API**:
  - `GET /api/v1/struk-setting` (any device) returns the receipt customization.
  - `PATCH /api/v1/struk-setting` is owner-only. A key missing from the body keeps its stored value instead of being cleared, so an older APK can't wipe a setting added later; `logo: null` removes the logo.
  - Pesanan responses carry `nomor` and per-line `keterangan`, and create/update accept `keterangan` (additive — old APKs keep working and don't wipe notes, see Pesanan domain logic).
  - The mobile app uses all of it: keterangan inputs, nota numbers, Cetak Struk (native port of `Struk.tsx`, shared as a PNG) and an Edit Struk screen. `formatNomorNota` is re-copied into its `lib/format.ts`.
- ✅ **Mobile app** (`01_untungin_mobile`) — every screen is built and working end-to-end against this API: auth, Beranda, Pesanan, Produk, Pelanggan, and (owner only) Supplier/Laporan/Perangkat device management. See that repo's own `CLAUDE.md` for the exact status. Remaining work there is EAS Build/Update configuration and app icons — not this API. `next.config.mjs`/`middleware.ts` carry a dev-only CORS allowance for its Expo *web* preview (a different browser origin than this app), gated on `NODE_ENV !== "production"` — never active in the real deployment, and irrelevant to the shipped Android build (CORS is a browser mechanism).

## Notes & Gotchas
- Do not make any changes until you have 95% confidence in what you need to build. Ask me follow-up questions until you reach that confidence.
- After all edits, always tell me what files have been changed.
