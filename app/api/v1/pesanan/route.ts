import { requireDevice } from "@/lib/api/auth";
import { listPesanan, createPesanan } from "@/lib/services/pesanan";
import { serializePesanan } from "@/lib/api/serialize";
import { fromGuardFailure, jsonError, jsonOk, readJsonBody } from "@/lib/api/respond";
import { revalidatePesananPaths } from "@/lib/services/revalidate";

/** GET /pesanan?cursor&limit&status — cursor-paginated order list. Staff
 * and owner both see every order; the difference is in the per-order
 * fields (serializePesanan strips cost/profit for staff). */
export async function GET(req: Request) {
  const guard = await requireDevice(req);
  if (!guard.ok) return fromGuardFailure(guard);

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const result = await listPesanan({ cursor, status, limit });
  if (!result.ok) return jsonError(result.error, result.status ?? 400);

  return jsonOk({
    items: result.data.items.map((p) => serializePesanan(p, guard.device.role)),
    nextCursor: result.data.nextCursor,
  });
}

/** POST /pesanan — create an order. Staff can create orders (attributed via
 * createdByDeviceId); only the owner-only routes are the destructive ones
 * (delete, force-Lunas write-off, deleting a payment). */
export async function POST(req: Request) {
  const guard = await requireDevice(req);
  if (!guard.ok) return fromGuardFailure(guard);

  const body = await readJsonBody(req);
  if (!body || typeof body !== "object") {
    return jsonError("Body permintaan tidak valid.", 400);
  }
  const { namaCustomer, noHp, items, pakets } = body as Record<string, unknown>;

  const result = await createPesanan(
    {
      namaCustomer: typeof namaCustomer === "string" ? namaCustomer : "",
      noHp: typeof noHp === "string" ? noHp : "",
      items,
      pakets,
    },
    { deviceId: guard.device.id }
  );
  if (result.ok) revalidatePesananPaths();
  if (!result.ok) return jsonError(result.error, result.status ?? 400);
  return jsonOk(result.data, 201);
}
