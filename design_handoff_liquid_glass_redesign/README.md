# Handoff: Untungin — Desktop-first Redesign with Two Switchable Design Modes

## Overview
Untungin is a mobile-first Next.js app (Indonesian UI) for a reseller/dropship business: produk (products), supplier, pesanan (orders), pelanggan (customers), and laporan (profit reports). Today the desktop view is just the mobile layout stretched into a centered `max-w-2xl` column. This redesign gives desktop its own layout (sidebar nav, list/detail split views, command palette) and ships **two complete visual skins the user can switch between at runtime**:

1. **Liquid Glass** — translucent frosted panels over an animated gradient-mesh backdrop, dark by default with a light toggle.
2. **Brutalist** — flat black/white/yellow (or red/paper) blocks, thick borders, hard offset shadows, condensed uppercase display type + monospace data, sharp corners, hover "glitch" snaps.

Both modes share the same desktop shell (sidebar, topbar, split-view, command palette) and the same mobile shape (bottom nav) — only the surface styling (colors, borders, shadows, radius, type) differs. **This is feasible and is the recommended approach**: nearly everything that differs between the two prototypes is expressible as a swappable set of CSS custom properties plus a small number of conditional classes for shape (radius/border-width/shadow style) and font — no structural/layout duplication needed.

## About the design files
`design-reference.html` (Liquid Glass) and `design-reference-brutalist.html` (Brutalist), each paired with `support.js` alongside it, are **design reference/prototypes**, not production code — built in an internal HTML component format with template-only markup, not React/Tailwind. Open them directly in a browser to see and click through each design (each also has its own light/dark toggle in Settings). **Do not copy their markup or the `support.js` runtime into the app.** The task is to recreate this look and behavior using the codebase's existing stack: Next.js App Router, TypeScript, Tailwind CSS, Radix primitives, `class-variance-authority`, and the existing `components/ui/*` primitives (Button, Card, Input, Modal, Badge, StatusBadge, Combobox, Command, Popover, BottomNav, PageHeader, etc.).

## Fidelity
**High-fidelity.** Colors, spacing, typography scale, and interaction behavior below should be followed closely. Exact copy/labels (all Indonesian) should match what's listed per screen — these are the same strings the current app already uses (from `lib/calc.ts`, existing components, and page copy), not placeholders.

