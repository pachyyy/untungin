import { requireDevice } from "@/lib/api/auth";
import { tarikSaldo } from "@/lib/services/kas";
import { fromGuardFailure, fromServiceResult, jsonError, readJsonBody } from "@/lib/api/respond";
import { revalidateKasPaths } from "@/lib/services/revalidate";

/** Owner takes money out of saldo keuntungan (pribadi / operasional). */
export async function POST(req: Request) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);

  const body = await readJsonBody(req);
  if (!body || typeof body !== "object") return jsonError("Body permintaan tidak valid.", 400);
  const { jumlah, catatan } = body as Record<string, unknown>;

  const result = await tarikSaldo({ jumlah, catatan: typeof catatan === "string" ? catatan : "" });
  if (result.ok) revalidateKasPaths();
  return fromServiceResult(result);
}
