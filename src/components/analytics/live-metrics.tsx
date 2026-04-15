"use client";

import { useState, useEffect, useRef } from "react";
import { TicketIcon, ExclamationTriangleIcon, ArrowPathIcon, CalendarIcon } from "@heroicons/react/24/outline";

interface LiveData {
  openTickets: number;
  slaBreaches: number;
  inProgressTickets: number;
  todayCount: number;
  timestamp: string;
}

type Status = "connecting" | "live" | "error";

export function LiveMetrics() {
  const [data, setData]     = useState<LiveData | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const connect = () => {
    if (esRef.current) esRef.current.close();
    setStatus("connecting");

    const es = new EventSource("/api/admin/metrics/stream");
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        setData(JSON.parse(e.data));
        setStatus("live");
        setLastUpdate(new Date());
      } catch {}
    };

    es.onerror = () => {
      setStatus("error");
      es.close();
      // Reconnect after 15 seconds
      setTimeout(connect, 15_000);
    };
  };

  useEffect(() => {
    connect();
    return () => { esRef.current?.close(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const STATUS_CONFIG: Record<Status, { label: string; dot: string }> = {
    connecting: { label: "Conectando...", dot: "bg-amber-400 animate-pulse" },
    live:       { label: "En vivo",       dot: "bg-green-500 animate-pulse" },
    error:      { label: "Reconectando", dot: "bg-red-400 animate-pulse"   },
  };
  const sc = STATUS_CONFIG[status];

  return (
    <div className="space-y-4">
      {/* Status indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${sc.dot}`} />
          <span className="text-sm font-medium text-slate-600">{sc.label}</span>
        </div>
        {lastUpdate && (
          <span className="text-xs text-slate-400">
            Actualizado: {lastUpdate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={<TicketIcon className="h-5 w-5 text-blue-600" />}
          bg="bg-blue-50"
          value={data?.openTickets ?? "—"}
          label="Tickets abiertos"
        />
        <KpiCard
          icon={<ArrowPathIcon className="h-5 w-5 text-indigo-600" />}
          bg="bg-indigo-50"
          value={data?.inProgressTickets ?? "—"}
          label="En progreso"
        />
        <KpiCard
          icon={<ExclamationTriangleIcon className="h-5 w-5 text-red-600" />}
          bg="bg-red-50"
          value={data?.slaBreaches ?? "—"}
          label="SLA incumplidos"
          alert={(data?.slaBreaches ?? 0) > 0}
        />
        <KpiCard
          icon={<CalendarIcon className="h-5 w-5 text-emerald-600" />}
          bg="bg-emerald-50"
          value={data?.todayCount ?? "—"}
          label="Creados hoy"
        />
      </div>
    </div>
  );
}

function KpiCard({
  icon, bg, value, label, alert = false,
}: {
  icon: React.ReactNode;
  bg: string;
  value: number | string;
  label: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3">
      <div className={`rounded-lg p-2 ${bg} flex-shrink-0`}>{icon}</div>
      <div>
        <p className={`text-2xl font-bold ${alert ? "text-red-600" : "text-slate-900"}`}>{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}
