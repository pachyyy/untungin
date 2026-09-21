import { requireDevice } from "@/lib/api/auth";
import { restockProduk } from "@/lib/services/restock";
import { fromGuardFailure, jsonError, jsonOk, readJsonBody } from "@/lib/api/respond";
import { revalidateRestockPaths } from "@/lib/services/revalidate";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);

  const { id: produkId } = await params;
  const body = await readJsonBody(req);
  if (!body || typeof body !== "object") {
    return jsonError("Body permintaan tidak valid.", 400);
  }
  const { qty, hargaBeli, tanggal } = body as Record<string, unknown>;

  const result = await restockProduk({
    produkId,
    qty,
    hargaBeli,
    tanggal: typeof tanggal === "string" ? tanggal : "",
  });
  if (result.ok) revalidateRestockPaths();
  if (!result.ok) return jsonError(result.error, result.status ?? 400);
  return jsonOk(result.data, 201);
}
