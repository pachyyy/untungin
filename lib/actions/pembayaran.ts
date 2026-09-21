"use server";

import type { ActionResult } from "@/lib/actions/supplier";
import type { ServiceResult } from "@/lib/services/types";
import * as pembayaranService from "@/lib/services/pembayaran";
import { revalidatePembayaranPaths } from "@/lib/services/revalidate";

function toActionResult(r: ServiceResult<unknown>): ActionResult {
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

export async function tambahPembayaran(formData: FormData): Promise<ActionResult> {
  const result = await pembayaranService.tambahPembayaran({
    pesananId: String(formData.get("pesananId") ?? ""),
    tanggal: String(formData.get("tanggal") ?? ""),
    metode: String(formData.get("metode") ?? ""),
    jumlah: formData.get("jumlah"),
    jenis: String(formData.get("jenis") ?? "cicilan"),
  });
  if (result.ok) revalidatePembayaranPaths();
  return toActionResult(result);
}

export async function hapusPembayaran(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const result = await pembayaranService.hapusPembayaran(id);
  if (result.ok) revalidatePembayaranPaths();
  return toActionResult(result);
}

export async function tandaiLunas(formData: FormData): Promise<ActionResult> {
  const pesananId = String(formData.get("pesananId") ?? "");
  const result = await pembayaranService.tandaiLunas(pesananId);
  if (result.ok) revalidatePembayaranPaths();
  return toActionResult(result);
}
