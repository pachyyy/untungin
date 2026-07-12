import { STATUS_LABEL, type Status } from "@/lib/calc";
import { cn } from "@/lib/cn";

const styles: Record<Status, string> = {
  baru: "bg-slate-100 text-slate-600",
  diproses: "bg-amber-100 text-amber-700",
  dikirim: "bg-blue-100 text-blue-700",
  selesai: "bg-green-100 text-green-700",
};

export function StatusBadge({ status }: { status: string }) {
  const s = (status as Status) in styles ? (status as Status) : "baru";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        styles[s]
      )}
    >
      {STATUS_LABEL[s]}
    </span>
  );
}
