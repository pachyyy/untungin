import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { checkPassword } from "@/lib/auth";
import {
  type DeviceRole,
  signAccessToken,
  generateRefreshToken,
  hashSecret,
  isRefreshTokenExpired,
  delay,
  LOGIN_DELAY_MS,
} from "@/lib/api/auth";
import { ok, fail, type ServiceResult } from "@/lib/services/types";

export type DeviceSession = {
  deviceId: string;
  role: DeviceRole;
  nama: string;
  accessToken: string;
  refreshToken: string;
};

/** Creates a brand-new device row with a freshly issued session. Used by
 * both owner login and code enrollment — each is "a device joins for the
 * first time", never "an existing device logs in again" (there's no
 * concept of re-authenticating an existing device other than refreshing its
 * token; losing the refresh token means enrolling again). */
async function createDeviceWithSession(
  nama: string,
  role: DeviceRole
): Promise<DeviceSession> {
  const refreshToken = generateRefreshToken();
  const device = await prisma.device.create({
    data: {
      nama,
      role,
      refreshTokenHash: hashSecret(refreshToken),
      refreshTokenIssuedAt: new Date(),
    },
  });
  const accessToken = await signAccessToken(device.id, role);
  return { deviceId: device.id, role, nama: device.nama, accessToken, refreshToken };
}

export type LoginOwnerInput = { password: string; nama: string };

/** The owner's phone authenticates with the same APP_PASSWORD the web login
 * uses — there's still only one shared secret, mobile just turns it into a
 * revocable per-device session instead of a cookie. */
export async function loginOwner(
  input: LoginOwnerInput
): Promise<ServiceResult<DeviceSession>> {
  const nama = input.nama.trim() || "Perangkat";

  const [passwordOk] = await Promise.all([
    Promise.resolve(checkPassword(input.password)),
    delay(LOGIN_DELAY_MS),
  ]);
  if (!passwordOk) return fail("Password salah.", 401);

  const session = await createDeviceWithSession(nama, "owner");
  return ok(session);
}

export type EnrollWithCodeInput = { code: string; nama?: string };

/** A staff phone authenticates with a one-time code the owner generated —
 * it never sees or needs APP_PASSWORD, so it can be revoked individually
 * without touching anyone else's access. */
