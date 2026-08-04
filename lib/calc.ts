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

type ItemLike = { jumlah: number; hargaSaat: number; modalSaat: number };
type PaketKomponenLike = { pcs: number; modalSaat: number };
type PaketLike = { harga: number; komponen: PaketKomponenLike[] };
type PesananLike = { items: ItemLike[]; pakets?: PaketLike[] };

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

/** Total order value = single items (hargaSaat * jumlah) + pakets (harga). */
export function totalPesanan(p: PesananLike): number {
  const items = p.items.reduce((s, it) => s + it.hargaSaat * it.jumlah, 0);
  const pakets = (p.pakets ?? []).reduce((s, pk) => s + pk.harga, 0);
  return items + pakets;
}

/**
 * Estimated profit at the sale price (not what was actually received — see
 * modalPesanan()/syncPesanan() for the ledger-posted profit, which is based on
 * actual payments and can differ on overpayment or a forced Lunas).
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
