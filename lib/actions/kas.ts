"use server";

import type { ActionResult } from "@/lib/actions/supplier";
import type { ServiceResult } from "@/lib/services/types";
import * as kasService from "@/lib/services/kas";
import { revalidateKasPaths } from "@/lib/services/revalidate";

function toActionResult(r: ServiceResult<unknown>): ActionResult {
  if (r.ok) {
    revalidateKasPaths();
    return { ok: true };
  }
  return { ok: false, error: r.error };
}

export async function setSaldoAction(formData: FormData): Promise<ActionResult> {
  return toActionResult(
    await kasService.setSaldo({
      modal: formData.get("modal"),
      saldo: formData.get("saldo"),
    })
  );
}

export async function tarikSaldoAction(formData: FormData): Promise<ActionResult> {
  return toActionResult(
    await kasService.tarikSaldo({
      jumlah: formData.get("jumlah"),
      catatan: String(formData.get("catatan") ?? ""),
      kantong: formData.get("kantong") ?? undefined,
    })
  );
}

export async function pindahKantongAction(formData: FormData): Promise<ActionResult> {
  const arah =
    String(formData.get("arah") ?? "") === "tunai_ke_rekening" ? "tunai_ke_rekening" : "rekening_ke_tunai";
  return toActionResult(await kasService.pindahKantong({ arah, jumlah: formData.get("jumlah") }));
}

export async function setKantongAction(formData: FormData): Promise<ActionResult> {
  return toActionResult(
    await kasService.setKantong({
      rekening: formData.get("rekening"),
      tunai: formData.get("tunai"),
    })
  );
}

export async function transferKasAction(formData: FormData): Promise<ActionResult> {
  const arah = String(formData.get("arah") ?? "") === "modal_ke_saldo" ? "modal_ke_saldo" : "saldo_ke_modal";
  return toActionResult(await kasService.transferKas({ arah, jumlah: formData.get("jumlah") }));
}
