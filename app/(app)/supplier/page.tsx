import { getSupplierListView } from "@/lib/services/lists";
import { SupplierManager } from "./SupplierManager";

export const dynamic = "force-dynamic";

export default async function SupplierPage() {
  const { suppliers } = await getSupplierListView();

  return <SupplierManager suppliers={suppliers} />;
}
