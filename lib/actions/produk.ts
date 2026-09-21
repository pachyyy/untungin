"use server";

import type { ActionResult } from "@/lib/actions/supplier";
import type { ServiceResult } from "@/lib/services/types";
import * as produkService from "@/lib/services/produk";
import { revalidateProdukWrite, revalidateProdukDelete } from "@/lib/services/revalidate";

function toActionResult(r: ServiceResult<unknown>): ActionResult {
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

function readProdukForm(formData: FormData) {
  return {
    nama: String(formData.get("nama") ?? ""),
    hargaModal: formData.get("hargaModal"),
    stok: formData.get("stok"),
    supplierId: String(formData.get("supplierId") ?? ""),
    supplierNama: String(formData.get("supplierNama") ?? ""),
    supplierKontak: String(formData.get("supplierKontak") ?? ""),
  };
}

export async function createProduk(formData: FormData): Promise<ActionResult> {
  const result = await produkService.createProduk(readProdukForm(formData));
  if (result.ok) revalidateProdukWrite();
  return toActionResult(result);
}

export async function updateProduk(formData: FormData): Promise<ActionResult> {
  const result = await produkService.updateProduk({
    id: String(formData.get("id") ?? ""),
    ...readProdukForm(formData),
  });
  if (result.ok) revalidateProdukWrite();
  return toActionResult(result);
}

export async function deleteProduk(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const result = await produkService.deleteProduk(id);
  if (result.ok) revalidateProdukDelete();
  return toActionResult(result);
}
