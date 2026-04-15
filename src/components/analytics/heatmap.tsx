"use client";

import { useState } from "react";

interface Props {
  map: Record<string, number>;
  maxCount: number;
}

const DAYS    = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const HOURS   = Array.from({ length: 24 }, (_, i) => i);

function intensity(count: number, max: number): string {
  if (!count || !max) return "bg-slate-100";
  const pct = count / max;
  if (pct < 0.1) return "bg-indigo-50";
  if (pct < 0.25) return "bg-indigo-100";
  if (pct < 0.4) return "bg-indigo-200";
  if (pct < 0.55) return "bg-indigo-300";
  if (pct < 0.7) return "bg-indigo-400";
  if (pct < 0.85) return "bg-indigo-500";
  return "bg-indigo-600";
}

export function IncidentHeatmap({ map, maxCount }: Props) {
  const [tooltip, setTooltip] = useState<{ dow: number; hour: number; count: number } | null>(null);

  if (maxCount === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        Sin datos en los últimos 90 días
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Tooltip */}
      {tooltip && (
        <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-white">
          <span className="font-medium">{DAYS[tooltip.dow]}</span>
          <span className="text-slate-400">·</span>
          <span>{String(tooltip.hour).padStart(2, "0")}:00 – {String(tooltip.hour + 1).padStart(2, "0")}:00</span>
          <span className="text-slate-400">·</span>
          <span className="font-semibold text-indigo-300">{tooltip.count} tickets</span>
        </div>
      )}

      <div className="min-w-[640px]">
        {/* Hour labels */}
        <div className="flex mb-1 pl-10">
          {HOURS.filter((h) => h % 3 === 0).map((h) => (
            <div
              key={h}
              className="text-[10px] text-slate-400 text-center"
              style={{ width: `${(3 / 24) * 100}%` }}
            >
              {String(h).padStart(2, "0")}h
            </div>
          ))}
        </div>

        {/* Grid rows */}
        {DAYS.map((day, dow) => (
          <div key={dow} className="flex items-center mb-1 gap-1">
            <span className="w-9 text-[10px] text-slate-400 text-right shrink-0">{day}</span>
            <div className="flex flex-1 gap-0.5">
              {HOURS.map((hour) => {
                const key   = `${dow}-${hour}`;
                const count = map[key] ?? 0;
                return (
                  <div
                    key={hour}
                    title={`${day} ${String(hour).padStart(2, "0")}:00 — ${count} tickets`}
                    onMouseEnter={() => setTooltip({ dow, hour, count })}
                    onMouseLeave={() => setTooltip(null)}
                    className={`flex-1 rounded-sm cursor-default transition-opacity hover:opacity-75 ${intensity(count, maxCount)}`}
                    style={{ height: 18 }}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-3 pl-10">
          <span className="text-[10px] text-slate-400 mr-1">Menos</span>
          {["bg-slate-100", "bg-indigo-100", "bg-indigo-200", "bg-indigo-300", "bg-indigo-400", "bg-indigo-500", "bg-indigo-600"].map((cls) => (
            <div key={cls} className={`h-3 w-4 rounded-sm ${cls}`} />
          ))}
          <span className="text-[10px] text-slate-400 ml-1">Más</span>
        </div>
      </div>
    </div>
  );
}
