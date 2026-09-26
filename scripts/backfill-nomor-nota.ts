/**
 * One-off backfill: renumber Pesanan.nomor 1..N by creation date. Must run
 * once right after the nomor column is added — `prisma db push` adds it as a
 * SERIAL, which fills pre-existing rows in arbitrary physical order, so the
 * oldest order wouldn't necessarily be INV-0001.
 *
 * Also moves the column's sequence to N, so the next order created gets N+1.
 *
 * Safe to re-run: if nomor already increases with createdAt (true right
 * after a successful backfill, and stays true afterwards since new orders
 * always get a higher number), it does nothing. That guard matters — nota
 * numbers have been shared with customers by then, and a re-run must never
 * compact the gaps left by deleted orders.
 *
 * Usage: npx tsx scripts/backfill-nomor-nota.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.pesanan.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { nomor: true },
  });
  const alreadyOrdered = rows.every((r, i) => i === 0 || r.nomor > rows[i - 1].nomor);
  if (alreadyOrdered) {
    console.log(`Pesanan: ${rows.length} rows, nomor already follows createdAt order. Nothing to do.`);
    return;
  }

  console.log(`Pesanan: renumbering ${rows.length} rows by createdAt…`);
  await prisma.$transaction(async (tx) => {
    // Two passes to stay clear of the unique constraint: first to distinct
    // negatives (can't collide with the existing positives), then flip sign.
    await tx.$executeRawUnsafe(`
      UPDATE "Pesanan" p SET "nomor" = -r.rn
      FROM (SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS rn FROM "Pesanan") r
      WHERE p."id" = r."id"
    `);
    await tx.$executeRawUnsafe(`UPDATE "Pesanan" SET "nomor" = -"nomor"`);
    await tx.$queryRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('"Pesanan"', 'nomor'),
        GREATEST((SELECT MAX("nomor") FROM "Pesanan"), 1)
      )
    `);
  });

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
