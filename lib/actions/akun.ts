"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/actions/supplier";

function revalidateAll() {
  revalidatePath("/uang");
  revalidatePath("/uang/akun");
  revalidatePath("/settings");
}

async function resolveGrupId(formData: FormData): Promise<string | { error: string }> {
  const grupId = String(formData.get("grupId") ?? "").trim();
  if (grupId === "__new__") {
    const nama = String(formData.get("grupNama") ?? "").trim();
    if (!nama) return { error: "Nama grup baru wajib diisi." };
    const count = await prisma.grupAkun.count();
    const created = await prisma.grupAkun.create({ data: { nama, urutan: count } });
    return created.id;
  }
  if (!grupId) return { error: "Grup akun wajib dipilih." };
  return grupId;
}

export async function createGrupAkun(formData: FormData): Promise<ActionResult> {
  const nama = String(formData.get("nama") ?? "").trim();
  if (!nama) return { ok: false, error: "Nama grup wajib diisi." };
  const count = await prisma.grupAkun.count();
  await prisma.grupAkun.create({ data: { nama, urutan: count } });
  revalidateAll();
  return { ok: true };
}

export async function updateGrupAkun(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const nama = String(formData.get("nama") ?? "").trim();
  if (!id) return { ok: false, error: "Grup tidak ditemukan." };
  if (!nama) return { ok: false, error: "Nama grup wajib diisi." };
  await prisma.grupAkun.update({ where: { id }, data: { nama } });
  revalidateAll();
  return { ok: true };
}

export async function toggleGrupAkunAktif(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const aktif = String(formData.get("aktif") ?? "") === "true";
  if (!id) return { ok: false, error: "Grup tidak ditemukan." };
  await prisma.grupAkun.update({ where: { id }, data: { aktif } });
  revalidateAll();
  return { ok: true };
}

export async function deleteGrupAkun(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Grup tidak ditemukan." };
  const count = await prisma.akun.count({ where: { grupId: id } });
  if (count > 0)
    return { ok: false, error: `Tidak bisa dihapus: masih ada ${count} akun di grup ini.` };
  await prisma.grupAkun.delete({ where: { id } });
  revalidateAll();
  return { ok: true };
}

export async function createAkun(formData: FormData): Promise<ActionResult> {
  const nama = String(formData.get("nama") ?? "").trim();
  const catatan = String(formData.get("catatan") ?? "").trim();
  if (!nama) return { ok: false, error: "Nama akun wajib diisi." };

  const grupId = await resolveGrupId(formData);
  if (typeof grupId !== "string") return { ok: false, error: grupId.error };

  const count = await prisma.akun.count();
  await prisma.akun.create({
    data: { nama, grupId, catatan: catatan || null, urutan: count },
  });
  revalidateAll();
  return { ok: true };
}

export async function updateAkun(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const nama = String(formData.get("nama") ?? "").trim();
  const catatan = String(formData.get("catatan") ?? "").trim();
  if (!id) return { ok: false, error: "Akun tidak ditemukan." };
  if (!nama) return { ok: false, error: "Nama akun wajib diisi." };

  const grupId = await resolveGrupId(formData);
  if (typeof grupId !== "string") return { ok: false, error: grupId.error };

  await prisma.akun.update({
    where: { id },
    data: { nama, grupId, catatan: catatan || null },
  });
  revalidateAll();
  return { ok: true };
}

export async function toggleAkunAktif(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const aktif = String(formData.get("aktif") ?? "") === "true";
  if (!id) return { ok: false, error: "Akun tidak ditemukan." };
  await prisma.akun.update({ where: { id }, data: { aktif } });
  revalidateAll();
  return { ok: true };
}

export async function deleteAkun(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Akun tidak ditemukan." };

  const [asAsal, asTujuan, asPembayaran] = await Promise.all([
    prisma.transaksi.count({ where: { akunId: id } }),
    prisma.transaksi.count({ where: { akunTujuanId: id } }),
    prisma.pembayaran.count({ where: { akunId: id } }),
  ]);
  const total = asAsal + asTujuan + asPembayaran;
  if (total > 0)
    return {
      ok: false,
      error: `Tidak bisa dihapus: akun ini dipakai di ${total} transaksi.`,
    };

  await prisma.akun.delete({ where: { id } });
  revalidateAll();
  return { ok: true };
}
