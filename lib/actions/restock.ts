"use server";

import type { ActionResult } from "@/lib/actions/supplier";
import type { ServiceResult } from "@/lib/services/types";
import { restockProduk as restockProdukService } from "@/lib/services/restock";
import { revalidateRestockPaths } from "@/lib/services/revalidate";

function toActionResult(r: ServiceResult<unknown>): ActionResult {
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

export async function restockProduk(formData: FormData): Promise<ActionResult> {
  const result = await restockProdukService({
    produkId: String(formData.get("produkId") ?? ""),
    qty: formData.get("qty"),
    hargaBeli: formData.get("hargaBeli"),
    tanggal: String(formData.get("tanggal") ?? ""),
  });
  if (result.ok) revalidateRestockPaths();
  return toActionResult(result);
}
