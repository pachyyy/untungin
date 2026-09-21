import { getPelangganListView } from "@/lib/services/lists";
import { PelangganManager } from "./PelangganManager";

export const dynamic = "force-dynamic";

export default async function PelangganPage() {
  const { customers } = await getPelangganListView();

  return <PelangganManager customers={customers} />;
}
