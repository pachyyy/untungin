import { refreshTokens } from "@/lib/services/devices";
import { fromServiceResult, jsonError, readJsonBody } from "@/lib/api/respond";

/** Exchanges a refresh token for a new access/refresh pair, rotating the
 * stored hash. No Bearer header here — the refresh token itself is the
 * credential (see lib/services/devices.ts for the rotation/reuse-detection
 * logic). */
export async function POST(req: Request) {
  const body = await readJsonBody(req);
  if (!body || typeof body !== "object") {
    return jsonError("Body permintaan tidak valid.", 400);
  }
  const { refreshToken } = body as Record<string, unknown>;
  if (typeof refreshToken !== "string" || !refreshToken) {
    return jsonError("Refresh token wajib diisi.", 400);
  }

  const result = await refreshTokens(refreshToken);
  return fromServiceResult(result);
}
