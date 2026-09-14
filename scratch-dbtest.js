const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });
(async () => {
  try {
    const rows = await prisma.$queryRawUnsafe(
      "select application_name, client_addr, state, count(*) from pg_stat_activity group by 1,2,3 order by 4 desc"
    );
    console.table(rows);
    const total = await prisma.$queryRawUnsafe("select count(*) from pg_stat_activity");
    console.log("total connections:", total);
  } catch (e) {
    console.error("ERROR:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
