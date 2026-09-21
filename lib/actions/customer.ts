"use server";

import type { ActionResult } from "@/lib/actions/supplier";
import type { ServiceResult } from "@/lib/services/types";
import * as customerService from "@/lib/services/customer";
import { revalidateCustomerWrite, revalidateCustomerDelete } from "@/lib/services/revalidate";

function toActionResult(r: ServiceResult<unknown>): ActionResult {
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

export async function createCustomer(formData: FormData): Promise<ActionResult> {
  const result = await customerService.createCustomer({
    nama: String(formData.get("nama") ?? ""),
    noHp: String(formData.get("noHp") ?? ""),
    catatan: String(formData.get("catatan") ?? ""),
  });
  if (result.ok) revalidateCustomerWrite();
  return toActionResult(result);
}

export async function updateCustomer(formData: FormData): Promise<ActionResult> {
  const result = await customerService.updateCustomer({
    id: String(formData.get("id") ?? ""),
    nama: String(formData.get("nama") ?? ""),
    noHp: String(formData.get("noHp") ?? ""),
    catatan: String(formData.get("catatan") ?? ""),
  });
  if (result.ok) revalidateCustomerWrite();
  return toActionResult(result);
}

export async function deleteCustomer(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const result = await customerService.deleteCustomer(id);
  if (result.ok) revalidateCustomerDelete();
  return toActionResult(result);
}
