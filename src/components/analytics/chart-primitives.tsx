"use client";

import { CartesianGrid, Tooltip } from "recharts";
import { useEffect, useState } from "react";

function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const check = () => setDark(el.classList.contains("dark"));
    check();
    const mo = new MutationObserver(check);
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return dark;
}

export function useChartTokens() {
  const dark = useDark();
  return {
    grid: dark ? "#334155" : "#e2e8f0",
    axis: dark ? "#94a3b8" : "#94a3b8",
    text: dark ? "#cbd5e1" : "#475569",
    muted: dark ? "#64748b" : "#94a3b8",
    surface: dark ? "#0f172a" : "#ffffff",
    border: dark ? "#334155" : "#e2e8f0",
  };
}

interface ChartGridProps {
  vertical?: boolean;
}
export function ChartGrid({ vertical = false }: ChartGridProps) {
  const t = useChartTokens();
  return <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={vertical} />;
}

export function axisProps() {
  const t = useChartTokens();
  return {
    tick: { fontSize: 11, fill: t.muted },
    tickLine: false,
    axisLine: false,
  } as const;
}

export interface ChartTooltipRow {
  color: string;
  name?: string;
  dataKey?: string | number;
  value: number | string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  titlePrefix?: string;
  formatValue?: (row: ChartTooltipRow) => string;
}

function TooltipContent({ active, payload, label, titlePrefix, formatValue }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-token-lg border border-slate-200 bg-white/95 backdrop-blur-sm p-3 shadow-token-xl text-xs dark:border-slate-700 dark:bg-slate-900/95">
      <p className="font-semibold text-slate-700 dark:text-slate-100 mb-1.5">
        {titlePrefix ? `${titlePrefix} ${label}` : label}
      </p>
      {payload.map((p) => {
        const row = p as unknown as ChartTooltipRow;
        return (
          <div key={String(row.dataKey)} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />
            <span className="text-slate-600 dark:text-slate-300">{row.name}:</span>
            <span className="font-medium text-slate-900 dark:text-slate-50">
              {formatValue ? formatValue(row) : row.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface ChartTooltipWrapperProps {
  titlePrefix?: string;
  formatValue?: (row: ChartTooltipRow) => string;
}
export function ChartTooltip({ titlePrefix, formatValue }: ChartTooltipWrapperProps) {
  return (
    <Tooltip
      cursor={{ fill: "rgba(148,163,184,0.08)" }}
      content={(p: any) => <TooltipContent {...p} titlePrefix={titlePrefix} formatValue={formatValue} />}
    />
  );
}

// Gradiente vertical reutilizable para areas/barras
interface ChartGradientProps {
  id: string;
  color: string;
  startOpacity?: number;
  endOpacity?: number;
}
export function ChartGradient({ id, color, startOpacity = 0.6, endOpacity = 0 }: ChartGradientProps) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={startOpacity} />
      <stop offset="100%" stopColor={color} stopOpacity={endOpacity} />
    </linearGradient>
  );
}
