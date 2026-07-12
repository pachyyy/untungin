import { STATUS_LABEL, type Status } from "@/lib/calc";
import { Badge, type BadgeProps } from "@/components/ui/Badge";

const variantByStatus: Record<Status, BadgeProps["variant"]> = {
  baru: "default",
  diproses: "warning",
  dikirim: "info",
  selesai: "success",
};

export function StatusBadge({ status }: { status: string }) {
  const s = (status as Status) in variantByStatus ? (status as Status) : "baru";
  return <Badge variant={variantByStatus[s]}>{STATUS_LABEL[s]}</Badge>;
}
