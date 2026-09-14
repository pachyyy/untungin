"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatRupiah } from "@/lib/format";

type Point = { label: string; untung: number; omzet: number };

function compact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "jt";
  if (n >= 1_000) return Math.round(n / 1_000) + "rb";
  return String(n);
}

export function LaporanChart({ data }: { data: Point[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="untungGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--glass-accent)" />
              <stop offset="100%" stopColor="var(--glass-accent2)" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-divider)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--glass-ink-dim)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={compact}
            tick={{ fontSize: 11, fill: "var(--glass-ink-dim)" }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            cursor={{ fill: "var(--panel)" }}
            formatter={(value: number, name) => [
              formatRupiah(value),
              name === "untung" ? "Untung" : "Omzet",
            ]}
            contentStyle={{
              borderRadius: 14,
              border: "1px solid var(--panel-border)",
              background: "var(--panel-strong)",
              backdropFilter: "blur(20px)",
              color: "var(--glass-ink)",
              fontSize: 13,
            }}
            labelStyle={{ color: "var(--glass-ink)" }}
          />
          <Bar dataKey="untung" fill="url(#untungGradient)" radius={[6, 6, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
