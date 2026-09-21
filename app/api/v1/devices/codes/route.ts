import { requireDevice } from "@/lib/api/auth";
import { createEnrollCode } from "@/lib/services/devices";
import { fromGuardFailure, fromServiceResult, jsonError, readJsonBody } from "@/lib/api/respond";

/** Owner generates a one-time enrollment code for a new staff phone. The
 * raw code is returned exactly once here — only its hash is ever stored
 * (see lib/services/devices.ts), so this response is the only chance to
 * see it. */
export async function POST(req: Request) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);

  const body = await readJsonBody(req);
  if (!body || typeof body !== "object") {
    return jsonError("Body permintaan tidak valid.", 400);
  }
  const { nama, role } = body as Record<string, unknown>;
  if (typeof nama !== "string") {
    return jsonError("Nama perangkat wajib diisi.", 400);
  }

  const result = await createEnrollCode({
    nama,
    role: role === "owner" ? "owner" : "staff",
  });
  return fromServiceResult(result, 201);
}