export async function enrollWithCode(
  input: EnrollWithCodeInput
): Promise<ServiceResult<DeviceSession>> {
  const code = input.code.trim().toUpperCase();

  // Same fixed-delay reasoning as loginOwner: don't let response time leak
  // whether a code is wrong, expired, or already used.
  await delay(LOGIN_DELAY_MS);
  if (!code) return fail("Kode tidak valid.", 401);

  const codeHash = hashSecret(code);
  const refreshToken = generateRefreshToken();

  const created = await prisma.$transaction(async (tx) => {
    const record = await tx.enrollCode.findUnique({ where: { codeHash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) return null;

    // Guarded claim, mirroring the guarded stock decrement in
    // lib/services/pesanan.ts: the read above is only a fast pre-check, this
    // conditional update is what actually prevents two concurrent requests
    // both consuming the same one-time code.
    const claim = await tx.enrollCode.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claim.count === 0) return null;

    const nama = (input.nama ?? "").trim() || record.nama;
    const role: DeviceRole = record.role === "owner" ? "owner" : "staff";
    const device = await tx.device.create({
      data: {
        nama,
        role,
        refreshTokenHash: hashSecret(refreshToken),
        refreshTokenIssuedAt: new Date(),
      },
    });
    return { id: device.id, role, nama: device.nama };
  });

  if (!created) return fail("Kode tidak valid atau sudah kedaluwarsa.", 401);

  const accessToken = await signAccessToken(created.id, created.role);
  return ok({
    deviceId: created.id,
    role: created.role,
    nama: created.nama,
    accessToken,
    refreshToken,
  });
}

/**
 * Exchanges a refresh token for a new pair, rotating the stored hash.
 *
 * Two failure shapes that look similar but mean different things:
 *   - The hash matches nothing at all -> unknown/garbage token, plain 401.
 *   - The hash matches a device's *previous* hash -> this exact token was
 *     valid once but has already been rotated past, meaning whoever is
 *     presenting it now is not the legitimate client (which moved on to the
 *     current token when it last refreshed). Treated as a leaked token and
 *     revokes the device immediately.
 */
export async function refreshTokens(
  refreshToken: string
): Promise<ServiceResult<DeviceSession>> {
  const hash = hashSecret(refreshToken);

  const current = await prisma.device.findUnique({ where: { refreshTokenHash: hash } });
  if (current) {
    if (current.revokedAt) return fail("Perangkat telah dicabut aksesnya.", 401);
    if (isRefreshTokenExpired(current.refreshTokenIssuedAt)) {
      return fail("Sesi kedaluwarsa, silakan login ulang.", 401);
    }

    const role = current.role as DeviceRole;
    const newRefreshToken = generateRefreshToken();
    await prisma.device.update({
      where: { id: current.id },
      data: {
        refreshTokenHash: hashSecret(newRefreshToken),
        refreshTokenIssuedAt: new Date(),
        previousRefreshTokenHash: hash,
      },
    });
    const accessToken = await signAccessToken(current.id, role);
    return ok({
      deviceId: current.id,
      role,
      nama: current.nama,
      accessToken,
      refreshToken: newRefreshToken,
    });
  }

  const stale = await prisma.device.findUnique({
    where: { previousRefreshTokenHash: hash },
  });
  if (stale) {
    await prisma.device.update({
      where: { id: stale.id },
      data: { revokedAt: new Date() },
    });
    return fail("Token tidak valid, perangkat telah dicabut aksesnya.", 401);
  }

  return fail("Token tidak valid.", 401);
}

/** A device logging itself out. There's no user session underneath a
 * Device to end other than the device itself, so "log out" and "revoke"
 * are the same write — just triggered from the phone instead of the
 * owner's device list. */
export async function logoutDevice(deviceId: string): Promise<ServiceResult<{ id: string }>> {
  return revokeDevice(deviceId);
}

export type DeviceListItem = {
  id: string;
  nama: string;
  role: string;
  lastSeenAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

export async function listDevices(): Promise<ServiceResult<DeviceListItem[]>> {
  const devices = await prisma.device.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      nama: true,
      role: true,
      lastSeenAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });
  return ok(devices);
}

export async function revokeDevice(deviceId: string): Promise<ServiceResult<{ id: string }>> {
  if (!deviceId) return fail("Perangkat tidak ditemukan.", 404);
  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) return fail("Perangkat tidak ditemukan.", 404);

  await prisma.device.update({ where: { id: deviceId }, data: { revokedAt: new Date() } });
  return ok({ id: deviceId });
}

const ENROLL_CODE_LENGTH = 8;
const ENROLL_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
// Excludes 0/O and 1/I — characters easy to mix up when the owner reads the
// code aloud to someone or types it on a phone's small keyboard.
const ENROLL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomEnrollCode(): string {
  const bytes = randomBytes(ENROLL_CODE_LENGTH);
  let out = "";
  for (let i = 0; i < ENROLL_CODE_LENGTH; i++) {
    out += ENROLL_CODE_ALPHABET[bytes[i] % ENROLL_CODE_ALPHABET.length];
  }
  return out;
}

export type CreateEnrollCodeInput = { nama: string; role?: "owner" | "staff" };
export type CreateEnrollCodeResult = { code: string; expiresAt: string };

/** Generates a one-time code (shown once, in the clear, to the owner) that
 * a staff phone trades for a Device session via enrollWithCode. Only the
 * hash is stored — same principle as refresh tokens. */
export async function createEnrollCode(
  input: CreateEnrollCodeInput
): Promise<ServiceResult<CreateEnrollCodeResult>> {
  const nama = input.nama.trim();
  if (!nama) return fail("Nama perangkat wajib diisi.");
  const role = input.role === "owner" ? "owner" : "staff";

  const code = randomEnrollCode();
  const expiresAt = new Date(Date.now() + ENROLL_CODE_TTL_MS);
  await prisma.enrollCode.create({
    data: { codeHash: hashSecret(code), nama, role, expiresAt },
  });

  return ok({ code, expiresAt: expiresAt.toISOString() });
}
