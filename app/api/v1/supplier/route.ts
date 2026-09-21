import { requireDevice } from "@/lib/api/auth";
import { listSuppliers, createSupplier } from "@/lib/services/supplier";
import { serializeSupplier } from "@/lib/api/serialize";
import { fromGuardFailure, jsonError, jsonOk, readJsonBody } from "@/lib/api/respond";
import { revalidateSupplierWrite } from "@/lib/services/revalidate";

/** Owner only, unlike produk/pelanggan — a supplier list isn't part of
 * staff's day-to-day order-taking work. */
export async function GET(req: Request) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);

  const result = await listSuppliers();
  if (!result.ok) return jsonError(result.error, result.status ?? 400);
  return jsonOk(result.data.map((s) => serializeSupplier(s, s.jumlahProduk)));
}

export async function POST(req: Request) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);

  const body = await readJsonBody(req);
  if (!body || typeof body !== "object") {
    return jsonError("Body permintaan tidak valid.", 400);
  }
  const { nama, kontak } = body as Record<string, unknown>;

  const result = await createSupplier({
    nama: typeof nama === "string" ? nama : "",
    kontak: typeof kontak === "string" ? kontak : "",
  });
  if (result.ok) revalidateSupplierWrite();
  if (!result.ok) return jsonError(result.error, result.status ?? 400);
  return jsonOk(result.data, 201);
}
