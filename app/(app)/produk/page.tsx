import { getProdukListView } from "@/lib/services/lists";
import { ProdukManager } from "./ProdukManager";

export const dynamic = "force-dynamic";

export default async function ProdukPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const sp = await searchParams;
  const { produk, suppliers } = await getProdukListView();

  return <ProdukManager produk={produk} suppliers={suppliers} openNew={sp.new === "1"} />;
}
