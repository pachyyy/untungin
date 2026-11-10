import { getProdukListView } from "@/lib/services/lists";
import { getKas } from "@/lib/services/kas";
import { ProdukManager } from "./ProdukManager";

export const dynamic = "force-dynamic";

export default async function ProdukPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const sp = await searchParams;
  const [{ produk, suppliers }, kas] = await Promise.all([getProdukListView(), getKas()]);

  return (
    <ProdukManager
      produk={produk}
      suppliers={suppliers}
      openNew={sp.new === "1"}
      kasAktif={kas.aktif}
    />
  );
}