## Design Mode switch (new)
Add a **"Gaya Tampilan"** (design mode) control to Settings (`app/(app)/settings/page.tsx`), in the same "Tampilan" card as the existing Terang/Gelap toggle — a second segmented control: **"Liquid Glass" / "Brutalism"**.
- Persist the choice the same way theme is persisted today (localStorage via a small React context/provider, mirroring `next-themes`' pattern — call it `DesignModeProvider`, default `"glass"`).
- Apply it as a `data-design-mode="glass" | "brutalist"` attribute on `<html>` or a top-level wrapper (same mechanism `next-themes` uses for `data-theme`/`class="dark"`), so no JS re-render is needed for the CSS to switch — pure CSS variable swap.
- Theme (light/dark) and design mode are independent toggles; both combinations of each mode (glass-light, glass-dark, brutalist-light, brutalist-dark) need their own token block — see below.
- No page reload, no layout remount — same DOM, different `data-*` attribute, same as the existing dark-mode toggle today.

## Design tokens

Implement as CSS custom properties in `app/globals.css`, replacing the current HSL shadcn tokens (or extending them — see Migration notes). Two themes, dark is default; toggle via the existing `next-themes` setup in `ThemeProvider.tsx`.

**Dark (default):**
```
--bg-base:      #05070d
--panel:        rgba(255,255,255,0.055)   /* glass fill */
--panel-strong: rgba(255,255,255,0.09)    /* nested chips / active states */
--panel-border: rgba(255,255,255,0.14)
--ink:          #f2f4fa
--ink-dim:      rgba(242,244,250,0.62)
--ink-faint:    rgba(242,244,250,0.38)
--accent:       #8fa4ff   (blue-violet)
--accent2:      #d0a8ff   (violet, used in gradients paired with --accent)
--success:      #5fe3a5
--warning:      #ffcf6b
--danger:       #ff8f96
--divider:      rgba(255,255,255,0.12)
--input-bg:     rgba(255,255,255,0.06)
--shadow:       rgba(0,0,0,0.5)
--scrim:        rgba(5,7,13,0.55)          /* command palette overlay */
--blob1..4:     #5b6bff, #22d3ee, #c084fc, #ec4899   /* background mesh */
```

**Light (toggle):**
```
--bg-base:      #eef1f8
--panel:        rgba(255,255,255,0.55)
--panel-strong: rgba(255,255,255,0.72)
--panel-border: rgba(255,255,255,0.85)
--ink:          #171a24
--ink-dim:      rgba(23,26,36,0.62)
--ink-faint:    rgba(23,26,36,0.4)
--accent:       #4f5fd9
--accent2:      #9457d6
--success:      #1f9d63
--warning:      #b8720a
--danger:       #c8434e
--divider:      rgba(23,26,36,0.1)
--input-bg:     rgba(255,255,255,0.65)
--shadow:       rgba(30,40,80,0.16)
--scrim:        rgba(200,210,230,0.5)
--blob1..4:     #a9b8ff, #a6e6f5, #e3c4ff, #ffc2e0
```

**Typography:** system font stack — `-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif` (already close to what Tailwind's default sans gives you; no new font files needed).

**Radii:** cards/panels 18–24px, pills/badges 999px (full), inputs 12–14px, nav item rows 14px.

**Shadows:** every glass panel uses `box-shadow: 0 6px 24px var(--shadow)` (small panels) or `0 12–30px 40–80px var(--shadow)` (sidebar, modals, command palette) plus `backdrop-filter: blur(18–30px)` + `-webkit-backdrop-filter`.

**Background mesh:** 4 fixed, absolutely-positioned circles (~300–480px), each a solid `--blobN` color, `filter: blur(90–115px)`, opacity 0.3–0.55, animated with a slow 18–28s `translate + scale` keyframe loop (two alternating keyframes, some `reverse`). Sits behind everything at `z-index: -1`, respects `prefers-reduced-motion` (animation should be disabled/paused).

## Screens

### 1. Login (`app/login/page.tsx`)
- Full-bleed backdrop (gradient mesh), centered glass card, max-width 400px, padding 40/32px, radius 28px.
- Contents: 52×52 rounded-16px logo mark (gradient `accent→accent2`, white "U" monogram) → "Untungin" title (26px/800) → subtitle "Masuk untuk kelola produk, pesanan, dan laporan untungmu." (14px, `--ink-dim`) → password field (label "Password", 48px input) → error text in `--danger` when empty submit → primary gradient button "Masuk" (48px, full width) → footer note "Sesi berlaku 7 hari di perangkat ini." (12px, `--ink-faint`, centered).
- Behavior: same as current `lib/auth.ts` single-password flow — submitting an empty password shows the inline error; a real submit posts to the existing session cookie logic, unchanged.

### 2. App shell (`app/(app)/layout.tsx`)
**Desktop (≥ ~1024px, use a `lg:` breakpoint):**
- Floating glass **sidebar**, 220px wide, own column with 20px outer margin, full height minus margin, radius 24px, padding 16px/10px. Contents top→bottom: logo mark + "Untungin" wordmark; nav list (see Nav items below); spacer; footer hint block (11px, `--ink-faint`): "⌘K Cari cepat" / "Esc Tutup panel".
- **Topbar** glass bar above content: page title (19px/800, from active nav label) on the left; a wide search-style button ("Cari atau jalankan perintah…" + a small "⌘K" chip on the right) that opens the command palette; theme toggle button ("Mode Terang"/"Mode Gelap" text, not an icon); small square avatar button ("U") that logs out.
- Nav items: Beranda (dashboard), Produk, Pesanan, Supplier, Pelanggan, Laporan, Atur (settings) — same 5 routes as today's `BottomNav.tsx` plus Supplier and Pelanggan surfaced directly (currently only reachable indirectly). Each item: two-letter monogram badge (30×30, rounded 9px — "Be", "Pr", "Pe", "Su", "Pl", "La", "At") + label. Active state: `--panel-strong` background, 1px inset border, gradient monogram badge, bold label; inactive: transparent bg, dimmed label/badge.

**Mobile (< ~1024px):**
- No sidebar. Topbar condenses: title + a small icon-only search button (opens command palette) + theme toggle + (logout button moves to Settings only).
- Bottom nav: fixed glass pill dock, centered, horizontally scrollable, same 7 nav items as icons-over-labels (monogram badge above 10px label). Replaces today's `BottomNav.tsx` visually but keeps its routing logic.

### 3. Command palette (global, all screens)
- Opens via ⌘K/Ctrl+K or the topbar search button/button; closes on Escape or backdrop click.
- Centered overlay ~14vh from top, max-width 520px, glass panel (`--panel-strong`, blur 30px), scrim behind it.
- Top: autofocused text input, no border except a 1px bottom divider, 52px tall, placeholder "Ketik perintah atau layar…".
- Below: filtered list of actions (plain text rows, 14px/600, `--ink`, rounded 12px, hover highlight): "Tambah Pesanan Baru", "Tambah Produk Baru", "Buka Beranda", "Buka Laporan", "Buka Pengaturan". Selecting one navigates and closes the palette.

### 4. Dashboard (`app/(app)/dashboard/page.tsx`)
Same data/queries as today (`lib/calc.ts` `totalPesanan`/`untungPesanan`, stok < 5 threshold), restyled:
- Hero glass card (full width): gradient tint (`accent`/`accent2` mixed at ~30%/24% into `--panel` via `color-mix`), label "Untung bulan ini" (13px/600 dim) → big number (38px/800) → "Dari pesanan lunas" caption.
- 3-col stat grid (2-col on mobile): "Omzet bulan ini", "Nilai Stok (HPP)", "Pesanan pending" — each a glass card, 12px dim label + 20px/800 value.
- 2-col quick actions: "Tambah Pesanan" / "Tambah Produk" glass cards, each with a 38×38 rounded-12px tinted "+" icon (accent-tinted for pesanan, success-tinted for produk) + bold label; clicking navigates to that screen.
- "Stok menipis" section: header + "Lihat semua" link (accent, links to Produk); list of glass rows, 3px warning-colored left border, product name + a pill badge "Sisa N" (warning-tinted). Empty state: centered "Semua stok aman" glass card.

### 5. Produk (`app/(app)/produk/page.tsx` + `ProdukManager.tsx`)
Split view (list pane + detail pane side-by-side on desktop; list-only or detail-only, toggled by selection, on mobile with a "‹ Semua produk" back link):
- **List pane** (340px desktop / full width mobile, glass, internal scroll): search input (placeholder "Cari produk…") → filter pills "Semua" / "Stok Menipis" → scrollable rows: product name (14px/700) + price (12px dim) on the left, a "Stok N" pill on the right (warning-tinted if stok < 5, success-tinted otherwise). Selected row gets `--panel-strong` bg + inset border.
- **Detail pane** (flex-1, glass, 22px padding): product name (22px/800) + "Supplier: {name}" caption; 2×2 stat grid (Harga Jual, Harga Modal, Margin % [success-colored], Stok) in `--panel-strong` tiles; action row: "Edit Produk" (outline) + "Hapus" (danger-tinted, no border). Empty state when nothing selected: centered "Pilih produk untuk melihat detail."
- Preserve all existing CRUD behavior from `ProdukManager.tsx`/`lib/actions/produk.ts` — this only changes the container from single-column cards + modal to split view; the add/edit form (today's bottom-sheet/dialog `Modal`) can now also render inline in the detail pane on desktop, or stay a modal triggered from a "+" button in the list pane header — your call, but keep the modal behavior for mobile.

### 6. Pesanan (`app/(app)/pesanan/page.tsx` + `PesananManager.tsx`)
Same split-view pattern:
- **List pane**: search ("Cari customer atau produk…") → status filter pills "Semua"/"Belum Bayar"/"Nyicil"/"Lunas" (reuse `STATUS_LIST`/`STATUS_LABEL` from `lib/calc.ts`) → rows: customer name + "{tanggal} · {totalFmt}" on the left, a status pill (color per `StatusBadge` mapping: belum_bayar=warning, nyicil=accent/info, lunas=success) on the right.
- **Detail pane**: customer name (20px/800) + date, status pill top-right; item list (plain rows: name × qty — subtotal; paket rows get an accent-tinted background + "nama + komponen list" caption) — reuse the existing dropship-tag / paket-tag treatment from `PesananCard` in `PesananManager.tsx`; total/untung summary row (border-top/bottom divider, total in `--ink`, untung in `--success`); "Pembayaran" section (uppercase label) listing each payment (`{tanggal} · {metode}` — amount) or "Belum ada pembayaran."; action row: "Kelola Pembayaran" (primary gradient) + "Edit" (outline).
- Keep all real logic (`createPesanan`/`updatePesanan`/`tambahPembayaran`/`tandaiLunas` etc. in `lib/actions/pesanan.ts` + `pembayaran.ts`) — only the shell/visual changes.

### 7. Supplier (`app/(app)/supplier/page.tsx` + `SupplierManager.tsx`)
Split view: list pane (search + rows: supplier name + "{N} produk") / detail pane (supplier name + a "Hubungi WA" pill-button linking to `https://wa.me/{number}`, success-tinted; below, "Produk dari supplier ini" list of that supplier's products with price). Empty state as elsewhere.

### 8. Pelanggan (`app/(app)/pelanggan/page.tsx` + `PelangganManager.tsx`)
Split view: list pane (search + rows: name + "{N} pesanan") / detail pane (name, phone or "Tanpa nomor HP"; 2-col stat tiles for Jumlah Pesanan / Total Belanja; "Riwayat pesanan" list of that customer's past orders with date + total).

### 9. Laporan (`app/(app)/laporan/page.tsx`, `LaporanChart.tsx`, `DateRangeFilter.tsx`)
- Range pills: "Bulan ini" / "3 Bulan" / "Tahun ini" (reuses `DateRangeFilter` logic).
- Glass card: "Untung periode ini" label + big total, then a bar chart — keep using Recharts (`LaporanChart.tsx`) but restyle bars to a `--accent → --accent2` vertical gradient with rounded tops, axis labels in `--ink-dim`, gridlines/tooltips using the glass tokens instead of the current flat colors.
- "Produk terlaris" list: ranked rows (numbered badge, product name, "{N} terjual").

### 10. Settings (`app/(app)/settings/page.tsx`, `ThemeToggle.tsx`)
Three stacked glass cards, max-width ~560px:
1. "Tampilan" — Terang/Gelap segmented toggle (wire to existing `ThemeToggle.tsx` / `next-themes`) **plus** the new "Gaya Tampilan" segmented toggle (Liquid Glass / Brutalism) described in "Design Mode switch" above, in the same card.
2. "Password Aplikasi" — password input + "Simpan Password" gradient button (same underlying action as today).
3. "Sesi" — session copy + "Keluar" danger-tinted logout button.

## Interactions & behavior
- **Command palette**: global `keydown` listener for `⌘/Ctrl+K` (toggle) and `Escape` (close); clicking the scrim closes, clicking inside the panel does not.
- **Theme toggle**: instant switch, no page reload; persist via `next-themes` (localStorage) same as today.
- **Split-view selection**: selecting a list row shows its detail; on mobile, selecting a row swaps the pane (list → detail) with a "‹ back" link; deep-linking via `?id=` query param recommended so back/forward and refresh keep the selection.
- **Responsive breakpoint**: single breakpoint around `1024px` (Tailwind `lg:`) toggling sidebar+split-panes vs. bottom-nav+single-pane. Use CSS/Tailwind responsive classes, not JS resize listeners.
- **Reduced motion**: background blob animation and any transitions should respect `prefers-reduced-motion: reduce`.
- All existing form validation, server actions, `revalidatePath` calls, and `ActionResult` patterns are unchanged — this is a visual/layout redesign only.

## State management
No new global state beyond what's already in each `*Manager.tsx` (modal-open flags, editing target, filters, search query). Add:
- A "selected id" per split-view screen (currently modal-driven "editing" state can double as this, or add a dedicated `selectedId` synced to `?id=` in the URL).
- Command palette open/query state (local to the new `CommandPalette.tsx`, or lifted into the layout).
- Theme state — already handled by `next-themes`; just change the default and the token values it flips.

## Design references (importable, don't ship as-is)
- `design-reference.html` (open with `support.js` alongside it in the same folder) — full click-through prototype covering all 10 screens above, both themes, and the responsive behavior described. Resize the browser window to see the mobile layout (breakpoint ~860px in the prototype).

## Assets
No new image/icon assets — the design deliberately avoids drawn icons in favor of two-letter monogram badges for nav items (see Screens §2). No logo file exists yet beyond the "U" monogram; `public/logo-source.png` already in the repo can replace it if desired.

## Migration notes for `app/globals.css` / `tailwind.config.ts`
- Current tokens are HSL vars consumed as `hsl(var(--x))` through Tailwind semantic classes (`bg-primary`, `text-muted`, etc.) per `tailwind.config.ts`. The new tokens above are RGBA/hex, several with translucency baked in — either convert them to the existing HSL-channel convention, or (simpler) add a parallel set of raw CSS vars (`--panel`, `--ink`, etc.) and matching Tailwind color entries (`panel`, `panel-border`, `ink`, `ink-dim`, `accent`, `accent2`, …) pointing straight at them, then migrate class-by-class (`bg-card` → `bg-panel backdrop-blur-xl border border-panel-border`, etc.) rather than trying to force glass into the old solid-surface token names.
- `backdrop-filter: blur()` needs `-webkit-backdrop-filter` alongside it for Safari.
- `color-mix(in srgb, …)` (used for tinted badges/hero gradients) is supported in all current evergreen browsers; no polyfill needed.

## Brutalist mode — tokens

Scope every rule below under `[data-design-mode="brutalist"]` in `app/globals.css` (or a `.brutalist` class on `<html>`), same pairing pattern as `.dark` today.

**Brutalist dark (default within this mode):**
```
--bg-base:      #050505
--panel:        #ffffff   /* flat, opaque — no blur */
--panel-ink:    #050505
--panel-dim:    rgba(5,5,5,0.62)
--panel-faint:  rgba(5,5,5,0.4)
--ink:          #f5f5f0   /* text directly on --bg-base, not inside a panel */
--ink-dim:      rgba(245,245,240,0.65)
--border:       #050505
--shadow:       #ffe600   /* hard offset shadow color, no blur */
--accent:       #ffe600
--accent-flip:  #f5f5f0   /* used for the "U" logo mark's own background */
--success:      #00c853
--warning:      #ff9100
--danger:       #ff3b30
--input-bg:     #ffffff
--scrim:        rgba(0,0,0,0.75)
```
**Brutalist light:**
```
--bg-base:      #f2f0e8
--panel:        #050505
--panel-ink:    #f2f0e8
--panel-dim:    rgba(242,240,232,0.65)
--ink:          #0a0a0a
--ink-dim:      rgba(10,10,10,0.65)
--border:       #050505
--shadow:       #ff3b30
--accent:       #ff3b30
--accent-flip:  #f2f0e8
--success:      #00a651
--warning:      #ff9100
--danger:       #ff3b30
--input-bg:     #050505
--scrim:        rgba(0,0,0,0.55)
```
Key rule throughout: text sitting on `--panel` uses `--panel-ink`/`--panel-dim`; text sitting directly on `--bg-base` (inset tiles, item rows inside a detail pane) uses `--ink`/`--ink-dim` instead — the two are swapped between panel and page and must not be crossed (this exact bug — black text on black background — is what the reference prototype hit and fixed; keep the two token pairs distinct in the real implementation too).

**Shape/type differences from glass mode** (apply via a `brutalist:` Tailwind variant or a `[data-design-mode="brutalist"]` scoped rule):
- Border radius: `0` everywhere (cards, buttons, inputs, pills, nav items) — glass mode's 12–28px radii all collapse to square corners.
- Borders: `3–4px solid var(--border)` on every panel/card/button (glass mode has thin 1px hairlines or none).
- Shadows: hard, no blur — `Npx Npx 0 var(--shadow)` (glass mode uses soft blurred shadows + `backdrop-filter`). No `backdrop-filter` at all in this mode.
- Typography: headings/labels/buttons/nav — condensed sans, uppercase, heavy weight (`font-family: 'Arial Narrow','Helvetica Neue Condensed',Arial,sans-serif; font-weight:900; text-transform:uppercase`). Numbers/prices/dates/ids — monospace (`ui-monospace, 'SF Mono', 'Roboto Mono', monospace`), not uppercase.
- Motion: no ambient background animation (glass mode's floating blurred blobs become a few flat, static, rotated solid-color rectangles behind the content — decorative only, no blur, no motion). Buttons/cards/nav items get a hover "glitch": `transform: translate(-3px,-3px)` + shadow offset growing from e.g. `5px 5px 0` to `8px 8px 0` on hover, snappy `transition: transform .08s, box-shadow .08s` (no ease/bounce).
- Status/stock pills: rectangular tags with a 2px border, solid background (no `color-mix` translucency), text always high-contrast against the tag's own fill (not against the page).

## Design references (importable, don't ship as-is)
- `design-reference.html` (Liquid Glass) and `design-reference-brutalist.html` (Brutalist) — open each with `support.js` alongside it in the same folder. Both are full click-through prototypes covering all 10 screens, both themes (light/dark) of that mode, and the responsive behavior described. Resize the browser window to see the mobile layout (breakpoint ~860px in both prototypes). The brutalist prototype's Tweaks panel also exposes an "accent color" swatch (yellow/red/green/blue) if you want to preview alternate brutalist accent punches before deciding.
