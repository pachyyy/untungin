/**
 * Auth for the mobile API (app/api/v1/*). Separate from lib/auth.ts, which
 * is the web's single-shared-password cookie session — this is per-device,
 * revocable, and role-aware, because the mobile app is sideloaded to staff
 * phones and a leaked/lost phone must be revocable without changing
 * APP_PASSWORD (and thus logging out everyone, web included).
 *
 * Two credentials per device, both short-lived by design:
 *   - Access token: a JWT (HS256, `API_JWT_SECRET`), 15 minutes, carries
 *     `role` so a route handler can check it without a DB round trip. Never
 *     stored anywhere — verified statelessly on every request.
 *   - Refresh token: 32 random bytes, opaque to the client. Only its SHA-256
 *     hash is ever stored (`Device.refreshTokenHash`), and it rotates on
 *     every use (see `requireDevice`'s sibling, `refreshTokens`, in
 *     lib/services/devices.ts) — a request bearing the *previous* hash
 *     means a spent token was reused, which revokes the device on the spot.
 */
import { SignJWT, jwtVerify } from "jose";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type DeviceRole = "owner" | "staff";

const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_TOKEN_TTL_DAYS = 60;
const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_BYTES = 32;

// Same timing-safe-login spirit as lib/actions/auth.ts's LOGIN_DELAY_MS: a
// fixed delay applied to every credential check (password or enroll code),
// success or failure alike, so response time can't be used to distinguish
// "wrong" from "right" or speed past a guessing rate limit. Duplicated
// rather than imported — a "use server" file (lib/actions/auth.ts) can only
// export async functions, not plain constants.
export const LOGIN_DELAY_MS = 400;

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jwtSecret(): Uint8Array {
  const secret = process.env.API_JWT_SECRET;
  if (!secret) {
    throw new Error(
      "API_JWT_SECRET is not set. Required for the mobile API (see .env.example)."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(
  deviceId: string,
  role: DeviceRole
): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(deviceId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(jwtSecret());
}

export type AccessTokenClaims = { deviceId: string; role: DeviceRole };

/** Verify and decode an access token. Returns null on any failure (expired,
 * bad signature, malformed, wrong shape) — every caller only needs to know
 * "valid or not", not why. */
export async function verifyAccessToken(
  token: string
): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret(), {
      algorithms: ["HS256"],
    });
    const { sub, role } = payload;
    if (typeof sub !== "string") return null;
    if (role !== "owner" && role !== "staff") return null;
    return { deviceId: sub, role };
  } catch {
    return null;
  }
}

/** A new random refresh token, URL-safe (safe to put in a JSON string as-is). */
export function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");
}

/** SHA-256 hex digest. Used for both refresh tokens and enroll codes —
 * neither is ever stored raw. */
export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function isRefreshTokenExpired(issuedAt: Date | null): boolean {
  if (!issuedAt) return true;
  return Date.now() - issuedAt.getTime() > REFRESH_TOKEN_TTL_MS;
}

// A lastSeenAt write on literally every authenticated request would be a
// write per request for no real benefit — this is "when did we last see
// this device", not an audit log. Throttling to once a minute keeps it
// useful for "is this phone still in use" without that cost.
const LAST_SEEN_THROTTLE_MS = 60 * 1000;

export type RequireDeviceOptions = { role?: DeviceRole };

export type RequireDeviceResult =
  | { ok: true; device: { id: string; role: DeviceRole; nama: string } }
  | { ok: false; status: 401 | 403; error: string };

/**
 * The auth guard every protected app/api/v1/* route calls first. Checks the
 * Authorization: Bearer header, the device's revocation status (a JWT can't
 * be un-issued, so revocation is enforced here — in the database — not just
 * by letting the 15-minute token expire), and optionally a required role.
 */
export async function requireDevice(
  req: Request,
  options: RequireDeviceOptions = {}
): Promise<RequireDeviceResult> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) return { ok: false, status: 401, error: "Token tidak ditemukan." };

  const claims = await verifyAccessToken(match[1]);
  if (!claims) return { ok: false, status: 401, error: "Token tidak valid." };

  const device = await prisma.device.findUnique({ where: { id: claims.deviceId } });
  if (!device || device.revokedAt) {
    return { ok: false, status: 401, error: "Perangkat telah dicabut aksesnya." };
  }

  if (options.role && device.role !== options.role) {
    return { ok: false, status: 403, error: "Tidak diizinkan untuk peran ini." };
  }

  const now = Date.now();
  if (!device.lastSeenAt || now - device.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS) {
    // Fire-and-forget: worth doing, never worth failing or even delaying the
    // real request for. Two near-simultaneous requests both winning this
    // race and both writing is harmless — the value converges either way.
    void prisma.device
      .update({ where: { id: device.id }, data: { lastSeenAt: new Date(now) } })
      .catch(() => {});
  }

  return {
    ok: true,
    device: { id: device.id, role: device.role as DeviceRole, nama: device.nama },
  };
}
