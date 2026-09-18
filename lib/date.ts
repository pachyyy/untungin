/**
 * Timezone-explicit date helpers. The server may run in any timezone
 * (Vercel's default function region is UTC regardless of the `sin1` region
 * pin), but this business operates on WIB — so every date boundary the app
 * computes (month windows, report ranges, "today") must be pinned to Jakarta
 * local time, not the host's local time. Setting `TZ=Asia/Jakarta` as an env
 * var is a second line of defense, not a substitute for this — a bare
 * `new Date().getMonth()` anywhere is still wrong if that var is ever
 * missing on a new host.
 *
 * WIB (Western Indonesia Time) has been a fixed UTC+7 offset with no DST
 * since 1964, so a constant offset is exact — no IANA tz database lookup
 * needed. This also makes every function here isomorphic: safe to import
 * from both server code and "use client" components, regardless of the
 * browser's own configured timezone.
 */

export const APP_TZ = "Asia/Jakarta";
const OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7, no DST.

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * A Date whose UTC-getter fields (getUTCFullYear/getUTCMonth/…) read as
 * Jakarta wall-clock time. Internal only — its getTime() is not a real
 * instant, so never store or compare it directly; read it through the
 * getUTC* accessors.
 */
function toJakartaWallClock(d: Date): Date {
  return new Date(d.getTime() + OFFSET_MS);
}

/** Jakarta-local Y/M/D components of an instant (month is 1-indexed). */
export function jakartaParts(d: Date): { year: number; month: number; day: number } {
  const w = toJakartaWallClock(d);
  return { year: w.getUTCFullYear(), month: w.getUTCMonth() + 1, day: w.getUTCDate() };
}

/** "YYYY-MM-DD" for an instant, as a Jakarta calendar date. */
export function toDateOnlyJakarta(d: Date): string {
  const { year, month, day } = jakartaParts(d);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Today's date in Jakarta, "YYYY-MM-DD". */
export function todayJakarta(): string {
  return toDateOnlyJakarta(new Date());
}

/**
 * Parse a "YYYY-MM-DD" string as a Jakarta calendar date, returning the UTC
 * instant of that day's start (00:00:00.000 WIB) or end (23:59:59.999 WIB).
 * Use this for both date-only form inputs (`<input type="date">`) and
 * inclusive range boundaries — it replaces `new Date(dateOnlyStr)`, which
 * parses as UTC midnight and silently drifts the effective day by the local
 * offset once compared against real timestamps.
 */
export function parseDateOnlyJakarta(dateOnly: string, edge: "start" | "end"): Date {
  const time = edge === "start" ? "00:00:00.000" : "23:59:59.999";
  return new Date(`${dateOnly}T${time}+07:00`);
}

/**
 * The UTC instant of 00:00 WIB on the 1st of the Jakarta calendar month that
 * is `monthsAgo` months before `d` (0 = the month `d` falls in).
 */
export function monthStartJakarta(d: Date, monthsAgo = 0): Date {
  const { year, month } = jakartaParts(d);
  // month is 1-indexed; Date.UTC's month param is 0-indexed, so `month - 1`
  // lands on the same calendar month before subtracting monthsAgo.
  return new Date(Date.UTC(year, month - 1 - monthsAgo, 1) - OFFSET_MS);
}

/** [start, end) UTC instants bracketing the Jakarta calendar month `d` falls in. */
export function monthRangeJakarta(d: Date): { start: Date; end: Date } {
  return { start: monthStartJakarta(d, 0), end: monthStartJakarta(d, -1) };
}

/** "YYYY-MM" bucket key for an instant, as a Jakarta calendar month. */
export function monthKeyJakarta(d: Date): string {
  const { year, month } = jakartaParts(d);
  return `${year}-${pad2(month)}`;
}
