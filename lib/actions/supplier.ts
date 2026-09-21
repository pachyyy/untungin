"use server";

import type { ServiceResult } from "@/lib/services/types";
import * as supplierService from "@/lib/services/supplier";
import { revalidateSupplierWrite, revalidateSupplierDelete } from "@/lib/services/revalidate";

export type ActionResult = { ok: boolean; error?: string };

function toActionResult(r: ServiceResult<unknown>): ActionResult {
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

export async function createSupplier(formData: FormData): Promise<ActionResult> {
  const result = await supplierService.createSupplier({
    nama: String(formData.get("nama") ?? ""),
    kontak: String(formData.get("kontak") ?? ""),
  });
  if (result.ok) revalidateSupplierWrite();
  return toActionResult(result);
}

export async function updateSupplier(formData: FormData): Promise<ActionResult> {
  const result = await supplierService.updateSupplier({
    id: String(formData.get("id") ?? ""),
    nama: String(formData.get("nama") ?? ""),
    kontak: String(formData.get("kontak") ?? ""),
  });
  if (result.ok) revalidateSupplierWrite();
  return toActionResult(result);
}

export async function deleteSupplier(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const result = await supplierService.deleteSupplier(id);
  if (result.ok) revalidateSupplierDelete();
  return toActionResult(result);
}
