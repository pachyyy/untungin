import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { totalPesanan, STATUS_RANK } from "@/lib/calc";
import { parseIntField } from "@/lib/parse";
import { parseDateOnlyJakarta } from "@/lib/date";
import { ok, fail, type ServiceResult, type Actor, WEB_ACTOR } from "@/lib/services/types";

/**
 * Derives status from payments-so-far and updates it if changed.
 * When `allowDowngrade` is false, an order already at "lunas" (naturally or
 * forced via tandaiLunas) is left alone — an extra payment on a Lunas order
 * is overpayment/extra profit, not a status change. Removing a payment must
 * always be allowed to downgrade, so hapusPembayaran passes true.
 */
async function recomputeStatus(
  tx: Prisma.TransactionClient,
  pesananId: string,
  allowDowngrade: boolean
): Promise<void> {
  const pesanan = await tx.pesanan.findUnique({
    where: { id: pesananId },
    include: {
      items: true,
      pakets: { include: { komponen: true } },
      pembayaran: true,
    },
  });
  if (!pesanan) return;
  if (!allowDowngrade && pesanan.status === "lunas") return;

  const total = totalPesanan(pesanan);
  const dibayar = pesanan.pembayaran.reduce((s, p) => s + p.jumlah, 0);
  const status = dibayar <= 0 ? "belum_bayar" : dibayar >= total ? "lunas" : "nyicil";
  if (status !== pesanan.status) {
    await tx.pesanan.update({
      where: { id: pesananId },
      data: { status, statusRank: STATUS_RANK[status] },
    });
  }
}

export type TambahPembayaranInput = {
  pesananId: string;
  tanggal: string;
  metode: string;
  jumlah: unknown;
  jenis: string;
};

export async function tambahPembayaran(
  input: TambahPembayaranInput,
  actor: Actor = WEB_ACTOR
): Promise<ServiceResult<{ id: string }>> {
  const pesananId = input.pesananId;
  const tanggalStr = input.tanggal;
  const metode = input.metode.trim().slice(0, 40) || null;
  const jumlah = parseIntField(input.jumlah);
  const jenis = input.jenis === "bayar" ? "bayar" : "cicilan";

  if (!pesananId) return fail("Pesanan tidak ditemukan.", 404);
  if (jumlah === null) return fail("Jumlah pembayaran harus lebih dari 0.");

  const tanggal = tanggalStr ? parseDateOnlyJakarta(tanggalStr, "start") : new Date();
  if (Number.isNaN(tanggal.getTime())) return fail("Tanggal tidak valid.");

  let createdId = "";
  await prisma.$transaction(async (tx) => {
    const created = await tx.pembayaran.create({
      data: { pesananId, tanggal, metode, jumlah, jenis, createdByDeviceId: actor.deviceId },
    });
    createdId = created.id;
    await recomputeStatus(tx, pesananId, false);
  });

  return ok({ id: createdId });
}

export async function hapusPembayaran(
  id: string,
  _actor: Actor = WEB_ACTOR,
  /** The mobile API's route is nested under a pesanan id
   * (/pesanan/[id]/pembayaran/[pid]), unlike the web action which only ever
   * has the payment id. When given, a payment that belongs to a *different*
   * order than the URL claims is treated as not found — the URL's pesanan
   * id is part of what identifies the resource, not just decoration. */
  expectedPesananId?: string
): Promise<ServiceResult<{ id: string }>> {
  if (!id) return fail("Pembayaran tidak ditemukan.", 404);

  const bayar = await prisma.pembayaran.findUnique({ where: { id } });
  if (!bayar) return fail("Pembayaran tidak ditemukan.", 404);
  if (expectedPesananId && bayar.pesananId !== expectedPesananId) {
    return fail("Pembayaran tidak ditemukan.", 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.pembayaran.delete({ where: { id } });
    await recomputeStatus(tx, bayar.pesananId, true);
  });

  return ok({ id });
}

/**
 * Forces an order to Lunas even while underpaid (discount, rounding,
 * write-off). Requires at least one payment; the resulting profit can be
 * negative — the UI is expected to warn before calling this.
 */
export async function tandaiLunas(
  pesananId: string,
  _actor: Actor = WEB_ACTOR
): Promise<ServiceResult<{ id: string }>> {
  if (!pesananId) return fail("Pesanan tidak ditemukan.", 404);

  const pesanan = await prisma.pesanan.findUnique({
    where: { id: pesananId },
    include: { pembayaran: true },
  });
  if (!pesanan) return fail("Pesanan tidak ditemukan.", 404);
  if (pesanan.pembayaran.length === 0)
    return fail("Tambahkan minimal satu pembayaran dulu.");

  await prisma.pesanan.update({
    where: { id: pesananId },
    data: { status: "lunas", statusRank: STATUS_RANK.lunas },
  });

  return ok({ id: pesananId });
}
