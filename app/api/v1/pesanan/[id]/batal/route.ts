import { requireDevice } from "@/lib/api/auth";
import { batalPesanan } from "@/lib/services/pesanan";
import { fromGuardFailure, jsonError, jsonOk } from "@/lib/api/respond";
import { revalidatePesananPaths } from "@/lib/services/revalidate";

type Params = { params: Promise<{ id: string }> };

/** Owner only — cancelling returns the order's stock and is final (a
 * cancelled order can't be edited, paid, or un-cancelled), so it sits with
 * delete rather than with the routine staff edits. */
export async function POST(req: Request, { params }: Params) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);

  const { id } = await params;
  const result = await batalPesanan(id);
  if (result.ok) revalidatePesananPaths();
  if (!result.ok) return jsonError(result.error, result.status ?? 400);
  return jsonOk(result.data);
}
