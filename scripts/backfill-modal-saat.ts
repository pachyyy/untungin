/**
 * One-off backfill: set PesananItem.modalSaat / PesananPaketItem.modalSaat to
 * the referenced product's CURRENT hargaModal, for every row that doesn't
 * have one yet. Must run once right after the modalSaat column is added,
 * before lib/calc.ts switches to reading it — otherwise profit reads as 0
 * for every pre-existing order in the gap.
 *
 * Idempotent: only touches rows where modalSaat = 0 (the column default), so
 * re-running after real modalSaat values exist is a no-op.
 *
 * Usage: npx tsx scripts/backfill-modal-saat.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.pesananItem.findMany({
    where: { modalSaat: 0 },
    select: { id: true, produk: { select: { hargaModal: true } } },
  });
  console.log(`PesananItem: ${items.length} rows to backfill.`);
  for (const it of items) {
    await prisma.pesananItem.update({
      where: { id: it.id },
      data: { modalSaat: it.produk.hargaModal },
    });
  }

  const komponen = await prisma.pesananPaketItem.findMany({
    where: { modalSaat: 0 },
    select: { id: true, produk: { select: { hargaModal: true } } },
  });
  console.log(`PesananPaketItem: ${komponen.length} rows to backfill.`);
  for (const k of komponen) {
    await prisma.pesananPaketItem.update({
      where: { id: k.id },
      data: { modalSaat: k.produk.hargaModal },
    });
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
