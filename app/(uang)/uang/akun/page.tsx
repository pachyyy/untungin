import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { AkunManager } from "./AkunManager";

export const dynamic = "force-dynamic";

export default async function AkunPage() {
  const [grup, akunList, semuaTransaksi] = await Promise.all([
    prisma.grupAkun.findMany({ orderBy: { urutan: "asc" } }),
    prisma.akun.findMany({ orderBy: { urutan: "asc" } }),
    prisma.transaksi.findMany({
      select: { jenis: true, jumlah: true, akunId: true, akunTujuanId: true },
    }),
  ]);

  // Balance = sum of every ledger movement touching this account. No stored
  // balance column, same as the .mmbak source: masuk/penyesuaian add, keluar
  // and outgoing transfers subtract, incoming transfers add.
  const saldo = new Map<string, number>();
  const add = (id: string, delta: number) => saldo.set(id, (saldo.get(id) ?? 0) + delta);
  for (const t of semuaTransaksi) {
    if (t.jenis === "masuk" || t.jenis === "penyesuaian") add(t.akunId, t.jumlah);
    else if (t.jenis === "keluar") add(t.akunId, -t.jumlah);
    else if (t.jenis === "transfer") {
      add(t.akunId, -t.jumlah);
      if (t.akunTujuanId) add(t.akunTujuanId, t.jumlah);
    }
  }

  return (
    <div>
      <PageHeader title="Akun" subtitle={`${akunList.length} akun`} />
      <AkunManager
        grup={grup.map((g) => ({ id: g.id, nama: g.nama, aktif: g.aktif }))}
        akun={akunList.map((a) => ({
          id: a.id,
          nama: a.nama,
          grupId: a.grupId,
          catatan: a.catatan,
          aktif: a.aktif,
          saldo: saldo.get(a.id) ?? 0,
        }))}
      />
    </div>
  );
}
