import { Prisma } from "@prisma/client";
import { modalPesanan } from "@/lib/calc";

export const PENGATURAN_KEYS = {
  akunSumberKeuntungan: "akunSumberKeuntunganId",
  akunKeuntungan: "akunKeuntunganId",
  kategoriPenjualan: "kategoriPenjualanId",
} as const;

async function getSetting(
  tx: Prisma.TransactionClient,
  key: string
): Promise<string | null> {
  const row = await tx.pengaturan.findUnique({ where: { key } });
  return row?.value ?? null;
}

function labelPembayaran(namaCustomer: string, jenis: string): string {
  return `${namaCustomer} ${jenis === "cicilan" ? "nyicil" : "bayar"}`;
}

/**
 * Recomputes an order's whole ledger footprint (Uang) from its current
 * payments. Idempotent and safe to call after any change to the order's
 * payments or status — it converges rather than incrementally patching.
 *
 * No-ops if the profit-sync accounts/category aren't configured yet in
 * Settings, or if the order predates the sync (sudahDicatatManual).
 */
export async function syncPesanan(
  tx: Prisma.TransactionClient,
  pesananId: string
): Promise<void> {
  const pesanan = await tx.pesanan.findUnique({
    where: { id: pesananId },
    include: {
      items: true,
      pakets: { include: { komponen: true } },
      pembayaran: true,
    },
  });
  if (!pesanan || pesanan.sudahDicatatManual) return;

  const [akunSumberId, akunTujuanId, kategoriId] = await Promise.all([
    getSetting(tx, PENGATURAN_KEYS.akunSumberKeuntungan),
    getSetting(tx, PENGATURAN_KEYS.akunKeuntungan),
    getSetting(tx, PENGATURAN_KEYS.kategoriPenjualan),
  ]);
  if (!akunSumberId || !akunTujuanId || !kategoriId) return;

  // One income row per payment. Payments removed since the last sync already
  // took their Transaksi with them via onDelete: Cascade — nothing to clean up.
  for (const bayar of pesanan.pembayaran) {
    const catatan = labelPembayaran(pesanan.namaCustomer, bayar.jenis);
    await tx.transaksi.upsert({
      where: { pembayaranId: bayar.id },
      create: {
        jenis: "masuk",
        tanggal: bayar.tanggal,
        jumlah: bayar.jumlah,
        akunId: bayar.akunId,
        kategoriId,
        catatan,
        pembayaranId: bayar.id,
      },
      update: {
        tanggal: bayar.tanggal,
        jumlah: bayar.jumlah,
        akunId: bayar.akunId,
        kategoriId,
        catatan,
      },
    });
  }

  if (pesanan.status !== "lunas") {
    await tx.transaksi.deleteMany({ where: { pesananKeuntunganId: pesananId } });
    return;
  }

  const totalDibayar = pesanan.pembayaran.reduce((s, p) => s + p.jumlah, 0);
  const untung = totalDibayar - modalPesanan(pesanan);

  if (untung === 0) {
    await tx.transaksi.deleteMany({ where: { pesananKeuntunganId: pesananId } });
    return;
  }

  const tanggalTerakhir = pesanan.pembayaran.reduce<Date>(
    (latest, p) => (p.tanggal > latest ? p.tanggal : latest),
    pesanan.pembayaran[0]?.tanggal ?? pesanan.createdAt
  );

  // jumlah stays positive like every other Transaksi; a forced Lunas that
  // never recovered the modal (loss) reverses the transfer direction instead
  // of going negative.
  const [dariId, keId, jumlah] =
    untung > 0 ? [akunSumberId, akunTujuanId, untung] : [akunTujuanId, akunSumberId, -untung];

  await tx.transaksi.upsert({
    where: { pesananKeuntunganId: pesananId },
    create: {
      jenis: "transfer",
      tanggal: tanggalTerakhir,
      jumlah,
      akunId: dariId,
      akunTujuanId: keId,
      catatan: `keuntungan ${pesanan.namaCustomer}`,
      pesananKeuntunganId: pesananId,
    },
    update: {
      tanggal: tanggalTerakhir,
      jumlah,
      akunId: dariId,
      akunTujuanId: keId,
      catatan: `keuntungan ${pesanan.namaCustomer}`,
    },
  });
}

/** True once all three profit-sync targets are configured in Settings. */
export async function isSyncConfigured(
  tx: Prisma.TransactionClient
): Promise<boolean> {
  const rows = await tx.pengaturan.findMany({
    where: { key: { in: Object.values(PENGATURAN_KEYS) } },
  });
  return rows.length === Object.values(PENGATURAN_KEYS).length;
}
