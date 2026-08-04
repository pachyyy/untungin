/**
 * One-off backfill: group existing Pesanan by namaCustomer, create one
 * Customer per unique name (carrying over the most recent non-null noHp),
 * and link every Pesanan to its Customer. Idempotent — safe to re-run.
 *
 * Usage: npx tsx scripts/backfill-customers.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pesanan = await prisma.pesanan.findMany({
    where: { customerId: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, namaCustomer: true, noHp: true },
  });

  const byName = new Map<string, { noHp: string | null; ids: string[] }>();
  for (const p of pesanan) {
    const key = p.namaCustomer.trim();
    if (!key) continue;
    const entry = byName.get(key.toLowerCase());
    if (entry) {
      entry.ids.push(p.id);
      if (!entry.noHp && p.noHp) entry.noHp = p.noHp;
    } else {
      byName.set(key.toLowerCase(), { noHp: p.noHp, ids: [p.id] });
    }
  }

  console.log(`Found ${pesanan.length} unlinked pesanan, ${byName.size} unique customer names.`);

  for (const [lowerName, { noHp, ids }] of byName) {
    const displayName = pesanan.find(
      (p) => p.namaCustomer.trim().toLowerCase() === lowerName
    )!.namaCustomer.trim();

    const customer = await prisma.customer.upsert({
      where: { nama: displayName },
      update: {},
      create: { nama: displayName, noHp },
    });

    await prisma.pesanan.updateMany({
      where: { id: { in: ids } },
      data: { customerId: customer.id },
    });

    console.log(`  ${displayName} -> ${ids.length} pesanan linked`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
