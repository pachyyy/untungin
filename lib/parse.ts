/**
 * Parse a digits-only form value (strips anything non-numeric first, so a
 * value like "Rp 15.000" still parses). Returns null when absent, malformed,
 * or below `min` — callers treat null as "invalid" and surface their own
 * Indonesian error message.
 */
export function parseIntField(
  value: FormDataEntryValue | null,
  { min = 1 }: { min?: number } = {}
): number | null {
  const n = Number(String(value ?? "").replace(/[^0-9]/g, ""));
  if (!Number.isFinite(n) || n < min) return null;
  return Math.floor(n);
}
