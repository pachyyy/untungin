/**
 * One-off backfill: set Pesanan.statusRank from each row's existing `status`
 * (via STATUS_RANK in lib/calc.ts). Must run once right after the
 * statusRank column is added — `prisma db push` sets its @default(0) on
 * every pre-existing row regardless of actual status, so every nyicil/lunas
 * order would otherwise sort as if it were belum_bayar.
 *
 * Idempotent: only touches rows whose statusRank doesn't already match
 * STATUS_RANK[status], so re-running after backfilling is a no-op.
 *
 * Usage: npx tsx scripts/backfill-status-rank.ts
 */
import { PrismaClient } from "@prisma/client";
import { STATUS_RANK, type Status } from "../lib/calc";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.pesanan.findMany({
    select: { id: true, status: true, statusRank: true },
  });

  const toFix = rows.filter((r) => r.statusRank !== STATUS_RANK[r.status as Status]);
  console.log(`Pesanan: ${toFix.length} of ${rows.length} rows need statusRank fixed.`);

  for (const r of toFix) {
    const rank = STATUS_RANK[r.status as Status];
    if (rank === undefined) {
      console.warn(`Skipping ${r.id}: unrecognized status "${r.status}".`);
      continue;
    }
    await prisma.pesanan.update({ where: { id: r.id }, data: { statusRank: rank } });
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
