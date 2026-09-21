"use server";

import type { ActionResult } from "@/lib/actions/supplier";
import type { ServiceResult } from "@/lib/services/types";
import * as pesananService from "@/lib/services/pesanan";
import { revalidatePesananPaths } from "@/lib/services/revalidate";

function toActionResult(r: ServiceResult<unknown>): ActionResult {
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

/** JSON.parse a FormData field, swallowing a parse failure — the service's
 * normalizeItems/normalizePakets treat a non-array as "no lines" the same
 * way, so returning `undefined` here (rather than `[]`) is equivalent and
 * avoids duplicating that fallback in two places. */
function parseJsonField(raw: FormDataEntryValue | null): unknown {
  try {
    return JSON.parse(String(raw ?? "[]"));
  } catch {
    return undefined;
  }
}

export async function createPesanan(formData: FormData): Promise<ActionResult> {
  const result = await pesananService.createPesanan({
    namaCustomer: String(formData.get("namaCustomer") ?? ""),
    noHp: String(formData.get("noHp") ?? ""),
    items: parseJsonField(formData.get("items")),
    pakets: parseJsonField(formData.get("pakets")),
  });
  if (result.ok) revalidatePesananPaths();
  return toActionResult(result);
}

export async function updatePesanan(formData: FormData): Promise<ActionResult> {
  const result = await pesananService.updatePesanan({
    id: String(formData.get("id") ?? ""),
    namaCustomer: String(formData.get("namaCustomer") ?? ""),
    noHp: String(formData.get("noHp") ?? ""),
    items: parseJsonField(formData.get("items")),
    pakets: parseJsonField(formData.get("pakets")),
  });
  if (result.ok) revalidatePesananPaths();
  return toActionResult(result);
}

export async function deletePesanan(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const result = await pesananService.deletePesanan(id);
  if (result.ok) revalidatePesananPaths();
  return toActionResult(result);
}
