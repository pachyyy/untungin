/** Margin percent of a product: (jual - modal) / modal * 100. Returns 0 if modal <= 0. */
export function marginPersen(hargaModal: number, hargaJual: number): number {
  if (!hargaModal || hargaModal <= 0) return 0;
  return ((hargaJual - hargaModal) / hargaModal) * 100;
}

export const STATUS_LIST = ["baru", "diproses", "dikirim", "selesai"] as const;
export type Status = (typeof STATUS_LIST)[number];

export const STATUS_LABEL: Record<Status, string> = {
  baru: "Baru",
  diproses: "Diproses",
  dikirim: "Dikirim",
  selesai: "Selesai",
};

/** A status counts as "committed" (stock has been deducted) once shipped or completed. */
export function isCommitted(status: string): boolean {
  return status === "dikirim" || status === "selesai";
}

type ItemLike = { jumlah: number; hargaSaat: number; produk: { hargaModal: number } };
type PaketKomponenLike = { pcs: number; produk: { hargaModal: number } };
type PaketLike = { harga: number; komponen: PaketKomponenLike[] };
type PesananLike = { items: ItemLike[]; pakets?: PaketLike[] };

/** Modal cost of a paket = sum(komponen.pcs * produk.hargaModal). */
export function modalPaket(paket: PaketLike): number {
  return paket.komponen.reduce(
    (sum, k) => sum + k.pcs * k.produk.hargaModal,
    0
  );
}

/** Total order value = single items (hargaSaat * jumlah) + pakets (harga). */
export function totalPesanan(p: PesananLike): number {
  const items = p.items.reduce((s, it) => s + it.hargaSaat * it.jumlah, 0);
  const pakets = (p.pakets ?? []).reduce((s, pk) => s + pk.harga, 0);
  return items + pakets;
}

/**
 * Estimated profit:
 * - single item: (hargaSaat - produk.hargaModal) * jumlah
 * - paket: harga - sum(komponen.pcs * produk.hargaModal)
 */
export function untungPesanan(p: PesananLike): number {
  const items = p.items.reduce(
    (s, it) => s + (it.hargaSaat - it.produk.hargaModal) * it.jumlah,
    0
  );
  const pakets = (p.pakets ?? []).reduce(
    (s, pk) => s + (pk.harga - modalPaket(pk)),
    0
  );
  return items + pakets;
}
