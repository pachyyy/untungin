"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/supplier";
import * as deviceService from "@/lib/services/devices";

/** Distinct from ActionResult (not imported as-is) because this one has to
 * carry the generated code back to the caller — it's shown to the owner
 * exactly once, here, since only its hash is ever stored. */
export type GenerateEnrollCodeResult =
  | { ok: true; code: string; expiresAt: string }
  | { ok: false; error: string };

export async function generateEnrollCodeAction(
  formData: FormData
): Promise<GenerateEnrollCodeResult> {
  const nama = String(formData.get("nama") ?? "");
  const role = String(formData.get("role") ?? "staff") === "owner" ? "owner" : "staff";

  const result = await deviceService.createEnrollCode({ nama, role });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/settings");
  return { ok: true, code: result.data.code, expiresAt: result.data.expiresAt };
}

export async function revokeDeviceAction(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const result = await deviceService.revokeDevice(id);
  if (result.ok) revalidatePath("/settings");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
