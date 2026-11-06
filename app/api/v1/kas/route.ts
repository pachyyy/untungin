import { requireDevice } from "@/lib/api/auth";
import { getKas, setSaldo } from "@/lib/services/kas";
import { fromGuardFailure, fromServiceResult, jsonError, jsonOk, readJsonBody } from "@/lib/api/respond";
import { revalidateKasPaths } from "@/lib/services/revalidate";

/** Owner only — modal and saldo keuntungan are money figures staff never see. */
export async function GET(req: Request) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);
  return jsonOk(await getKas());
}

/** First call enters the starting balances; later calls mean "the real
 * balance is X now" and record the difference as an adjustment. */
export async function PUT(req: Request) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);

  const body = await readJsonBody(req);
  if (!body || typeof body !== "object") return jsonError("Body permintaan tidak valid.", 400);
  const { modal, saldo } = body as Record<string, unknown>;

  const result = await setSaldo({ modal, saldo });
  if (result.ok) revalidateKasPaths();
  return fromServiceResult(result);
}
