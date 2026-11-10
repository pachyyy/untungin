"use client";

import { Input, Label } from "@/components/ui/Input";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * "Bayar dari mana?" for a stock purchase: Rekening, Tunai, or a split of the
 * two — plus, where it makes sense, a last option meaning no money moved
 * (stock already owned / a count correction). The split always adds up to the
 * purchase total: you type the Rekening part and Tunai is the remainder.
 */

export type SumberMode = "rekening" | "tunai" | "campuran" | "tanpa" | "";
export type SumberValue = { mode: SumberMode; rekening: string };

export const SUMBER_DEFAULT: SumberValue = { mode: "rekening", rekening: "" };
/** For flows where silently assuming a source would be wrong (a stok raise
 * could be a purchase or a correction): nothing is preselected. */
export const SUMBER_KOSONG: SumberValue = { mode: "", rekening: "" };

/** Resolves a value against the purchase total. `error` is set when the
 * choice isn't submittable yet. */
export function resolveSumber(
  total: number,
  v: SumberValue
): { rekening: number; tunai: number; tanpaKas: boolean; error?: string } {
  if (v.mode === "tanpa") return { rekening: 0, tunai: 0, tanpaKas: true };
  if (v.mode === "rekening") return { rekening: total, tunai: 0, tanpaKas: false };
  if (v.mode === "tunai") return { rekening: 0, tunai: total, tanpaKas: false };
  if (v.mode === "campuran") {
    const r = Math.floor(Number(v.rekening || "0"));
    if (!Number.isFinite(r) || r < 0 || r > total) {
      return {
        rekening: 0,
        tunai: 0,
        tanpaKas: false,
        error: `Bagian rekening harus antara 0 dan ${formatRupiah(total)}.`,
      };
    }
    return { rekening: r, tunai: total - r, tanpaKas: false };
  }
  return { rekening: 0, tunai: 0, tanpaKas: false, error: "Pilih sumber dana dulu." };
}

/** Writes the choice into the FormData the server actions read (readSumber). */
export function appendSumber(fd: FormData, total: number, v: SumberValue): void {
  const r = resolveSumber(total, v);
  if (r.tanpaKas) {
    fd.set("tanpaKas", "1");
    return;
  }
  fd.set("bayarRekening", String(r.rekening));
  fd.set("bayarTunai", String(r.tunai));
}

export function SumberDana({
  total,
  value,
  onChange,
  tanpaLabel,
  label = "Dibayar dari",
}: {
  total: number;
  value: SumberValue;
  onChange: (v: SumberValue) => void;
  /** Label of the "no money moved" option; omit to not offer it. */
  tanpaLabel?: string;
  label?: string;
}) {
  const options: { mode: SumberMode; label: string }[] = [
    { mode: "rekening", label: "Rekening" },
    { mode: "tunai", label: "Tunai" },
    { mode: "campuran", label: "Campuran" },
    ...(tanpaLabel ? [{ mode: "tanpa" as const, label: tanpaLabel }] : []),
  ];
  const r = resolveSumber(total, value);

  return (
    <div className="space-y-2 rounded-[14px] bg-panel-strong p-3">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="mb-0 text-xs">{label}</Label>
        {value.mode !== "tanpa" && (
          <span className="text-data text-xs text-glass-ink-dim">
            Total {formatRupiah(total)}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.mode}
            type="button"
            onClick={() =>
              onChange({
                mode: o.mode,
                // Starting a split at 0 / total would be a guess; start empty.
                rekening: o.mode === "campuran" ? value.rekening : "",
              })
            }
            className={cn(
              "rounded-[12px] border px-3 py-2 text-xs font-semibold transition-colors",
              value.mode === o.mode
                ? "border-glass-accent bg-glass-accent/10 text-glass-accent"
                : "border-panel-border bg-panel text-glass-ink-dim"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      {value.mode === "campuran" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Dari rekening</Label>
            <Input
              className="h-10"
              inputMode="numeric"
              placeholder="0"
              value={value.rekening}
              onChange={(e) =>
                onChange({ mode: "campuran", rekening: e.target.value.replace(/[^0-9]/g, "") })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Dari tunai (sisanya)</Label>
            <div className="text-data flex h-10 items-center rounded-[12px] border border-panel-border bg-panel px-3 text-sm text-glass-ink">
              {r.error ? "—" : formatRupiah(r.tunai)}
            </div>
          </div>
        </div>
      )}

      {value.mode === "campuran" && r.error && (
        <p className="text-xs text-glass-danger">{r.error}</p>
      )}
      {value.mode === "tanpa" && (
        <p className="text-xs text-glass-ink-dim">Tidak ada uang yang dikurangi dari modal.</p>
      )}
    </div>
  );
}
