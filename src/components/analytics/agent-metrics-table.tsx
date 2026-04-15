"use client";

import { useState } from "react";
import { getDeptLabel } from "@/lib/utils";
import { StarRating } from "@/components/ui/star-rating";

interface AgentMetric {
  id: string;
  name: string;
  department: string;
  total: number;
  resolved: number;
  open: number;
  avgResolutionHours: number | null;
  avgCsat: number | null;
  csatCount: number;
}

type SortKey = keyof AgentMetric;

export function AgentMetricsTable({ data }: { data: AgentMetric[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("resolved");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey] ?? (sortDir === "desc" ? -Infinity : Infinity);
    const bv = b[sortKey] ?? (sortDir === "desc" ? -Infinity : Infinity);
    if (typeof av === "string" && typeof bv === "string") {
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
  });

  const Th = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      onClick={() => toggleSort(k)}
      className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700 transition-colors whitespace-nowrap"
    >
      {label}
      {sortKey === k && (
        <span className="ml-1 text-indigo-500">{sortDir === "desc" ? "↓" : "↑"}</span>
      )}
    </th>
  );

  if (!data.length) {
    return (
      <div className="py-10 text-center text-sm text-slate-400">
        No hay agentes con tickets asignados todavía.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-100">
          <tr>
            <Th label="Agente"            k="name" />
            <Th label="Departamento"      k="department" />
            <Th label="Total asignados"   k="total" />
            <Th label="Resueltos"         k="resolved" />
            <Th label="Abiertos"          k="open" />
            <Th label="T. medio resolución" k="avgResolutionHours" />
            <Th label="Valoración media"  k="avgCsat" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {sorted.map((agent) => (
            <tr key={agent.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-800">{agent.name}</td>
              <td className="px-4 py-3 text-slate-500">{getDeptLabel(agent.department)}</td>
              <td className="px-4 py-3 text-center font-semibold">{agent.total}</td>
              <td className="px-4 py-3 text-center">
                <span className="inline-flex items-center justify-center rounded-full bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 min-w-[28px]">
                  {agent.resolved}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                {agent.open > 0 ? (
                  <span className="inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 min-w-[28px]">
                    {agent.open}
                  </span>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-center text-slate-600">
                {agent.avgResolutionHours !== null ? `${agent.avgResolutionHours}h` : <span className="text-slate-300">—</span>}
              </td>
              <td className="px-4 py-3">
                {agent.avgCsat !== null ? (
                  <div className="flex items-center gap-2">
                    <StarRating value={Math.round(agent.avgCsat)} readonly size="sm" />
                    <span className="text-xs text-slate-500">
                      {agent.avgCsat.toFixed(1)} ({agent.csatCount})
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-300 text-sm">Sin valoraciones</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
