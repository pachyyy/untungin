import { getPesananListView } from "@/lib/services/lists";
import { getStrukSetting } from "@/lib/services/struk";
import { PesananManager } from "./PesananManager";

export const dynamic = "force-dynamic";

export default async function PesananPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const sp = await searchParams;
  const [{ pesanan, produk, customers }, strukSetting] = await Promise.all([
    getPesananListView(),
    getStrukSetting(),
  ]);

  return (
    <PesananManager
      pesanan={pesanan}
      produk={produk}
      customers={customers}
      strukSetting={strukSetting}
      openNew={sp.new === "1"}
    />
  );
}
