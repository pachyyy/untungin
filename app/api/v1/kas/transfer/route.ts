import { requireDevice } from "@/lib/api/auth";
import { transferKas, type TransferInput } from "@/lib/services/kas";
import { fromGuardFailure, fromServiceResult, jsonError, readJsonBody } from "@/lib/api/respond";
import { revalidateKasPaths } from "@/lib/services/revalidate";

/** Moves money between modal and saldo keuntungan, in either direction. */
export async function POST(req: Request) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);

  const body = await readJsonBody(req);
  if (!body || typeof body !== "object") return jsonError("Body permintaan tidak valid.", 400);
  const { arah, jumlah } = body as Record<string, unknown>;

  const result = await transferKas({
    // transferKas rejects anything that isn't one of the two valid directions.
    arah: String(arah ?? "") as TransferInput["arah"],
    jumlah,
  });
  if (result.ok) revalidateKasPaths();
  return fromServiceResult(result);
}
