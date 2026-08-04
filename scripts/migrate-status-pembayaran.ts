/**
 * One-off migration: remap Pesanan.status from the old fulfillment states
 * (baru/diproses/dikirim/selesai) to the new payment states
 * (belum_bayar/nyicil/lunas), and fix up Produk.stok for the change from
 * "deduct on dikirim" to "deduct at order creation".
 *
 * Mapping:
 *   selesai, dikirim -> lunas, sudahDicatatManual = true (already among the
 *     hand-entered Penjualan rows imported from Money Manager — posting them
 *     again via syncPesanan would double-count)
 *   baru, diproses    -> belum_bayar
 *
 * Stock fix-up: under the old rule, orders that were baru/diproses never had
 * stock deducted. Under the new creation-time rule they should have been, so
 * this decrements Produk.stok for every such order's line items.
 *
 * DRY RUN BY DEFAULT — prints the full plan (status counts, stock before/after
 * per product) and writes nothing. Re-run with --commit to apply. This is the
 * one irreversible step in the whole migration; review the printed table
 * carefully before committing.
 *
 * Usage:
 *   npx tsx scripts/migrate-status-pembayaran.ts            (dry run)
 *   npx tsx scripts/migrate-status-pembayaran.ts --commit    (apply)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const commit = process.argv.includes("--commit");

function stockNeeds(pesanan: {
  items: { produkId: string; jumlah: number }[];
  pakets: { komponen: { produkId: string; pcs: number }[] }[];
}): Map<string, number> {
  const need = new Map<string, number>();
  const add = (id: string, qty: number) => need.set(id, (need.get(id) ?? 0) + qty);
  for (const it of pesanan.items) add(it.produkId, it.jumlah);
  for (const pk of pesanan.pakets) for (const k of pk.komponen) add(k.produkId, k.pcs);
  return need;
}

async function main() {
  const pesanan = await prisma.pesanan.findMany({
    select: {
      id: true,
      status: true,
      namaCustomer: true,
      items: { select: { produkId: true, jumlah: true } },
      pakets: { select: { komponen: { select: { produkId: true, pcs: true } } } },
    },
  });

  const legacyLunas = pesanan.filter((p) => p.status === "selesai" || p.status === "dikirim");
  const legacyBelumBayar = pesanan.filter((p) => p.status === "baru" || p.status === "diproses");
  const alreadyNew = pesanan.filter((p) =>
    ["belum_bayar", "nyicil", "lunas"].includes(p.status)
  );

  console.log(`Total pesanan: ${pesanan.length}`);
  console.log(`  selesai/dikirim -> lunas (sudahDicatatManual=true): ${legacyLunas.length}`);
  console.log(`  baru/diproses -> belum_bayar (stock fix-up applies): ${legacyBelumBayar.length}`);
  console.log(`  already on new status (no-op): ${alreadyNew.length}`);

  // Stock fix-up: decrement stok for every product needed by a
  // baru/diproses order, since it was never deducted under the old rule.
  const needs = new Map<string, number>();
  for (const p of legacyBelumBayar) {
    const n = stockNeeds(p);
    for (const [produkId, qty] of n) needs.set(produkId, (needs.get(produkId) ?? 0) + qty);
  }

  const produkIds = [...needs.keys()];
  const produkList = await prisma.produk.findMany({
    where: { id: { in: produkIds } },
    select: { id: true, nama: true, stok: true },
  });

  console.log("\nStock fix-up (baru/diproses orders never had stock deducted):");
  console.log("produk".padEnd(30), "stok sekarang".padStart(14), "akan dikurangi".padStart(16), "stok baru".padStart(12));
  let anyNegative = false;
  for (const prod of produkList) {
    const qty = needs.get(prod.id) ?? 0;
    const after = prod.stok - qty;
    if (after < 0) anyNegative = true;
    console.log(
      prod.nama.padEnd(30),
      String(prod.stok).padStart(14),
      String(qty).padStart(16),
      String(after).padStart(12) + (after < 0 ? "  ⚠ NEGATIF" : "")
    );
  }
  if (anyNegative) {
    console.log(
      "\n⚠ Beberapa produk akan punya stok negatif setelah fix-up. Ini berarti lebih banyak barang" +
        " sudah dijual di pesanan lama daripada yang tercatat sebagai stok masuk. Tinjau manual sebelum commit."
    );
  }

  if (!commit) {
    console.log("\nDry run only — tidak ada perubahan disimpan. Jalankan ulang dengan --commit untuk menerapkan.");
    return;
  }

  console.log("\nApplying...");
  await prisma.$transaction(async (tx) => {
    if (legacyLunas.length > 0) {
      await tx.pesanan.updateMany({
        where: { id: { in: legacyLunas.map((p) => p.id) } },
        data: { status: "lunas", sudahDicatatManual: true },
      });
    }
    if (legacyBelumBayar.length > 0) {
      await tx.pesanan.updateMany({
        where: { id: { in: legacyBelumBayar.map((p) => p.id) } },
        data: { status: "belum_bayar" },
      });
    }
    for (const [produkId, qty] of needs) {
      if (qty === 0) continue;
      await tx.produk.update({
        where: { id: produkId },
        data: { stok: { decrement: qty } },
      });
    }
  });

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
