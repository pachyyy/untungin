/** Margin percent of a product: (jual - modal) / modal * 100. Returns 0 if modal <= 0. */
export function marginPersen(hargaModal: number, hargaJual: number): number {
  if (!hargaModal || hargaModal <= 0) return 0;
  return ((hargaJual - hargaModal) / hargaModal) * 100;
}

export const STATUS_LIST = ["belum_bayar", "nyicil", "lunas"] as const;
export type Status = (typeof STATUS_LIST)[number];

export const STATUS_LABEL: Record<Status, string> = {
  belum_bayar: "Belum Bayar",
  nyicil: "Nyicil",
  lunas: "Lunas",
};

/**
 * Priority order for sorting pesanan lists (unpaid first). Mirrors
 * Pesanan.statusRank on the DB row — that column exists only so Postgres can
 * sort by this order (it can't sort a String column by an arbitrary
 * priority), so this map is the single source of truth: every site that
 * writes `status` must also write `statusRank: STATUS_RANK[status]` to keep
 * the two in sync.
 */
export const STATUS_RANK: Record<Status, number> = {
  belum_bayar: 0,
  nyicil: 1,
  lunas: 2,
};

type ItemLike = { jumlah: number; hargaSaat: number; modalSaat: number };
type PaketKomponenLike = { pcs: number; modalSaat: number };
type PaketLike = { harga: number; komponen: PaketKomponenLike[] };
type PesananLike = { items: ItemLike[]; pakets?: PaketLike[] };
type PembayaranLike = { jumlah: number };
type PesananWithPembayaranLike = PesananLike & { pembayaran: PembayaranLike[] };

/** Modal cost of a paket = sum(komponen.pcs * modalSaat). */
export function modalPaket(paket: PaketLike): number {
  return paket.komponen.reduce((sum, k) => sum + k.pcs * k.modalSaat, 0);
}

/** Modal (HPP) of a whole order: items + paket components, from the snapshotted cost. */
export function modalPesanan(p: PesananLike): number {
  const items = p.items.reduce((s, it) => s + it.modalSaat * it.jumlah, 0);
  const pakets = (p.pakets ?? []).reduce((s, pk) => s + modalPaket(pk), 0);
  return items + pakets;
}

// Deliberately narrower than PesananLike: totalPesanan only ever reads
// hargaSaat/jumlah/harga, never modalSaat or paket komponen, so a pesanan
// list view can select just these fields (skipping the modalSaat column and
// the whole komponen/produk join) without losing type compatibility here —
// any PesananLike still satisfies this too, since it has strictly more.
type TotalItemLike = { jumlah: number; hargaSaat: number };
type TotalPaketLike = { harga: number };
type TotalPesananLike = { items: TotalItemLike[]; pakets?: TotalPaketLike[] };

/** Total order value = single items (hargaSaat * jumlah) + pakets (harga). */
export function totalPesanan(p: TotalPesananLike): number {
  const items = p.items.reduce((s, it) => s + it.hargaSaat * it.jumlah, 0);
  const pakets = (p.pakets ?? []).reduce((s, pk) => s + pk.harga, 0);
  return items + pakets;
}

/**
 * Estimated profit at the asking price (hargaSaat), not necessarily what was
 * actually received — an order can be marked Lunas while underpaid (discount
 * or write-off via tandaiLunas) or overpaid, in which case realized profit
 * differs from this. This is what the order form/list show per order; the
 * dashboard and laporan compute realized profit from actual payments instead
 * (see untungRealisasi).
 * - single item: (hargaSaat - modalSaat) * jumlah
 * - paket: harga - sum(komponen.pcs * modalSaat)
 */
export function untungPesanan(p: PesananLike): number {
  const items = p.items.reduce(
    (s, it) => s + (it.hargaSaat - it.modalSaat) * it.jumlah,
    0
  );
  const pakets = (p.pakets ?? []).reduce(
    (s, pk) => s + (pk.harga - modalPaket(pk)),
    0
  );
  return items + pakets;
}

/** Sum of payments actually received against an order (not the asking price). */
export function totalDibayar(p: PesananWithPembayaranLike): number {
  return p.pembayaran.reduce((s, b) => s + b.jumlah, 0);
}

/**
 * Realized profit: money actually received minus the snapshotted cost of
 * what was sold. Unlike untungPesanan(), this reflects a discount/write-off
 * (tandaiLunas on an underpaid order — realized profit is lower than the
 * asking-price estimate) or an overpayment (realized profit is higher). Can
 * be negative. This is what the dashboard and laporan report as profit.
 */
export function untungRealisasi(p: PesananWithPembayaranLike): number {
  return totalDibayar(p) - modalPesanan(p);
}
