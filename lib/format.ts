/** Format an integer amount of Rupiah with thousands separators, e.g. 150000 -> "Rp 150.000". */
export function formatRupiah(value: number): string {
  const rounded = Math.round(value || 0);
  return "Rp " + rounded.toLocaleString("id-ID");
}

/** Format a number as a percentage with one decimal, e.g. 33.333 -> "33,3%". */
export function formatPercent(value: number): string {
  return (
    (value || 0).toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }) + "%"
  );
}

const BULAN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/** e.g. "12 Jul 2026" */
export function formatTanggal(date: Date): string {
  return `${date.getDate()} ${BULAN[date.getMonth()]} ${date.getFullYear()}`;
}

/** e.g. "Jul 2026" for a "2026-07" key */
export function formatBulanKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${BULAN[m - 1]} ${y}`;
}
