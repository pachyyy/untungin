import { requireDevice } from "@/lib/api/auth";
import { listCustomers, createCustomer } from "@/lib/services/customer";
import { serializeCustomer } from "@/lib/api/serialize";
import { fromGuardFailure, jsonError, jsonOk, readJsonBody } from "@/lib/api/respond";
import { revalidateCustomerWrite } from "@/lib/services/revalidate";

export async function GET(req: Request) {
  const guard = await requireDevice(req);
  if (!guard.ok) return fromGuardFailure(guard);

  const result = await listCustomers();
  if (!result.ok) return jsonError(result.error, result.status ?? 400);
  return jsonOk(result.data.map(serializeCustomer));
}

export async function POST(req: Request) {
  const guard = await requireDevice(req);
  if (!guard.ok) return fromGuardFailure(guard);

  const body = await readJsonBody(req);
  if (!body || typeof body !== "object") {
    return jsonError("Body permintaan tidak valid.", 400);
  }
  const { nama, noHp, catatan } = body as Record<string, unknown>;

  const result = await createCustomer({
    nama: typeof nama === "string" ? nama : "",
    noHp: typeof noHp === "string" ? noHp : "",
    catatan: typeof catatan === "string" ? catatan : "",
  });
  if (result.ok) revalidateCustomerWrite();
  if (!result.ok) return jsonError(result.error, result.status ?? 400);
  return jsonOk(result.data, 201);
}
