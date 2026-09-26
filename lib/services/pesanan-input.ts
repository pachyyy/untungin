/**
 * Validation/normalization for the item and paket line arrays submitted on
 * an order. Split into two layers so both callers share the same rules:
 *
 *   - `normalizeItems`/`normalizePakets` take an already-parsed `unknown`
 *     value (a JSON API body already has a real array; the web's FormData
 *     JSON string just needs `JSON.parse` first) and do the actual
 *     validation/coercion.
 *   - `parseItemsField`/`parsePaketsField` are the FormData-specific
 *     wrapper: parse the JSON string, then hand off to the normalizer.
 *
 * Malformed input is dropped silently rather than throwing, matching the
 * original behavior: a `JSON.parse` failure, a non-array value, or a single
 * bad entry anywhere in the array (e.g. `null`, whose `.produkId` access
 * would throw) all collapse to `[]` for the whole array, not just the bad
 * entry. That's arguably too coarse, but it's pre-existing behavior and this
 * extraction is not the place to change it.
 */

export const KETERANGAN_MAX = 200;

/**
 * An optional per-line note. `undefined` (the key is absent from the raw
 * entry) is deliberately distinct from `null` (sent but empty): an installed
 * APK built before this field existed never sends the key, and updatePesanan
 * treats `undefined` as "keep what the line already had" instead of wiping it.
 */
function normalizeKeterangan(entry: unknown): string | null | undefined {
  if (!entry || typeof entry !== "object" || !("keterangan" in entry)) return undefined;
  const v = (entry as { keterangan?: unknown }).keterangan;
  if (v === null || v === undefined) return null;
  return String(v).trim().slice(0, KETERANGAN_MAX) || null;
}

// produkId set = stock item (decrements Produk.stok). produkId null = dropship
// item typed directly on the order: namaManual + modalManual carry what a
// Produk record would otherwise supply, and no stock is touched.
export type ItemInput = {
  produkId: string | null;
  namaManual: string | null;
  jumlah: number;
  hargaSaat: number;
  modalManual: number;
  keterangan: string | null | undefined;
};
export type PaketKomponenInput = { produkId: string; pcs: number };
export type PaketInput = {
  nama: string;
  harga: number;
  keterangan: string | null | undefined;
  komponen: PaketKomponenInput[];
};

export function normalizeItems(raw: unknown): ItemInput[] {
  try {
    if (!Array.isArray(raw)) return [];
    // raw is untrusted input (parsed JSON); every field below is re-validated.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (raw as any[])
      .map((it) => {
        const produkId = String(it.produkId ?? "").trim() || null;
        return {
          produkId,
          namaManual: produkId ? null : String(it.namaManual ?? "").trim() || null,
          jumlah: Math.floor(Number(it.jumlah)),
          hargaSaat: Math.floor(Number(it.hargaSaat)),
          modalManual: Math.floor(Number(it.modalManual)),
          keterangan: normalizeKeterangan(it),
        };
      })
      .filter((it) => {
        if (!Number.isFinite(it.jumlah) || it.jumlah <= 0) return false;
        if (!Number.isFinite(it.hargaSaat) || it.hargaSaat <= 0) return false;
        if (it.produkId) return true;
        return (
          !!it.namaManual &&
          Number.isFinite(it.modalManual) &&
          it.modalManual >= 0
        );
      });
  } catch {
    return [];
  }
}

export function normalizePakets(raw: unknown): PaketInput[] {
  try {
    if (!Array.isArray(raw)) return [];
    // raw is untrusted input (parsed JSON); every field below is re-validated.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (raw as any[])
      .map((pk) => ({
        nama: String(pk.nama ?? "").trim() || "Paket",
        harga: Math.floor(Number(pk.harga)),
        keterangan: normalizeKeterangan(pk),
        komponen: Array.isArray(pk.komponen)
          ? pk.komponen
              .map((k: unknown) => {
                const kk = k as { produkId?: unknown; pcs?: unknown };
                return {
                  produkId: String(kk.produkId ?? ""),
                  pcs: Math.floor(Number(kk.pcs)),
                };
              })
              .filter(
                (k: PaketKomponenInput) =>
                  k.produkId && Number.isFinite(k.pcs) && k.pcs > 0
              )
          : [],
      }))
      .filter(
        (pk) =>
          Number.isFinite(pk.harga) && pk.harga > 0 && pk.komponen.length > 0
      );
  } catch {
    return [];
  }
}

/** FormData entry point: parses the JSON string field, then normalizes. */
export function parseItemsField(raw: FormDataEntryValue | null): ItemInput[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw ?? "[]"));
  } catch {
    return [];
  }
  return normalizeItems(parsed);
}

/** FormData entry point: parses the JSON string field, then normalizes. */
export function parsePaketsField(raw: FormDataEntryValue | null): PaketInput[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw ?? "[]"));
  } catch {
    return [];
  }
  return normalizePakets(parsed);
}
