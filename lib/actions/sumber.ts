import type { SumberDana } from "@/lib/services/kas";

/**
 * Reads the "how was this paid" fields the web forms send for a stock
 * purchase (bayarRekening / bayarTunai / tanpaKas). Fields the form didn't
 * send stay `undefined`, which the service treats as "client predates
 * pockets". Deliberately not a "use server" file — it's a plain helper the
 * action modules import.
 */
export function readSumber(formData: FormData): SumberDana {
  const get = (k: string) => {
    const v = formData.get(k);
    return v === null ? undefined : String(v);
  };
  return {
    rekening: get("bayarRekening"),
    tunai: get("bayarTunai"),
    tanpaKas: get("tanpaKas"),
  };
}
