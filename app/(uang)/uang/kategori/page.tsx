import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { KategoriManager } from "./KategoriManager";

export const dynamic = "force-dynamic";

export default async function KategoriPage() {
  const kategori = await prisma.kategori.findMany({
    orderBy: [{ jenis: "asc" }, { urutan: "asc" }],
  });

  return (
    <div>
      <PageHeader title="Kategori" subtitle={`${kategori.length} kategori`} />
      <KategoriManager
        kategori={kategori.map((k) => ({
          id: k.id,
          nama: k.nama,
          jenis: k.jenis,
          parentId: k.parentId,
          aktif: k.aktif,
        }))}
      />
    </div>
  );
}
