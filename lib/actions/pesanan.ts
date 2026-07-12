"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { STATUS_LIST, isCommitted, type Status } from "@/lib/calc";
import type { ActionResult } from "@/lib/actions/supplier";

type ItemInput = { produkId: string; jumlah: number; hargaSaat: number };
type PaketKomponenInput = { produkId: string; pcs: number };
type PaketInput = { nama: string; harga: number; komponen: PaketKomponenInput[] };

function parseItems(raw: FormDataEntryValue | null): ItemInput[] {
  try {
    const arr = JSON.parse(String(raw ?? "[]"));
    if (!Array.isArray(arr)) return [];
    return arr
      .map((it) => ({
        produkId: String(it.produkId ?? ""),
        jumlah: Math.floor(Number(it.jumlah)),
        hargaSaat: Math.floor(Number(it.hargaSaat)),
      }))
      .filter(
        (it) =>
          it.produkId &&
          Number.isFinite(it.jumlah) &&
          it.jumlah > 0 &&
          Number.isFinite(it.hargaSaat) &&
          it.hargaSaat > 0
      );
  } catch {
    return [];
  }
}

function parsePakets(raw: FormDataEntryValue | null): PaketInput[] {
  try {
    const arr = JSON.parse(String(raw ?? "[]"));
    if (!Array.isArray(arr)) return [];
    return arr
      .map((pk) => ({
        nama: String(pk.nama ?? "").trim() || "Paket",
        harga: Math.floor(Number(pk.harga)),
        komponen: Array.isArray(pk.komponen)
          ? pk.komponen
              .map((k: unknown) => {
                const kk = k as { produkId?: unknown; pcs?: unknown };
                return {
                  produkId: String(kk.produkId ?? ""),
                  pcs: Math.floor(Number(kk.pcs)),
                };
              })
              .filter(
                (k: PaketKomponenInput) =>
                  k.produkId && Number.isFinite(k.pcs) && k.pcs > 0
              )
          : [],
      }))
      .filter(
        (pk) =>
          Number.isFinite(pk.harga) && pk.harga > 0 && pk.komponen.length > 0
      );
  } catch {
    return [];
  }
}

/** Total pcs to deduct from stock per product, across single items and paket components. */
function stockNeeds(pesanan: {
  items: { produkId: string; jumlah: number }[];
  pakets: { komponen: { produkId: string; pcs: number }[] }[];
}): Map<string, number> {
  const need = new Map<string, number>();
  const add = (id: string, qty: number) =>
    need.set(id, (need.get(id) ?? 0) + qty);
  for (const it of pesanan.items) add(it.produkId, it.jumlah);
  for (const pk of pesanan.pakets)
    for (const k of pk.komponen) add(k.produkId, k.pcs);
  return need;
}

export async function createPesanan(formData: FormData): Promise<ActionResult> {
  const namaCustomer = String(formData.get("namaCustomer") ?? "").trim();
  const noHp = String(formData.get("noHp") ?? "").trim();
  const items = parseItems(formData.get("items"));
  const pakets = parsePakets(formData.get("pakets"));

  if (!namaCustomer) return { ok: false, error: "Nama customer wajib diisi." };
  if (items.length === 0 && pakets.length === 0)
    return {
      ok: false,
      error: "Tambahkan minimal satu item satuan atau satu paket.",
    };

  // Validate every referenced product still exists.
  const referenced = new Set<string>();
  items.forEach((it) => referenced.add(it.produkId));
  pakets.forEach((pk) => pk.komponen.forEach((k) => referenced.add(k.produkId)));

  const produkList = await prisma.produk.findMany({
    where: { id: { in: [...referenced] } },
    select: { id: true },
  });
  const validIds = new Set(produkList.map((p) => p.id));
  for (const id of referenced) {
    if (!validIds.has(id))
      return { ok: false, error: "Ada produk yang tidak valid." };
  }

  await prisma.pesanan.create({
    data: {
      namaCustomer,
      noHp: noHp || null,
      status: "baru",
      items: {
        create: items.map((it) => ({
          produkId: it.produkId,
          jumlah: it.jumlah,
          hargaSaat: it.hargaSaat, // selling price entered per order
        })),
      },
      pakets: {
        create: pakets.map((pk) => ({
          nama: pk.nama,
          harga: pk.harga,
          komponen: {
            create: pk.komponen.map((k) => ({
              produkId: k.produkId,
              pcs: k.pcs,
            })),
          },
        })),
      },
    },
  });

  revalidatePath("/pesanan");
  revalidatePath("/dashboard");
  revalidatePath("/laporan");
  return { ok: true };
}

export async function updateStatus(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("status") ?? "") as Status;
  if (!id) return { ok: false, error: "Pesanan tidak ditemukan." };
  if (!STATUS_LIST.includes(next))
    return { ok: false, error: "Status tidak valid." };

  const pesanan = await prisma.pesanan.findUnique({
    where: { id },
    include: { items: true, pakets: { include: { komponen: true } } },
  });
  if (!pesanan) return { ok: false, error: "Pesanan tidak ditemukan." };

  const wasCommitted = isCommitted(pesanan.status);
  const willCommit = isCommitted(next);

  // Stock delta sign: -1 to deduct, +1 to return.
  let delta = 0;
  if (!wasCommitted && willCommit) delta = -1;
  else if (wasCommitted && !willCommit) delta = +1;

  const needs = stockNeeds(pesanan);

  await prisma.$transaction(async (tx) => {
    await tx.pesanan.update({ where: { id }, data: { status: next } });
    if (delta !== 0) {
      for (const [produkId, qty] of needs) {
        await tx.produk.update({
          where: { id: produkId },
          data: { stok: { increment: delta * qty } },
        });
      }
    }
  });

  revalidatePath("/pesanan");
  revalidatePath("/dashboard");
  revalidatePath("/produk");
  revalidatePath("/laporan");
  return { ok: true };
}

export async function deletePesanan(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Pesanan tidak ditemukan." };

  const pesanan = await prisma.pesanan.findUnique({
    where: { id },
    include: { items: true, pakets: { include: { komponen: true } } },
  });
  if (!pesanan) return { ok: false, error: "Pesanan tidak ditemukan." };

  const needs = stockNeeds(pesanan);

  await prisma.$transaction(async (tx) => {
    // If stock was already deducted (dikirim/selesai), return it before deleting.
    if (isCommitted(pesanan.status)) {
      for (const [produkId, qty] of needs) {
        await tx.produk.update({
          where: { id: produkId },
          data: { stok: { increment: qty } },
        });
      }
    }
    await tx.pesanan.delete({ where: { id } });
  });

  revalidatePath("/pesanan");
  revalidatePath("/dashboard");
  revalidatePath("/laporan");
  return { ok: true };
}
