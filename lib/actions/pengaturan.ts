"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PENGATURAN_KEYS, syncPesanan } from "@/lib/sync/keuntungan";
import type { ActionResult } from "@/lib/actions/supplier";

export async function updateProfitSync(formData: FormData): Promise<ActionResult> {
  const akunSumberId = String(formData.get("akunSumberId") ?? "").trim();
  const akunTujuanId = String(formData.get("akunTujuanId") ?? "").trim();
  const kategoriId = String(formData.get("kategoriId") ?? "").trim();

  if (!akunSumberId || !akunTujuanId || !kategoriId)
    return { ok: false, error: "Semua pilihan wajib diisi." };
  if (akunSumberId === akunTujuanId)
    return { ok: false, error: "Akun sumber dan tujuan tidak boleh sama." };

  await prisma.$transaction([
    prisma.pengaturan.upsert({
      where: { key: PENGATURAN_KEYS.akunSumberKeuntungan },
      create: { key: PENGATURAN_KEYS.akunSumberKeuntungan, value: akunSumberId },
      update: { value: akunSumberId },
    }),
    prisma.pengaturan.upsert({
      where: { key: PENGATURAN_KEYS.akunKeuntungan },
      create: { key: PENGATURAN_KEYS.akunKeuntungan, value: akunTujuanId },
      update: { value: akunTujuanId },
    }),
    prisma.pengaturan.upsert({
      where: { key: PENGATURAN_KEYS.kategoriPenjualan },
      create: { key: PENGATURAN_KEYS.kategoriPenjualan, value: kategoriId },
      update: { value: kategoriId },
    }),
  ]);

  revalidatePath("/settings");
  return { ok: true };
}

/** Replays every non-legacy order through syncPesanan — for after changing the targets above. */
export async function sinkronUlangSemua(): Promise<ActionResult & { jumlah?: number }> {
  const pesanan = await prisma.pesanan.findMany({
    where: { sudahDicatatManual: false },
    select: { id: true },
  });

  for (const p of pesanan) {
    await prisma.$transaction((tx) => syncPesanan(tx, p.id));
  }

  revalidatePath("/uang");
  revalidatePath("/settings");
  return { ok: true, jumlah: pesanan.length };
}
