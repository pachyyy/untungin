"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/actions/supplier";
import { resolveCustomerId } from "@/lib/actions/customer";
import { syncPesanan } from "@/lib/sync/keuntungan";

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

/** Total pcs needed per product, across single items and paket components. */
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

function revalidateAll() {
  revalidatePath("/pesanan");
  revalidatePath("/dashboard");
  revalidatePath("/produk");
  revalidatePath("/laporan");
  revalidatePath("/pelanggan");
  revalidatePath("/uang");
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

  const referenced = new Set<string>();
  items.forEach((it) => referenced.add(it.produkId));
  pakets.forEach((pk) => pk.komponen.forEach((k) => referenced.add(k.produkId)));

  const produkList = await prisma.produk.findMany({
    where: { id: { in: [...referenced] } },
    select: { id: true, hargaModal: true, stok: true },
  });
  const produkById = new Map(produkList.map((p) => [p.id, p]));
  for (const id of referenced) {
    if (!produkById.has(id))
      return { ok: false, error: "Ada produk yang tidak valid." };
  }

  const needs = stockNeeds({
    items,
    pakets: pakets.map((pk) => ({ komponen: pk.komponen })),
  });
  for (const [produkId, qty] of needs) {
    const p = produkById.get(produkId)!;
    if (p.stok < qty)
      return {
        ok: false,
        error: `Stok tidak cukup untuk salah satu produk (sisa ${p.stok}).`,
      };
  }

  let pesananId = "";
  await prisma.$transaction(async (tx) => {
    const customerId = await resolveCustomerId(tx, namaCustomer, noHp || null);
    const created = await tx.pesanan.create({
      data: {
        namaCustomer,
        noHp: noHp || null,
        customerId,
        status: "belum_bayar",
        items: {
          create: items.map((it) => ({
            produkId: it.produkId,
            jumlah: it.jumlah,
            hargaSaat: it.hargaSaat, // selling price entered per order
            modalSaat: produkById.get(it.produkId)!.hargaModal, // cost snapshot
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
                modalSaat: produkById.get(k.produkId)!.hargaModal,
              })),
            },
          })),
        },
      },
    });
    pesananId = created.id;

    // Stock leaves the moment the order is placed — status is now purely financial.
    for (const [produkId, qty] of needs) {
      await tx.produk.update({
        where: { id: produkId },
        data: { stok: { decrement: qty } },
      });
    }

    await syncPesanan(tx, pesananId);
  });

  revalidateAll();
  return { ok: true };
}

export async function updatePesanan(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const namaCustomer = String(formData.get("namaCustomer") ?? "").trim();
  const noHp = String(formData.get("noHp") ?? "").trim();
  const items = parseItems(formData.get("items"));
  const pakets = parsePakets(formData.get("pakets"));

  if (!id) return { ok: false, error: "Pesanan tidak ditemukan." };
  if (!namaCustomer) return { ok: false, error: "Nama customer wajib diisi." };
  if (items.length === 0 && pakets.length === 0)
    return {
      ok: false,
      error: "Tambahkan minimal satu item satuan atau satu paket.",
    };

  const referenced = new Set<string>();
  items.forEach((it) => referenced.add(it.produkId));
  pakets.forEach((pk) => pk.komponen.forEach((k) => referenced.add(k.produkId)));

  const produkList = await prisma.produk.findMany({
    where: { id: { in: [...referenced] } },
    select: { id: true, hargaModal: true, stok: true },
  });
  const produkById = new Map(produkList.map((p) => [p.id, p]));
  for (const rid of referenced) {
    if (!produkById.has(rid))
      return { ok: false, error: "Ada produk yang tidak valid." };
  }

  const existing = await prisma.pesanan.findUnique({
    where: { id },
    include: {
      items: true,
      pakets: { include: { komponen: true } },
      pembayaran: true,
    },
  });
  if (!existing) return { ok: false, error: "Pesanan tidak ditemukan." };

  const oldNeeds = stockNeeds(existing);
  const newNeeds = stockNeeds({
    items,
    pakets: pakets.map((pk) => ({ komponen: pk.komponen })),
  });

  // Stock is always deducted (creation-time invariant); check the net delta
  // against current stock, adding back what this order already holds.
  const products = new Set<string>([...oldNeeds.keys(), ...newNeeds.keys()]);
  for (const pid of products) {
    const net = (newNeeds.get(pid) ?? 0) - (oldNeeds.get(pid) ?? 0);
    if (net > 0) {
      const p = produkById.get(pid);
      const available = (p?.stok ?? 0) + (oldNeeds.get(pid) ?? 0);
      if (available < (newNeeds.get(pid) ?? 0)) {
        return {
          ok: false,
          error: `Stok tidak cukup untuk salah satu produk (sisa ${p?.stok ?? 0}).`,
        };
      }
    }
  }

  const totalDibayar = existing.pembayaran.reduce((s, p) => s + p.jumlah, 0);

  await prisma.$transaction(async (tx) => {
    const customerId = await resolveCustomerId(tx, namaCustomer, noHp || null);

    // Replace all lines.
    await tx.pesananItem.deleteMany({ where: { pesananId: id } });
    await tx.pesananPaket.deleteMany({ where: { pesananId: id } }); // cascades komponen
    await tx.pesanan.update({
      where: { id },
      data: {
        namaCustomer,
        noHp: noHp || null,
        customerId,
        items: {
          create: items.map((it) => ({
            produkId: it.produkId,
            jumlah: it.jumlah,
            hargaSaat: it.hargaSaat,
            modalSaat: produkById.get(it.produkId)!.hargaModal,
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
                modalSaat: produkById.get(k.produkId)!.hargaModal,
              })),
            },
          })),
        },
      },
    });

    // Reconcile stock deltas: return old, deduct new.
    for (const pid of products) {
      const net = (oldNeeds.get(pid) ?? 0) - (newNeeds.get(pid) ?? 0);
      if (net !== 0) {
        await tx.produk.update({
          where: { id: pid },
          data: { stok: { increment: net } },
        });
      }
    }

    // The sale price may have changed — re-derive status from what's already
    // been paid (never auto-forces Lunas back up; that stays a manual choice
    // via tandaiLunas, but a status can drop if the new total exceeds what
    // was paid).
    const newTotal = items.reduce((s, it) => s + it.hargaSaat * it.jumlah, 0) +
      pakets.reduce((s, pk) => s + pk.harga, 0);
    const newStatus =
      totalDibayar <= 0 ? "belum_bayar" : totalDibayar >= newTotal ? "lunas" : "nyicil";
    if (newStatus !== existing.status) {
      await tx.pesanan.update({ where: { id }, data: { status: newStatus } });
    }

    await syncPesanan(tx, id);
  });

  revalidateAll();
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
    // Stock always left at creation now, so deleting always returns it.
    for (const [produkId, qty] of needs) {
      await tx.produk.update({
        where: { id: produkId },
        data: { stok: { increment: qty } },
      });
    }
    // Cascades: Pembayaran rows and the profit-transfer Transaksi go with the order.
    await tx.pesanan.delete({ where: { id } });
  });

  revalidateAll();
  return { ok: true };
}
