import { getPesananListView } from "@/lib/services/lists";
import { PesananManager } from "./PesananManager";

export const dynamic = "force-dynamic";

export default async function PesananPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const sp = await searchParams;
  const { pesanan, produk, customers } = await getPesananListView();

  return (
    <PesananManager
      pesanan={pesanan}
      produk={produk}
      customers={customers}
      openNew={sp.new === "1"}
    />
  );
}
