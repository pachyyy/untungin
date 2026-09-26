"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/supplier";
import * as strukService from "@/lib/services/struk";

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

  revalidatePath("/settings");
  revalidatePath("/settings/struk");
  revalidatePath("/pesanan");
  return { ok: true };
}
