"use server";

import type { ActionResult } from "@/lib/actions/supplier";
import * as strukService from "@/lib/services/struk";
import { revalidateStrukWrite } from "@/lib/services/revalidate";

export async function updateStrukSettingAction(formData: FormData): Promise<ActionResult> {
  const str = (key: string) => String(formData.get(key) ?? "");
  const result = await strukService.updateStrukSetting({
    namaToko: str("namaToko"),
    logo: str("logo") || null,
    tagline: str("tagline"),
    alamat: str("alamat"),
    noWa: str("noWa"),
    sosmed: str("sosmed"),
    infoPembayaran: str("infoPembayaran"),
    footer: str("footer"),
    prefixNota: str("prefixNota"),
    ukuranDefault: str("ukuranDefault"),
    tampilkanStempel: str("tampilkanStempel") === "1",
    tampilkanKomponenPaket: str("tampilkanKomponenPaket") === "1",
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidateStrukWrite();
  return { ok: true };
}
