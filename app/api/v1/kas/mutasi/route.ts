import { requireDevice } from "@/lib/api/auth";
import { listMutasi } from "@/lib/services/kas";
import { fromGuardFailure, fromServiceResult } from "@/lib/api/respond";

/** GET /kas/mutasi?cursor&limit — the money history, newest first. */
export async function GET(req: Request) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);

  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const result = await listMutasi({
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: limitParam ? Number(limitParam) : undefined,
  });
  if (!result.ok) return fromServiceResult(result);
  return fromServiceResult({
    ok: true,
    data: {
      items: result.data.items.map((m) => ({ ...m, tanggal: m.tanggal.toISOString() })),
      nextCursor: result.data.nextCursor,
    },
  });
}
