"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureStatusBadge } from "@/components/features/feature-status-badge";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { TicketStatusBadge } from "@/components/tickets/status-badge";
import { AgentMetricsTable } from "@/components/analytics/agent-metrics-table";
import { getDeptLabel } from "@/lib/utils";
import {
  HandThumbUpIcon, TicketIcon, ClockIcon, FlagIcon,
  ExclamationTriangleIcon, ArrowPathIcon, DocumentArrowDownIcon,
  TableCellsIcon, CalendarIcon,
} from "@heroicons/react/24/outline";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

// Dynamic imports — chart libs need browser APIs
const SlaTrendChart   = dynamic(() => import("@/components/analytics/sla-trend-chart").then((m) => ({ default: m.SlaTrendChart })),   { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> });
const IncidentHeatmap = dynamic(() => import("@/components/analytics/heatmap").then((m) => ({ default: m.IncidentHeatmap })), { ssr: false, loading: () => <Skeleton className="h-44 w-full" /> });

// ── Live KPI strip (SSE) ──────────────────────────────────────────────────

type LiveStatus = "connecting" | "live" | "error";
interface LiveData { openTickets: number; slaBreaches: number; inProgressTickets: number; todayCount: number; timestamp: string; }

function useLiveMetrics() {
  const [data, setData]     = useState<LiveData | null>(null);
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const esRef = useRef<EventSource | null>(null);

  const connect = () => {
    esRef.current?.close();
    setStatus("connecting");
    const es = new EventSource("/api/admin/metrics/stream");
    esRef.current = es;
    es.onmessage = (e) => { try { setData(JSON.parse(e.data)); setStatus("live"); } catch {} };
    es.onerror   = () => { setStatus("error"); es.close(); setTimeout(connect, 15_000); };
  };

  useEffect(() => { connect(); return () => esRef.current?.close(); }, []); // eslint-disable-line
  return { data, status };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function getDefaultDates() {
  const to   = new Date();
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return { from: from.toISOString().split("T")[0], to: to.toISOString().split("T")[0] };
}

const TABS = [
  { id: "resumen",   label: "Resumen" },
  { id: "analytics", label: "Analytics" },
  { id: "agentes",   label: "Agentes" },
  { id: "exportar",  label: "Exportar" },
] as const;
type TabId = (typeof TABS)[number]["id"];

// ── Page ──────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: session }   = useSession();
  const isSuperAdmin        = session?.user?.role === "SUPERADMIN";

  const [tab, setTab]               = useState<TabId>("resumen");
  const [loaded, setLoaded]         = useState<Set<TabId>>(new Set(["resumen"]));

  // Resumen data
  const [metrics,     setMetrics]   = useState<any>(null);
  const [loadingMain, setLoadingM]  = useState(true);

  // Analytics data
  const [slaData,  setSlaData]      = useState<any[]>([]);
  const [heatmap,  setHeatmap]      = useState<{ map: Record<string,number>; maxCount: number } | null>(null);
  const [loadingAn, setLoadingAn]   = useState(false);

  // Agents data
  const [agents,    setAgents]      = useState<any[]>([]);
  const [loadingAg, setLoadingAg]   = useState(false);

  // Export
  const defaults                    = getDefaultDates();
  const [fromDate,  setFromDate]    = useState(defaults.from);
  const [toDate,    setToDate]      = useState(defaults.to);
  const [downloading, setDl]        = useState<string | null>(null);

  // Live metrics (SSE)
  const { data: live, status: liveStatus } = useLiveMetrics();

  // Load main metrics
  useEffect(() => {
    fetch("/api/admin/metrics")
      .then((r) => r.json())
      .then((d) => { setMetrics(d); setLoadingM(false); });
  }, []);

  // Lazy-load per tab
  const switchTab = (id: TabId) => {
    setTab(id);
    if (loaded.has(id)) return;
    setLoaded((p) => new Set([...p, id]));

    if (id === "analytics") {
      setLoadingAn(true);
      Promise.all([
        fetch("/api/admin/analytics/sla-trend").then((r) => r.json()),
        fetch("/api/admin/analytics/heatmap").then((r) => r.json()),
      ]).then(([sla, hm]) => { setSlaData(sla); setHeatmap(hm); setLoadingAn(false); });
    }
    if (id === "agentes") {
      setLoadingAg(true);
      fetch("/api/admin/agent-metrics").then((r) => r.json())
        .then((d) => { setAgents(Array.isArray(d) ? d : []); setLoadingAg(false); });
    }
  };

  const downloadFile = async (type: "pdf" | "tickets-csv" | "features-csv") => {
    setDl(type);
    try {
      let url: string, filename: string;
      if (type === "pdf") {
        url = `/api/admin/report?from=${fromDate}&to=${toDate}`;
        filename = `tq-help-informe-${fromDate}-${toDate}.pdf`;
      } else if (type === "tickets-csv") {
        url = "/api/tickets/export";
        filename = `tickets-${new Date().toISOString().slice(0,10)}.csv`;
      } else {
        url = "/api/features/export";
        filename = `peticiones-${new Date().toISOString().slice(0,10)}.csv`;
      }
      const res  = await fetch(url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const a    = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: filename });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(a.href);
    } catch { alert("No se pudo generar el archivo."); }
    finally { setDl(null); }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <AppLayout title="Panel de administración">
      <div className="space-y-5">

        {/* ── Tab bar ── */}
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? "border-indigo-500 text-indigo-700 dark:text-indigo-300"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}

          {/* Live indicator — always visible */}
          <div className="ml-auto flex items-center gap-1.5 pb-2">
            <span className={`h-2 w-2 rounded-full ${
              liveStatus === "live"       ? "bg-green-500 animate-pulse" :
              liveStatus === "connecting" ? "bg-amber-400 animate-pulse" : "bg-red-400"
            }`} />
            <span className="text-xs text-slate-400">
              {liveStatus === "live" ? "En vivo" : liveStatus === "connecting" ? "Conectando…" : "Reconectando"}
            </span>
          </div>
        </div>

        {/* ════════════════ TAB: RESUMEN ════════════════ */}
        {tab === "resumen" && (
          <div className="space-y-5">

            {/* Live KPIs */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <LiveKpi icon={<TicketIcon className="h-5 w-5 text-blue-600"/>}    bg="bg-blue-50"    value={live?.openTickets}        label="Tickets abiertos" />
              <LiveKpi icon={<ArrowPathIcon className="h-5 w-5 text-indigo-600"/>} bg="bg-indigo-50" value={live?.inProgressTickets}   label="En progreso" />
              <LiveKpi icon={<ExclamationTriangleIcon className="h-5 w-5 text-red-600"/>} bg="bg-red-50" value={live?.slaBreaches} label="SLA incumplidos" alert={(live?.slaBreaches ?? 0) > 0} />
              <LiveKpi icon={<CalendarIcon className="h-5 w-5 text-emerald-600"/>} bg="bg-emerald-50" value={live?.todayCount}        label="Creados hoy" />
            </div>

            {/* Static KPIs (extra context) */}
            {loadingMain ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : metrics && (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <StatKpi icon={<ClockIcon className="h-5 w-5 text-green-600"/>}       bg="bg-green-50"  value={`${metrics.avgResolutionHours}h`} label="T. medio resolución (30d)" />
                <StatKpi icon={<HandThumbUpIcon className="h-5 w-5 text-indigo-600"/>} bg="bg-indigo-50" value={metrics.topFeatures?.length ?? 0}   label="Peticiones activas" />
                <StatKpi icon={<FlagIcon className="h-5 w-5 text-red-600"/>}           bg="bg-red-50"    value={metrics.complaintsByCategory?.reduce((a:number,c:any) => a + c._count.id, 0) ?? 0} label="Denuncias totales" />
              </div>
            )}

            {/* Content grid */}
            {loadingMain ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-3">
                    <Skeleton className="h-5 w-44" />
                    {[1,2,3,4].map(j => <Skeleton key={j} className="h-4 w-full" />)}
                  </div>
                ))}
              </div>
            ) : metrics && (
              <>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {/* Tickets por depto */}
                  <Card>
                    <CardHeader><CardTitle>Tickets abiertos por departamento</CardTitle></CardHeader>
                    <CardContent>
                      {metrics.ticketsByDept?.length === 0
                        ? <p className="text-sm text-slate-400">Sin datos</p>
                        : <ul className="space-y-2">
                            {metrics.ticketsByDept?.map((d: any) => (
                              <li key={d.targetDept} className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">{getDeptLabel(d.targetDept)}</span>
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 rounded-full bg-indigo-200" style={{ width: `${Math.max(20, d._count.id * 12)}px` }}>
                                    <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: "100%" }} />
                                  </div>
                                  <span className="font-semibold text-slate-900 w-5 text-right">{d._count.id}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                      }
                    </CardContent>
                  </Card>

                  {/* Peticiones más votadas */}
                  <Card>
                    <CardHeader><CardTitle>Peticiones más votadas</CardTitle></CardHeader>
                    <CardContent>
                      {metrics.topFeatures?.length === 0
                        ? <p className="text-sm text-slate-400">Sin datos</p>
                        : <ul className="space-y-2">
                            {metrics.topFeatures?.map((f: any) => (
                              <li key={f.id} className="flex items-start justify-between gap-2 text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="flex items-center gap-1 text-indigo-600 font-bold whitespace-nowrap">
                                    <HandThumbUpIcon className="h-3 w-3" />{f.voteCount}
                                  </span>
                                  <Link href={`/peticiones/${f.id}`} className="truncate text-slate-700 hover:text-indigo-600">{f.title}</Link>
                                </div>
                                <FeatureStatusBadge status={f.status} />
                              </li>
                            ))}
                          </ul>
                      }
                    </CardContent>
                  </Card>

                  {/* Actividad reciente */}
                  <Card>
                    <CardHeader><CardTitle>Incidencias recientes</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {metrics.recentActivity?.map((t: any) => (
                          <li key={t.id} className="flex items-center gap-3 text-sm">
                            <PriorityBadge priority={t.priority} />
                            <Link href={`/tickets/${t.id}`} className="flex-1 truncate text-slate-700 hover:text-indigo-600">{t.title}</Link>
                            <TicketStatusBadge status={t.status} />
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Denuncias por categoría */}
                  <Card>
                    <CardHeader><CardTitle>Denuncias por categoría</CardTitle></CardHeader>
                    <CardContent>
                      {metrics.complaintsByCategory?.length === 0
                        ? <p className="text-sm text-slate-400">Sin datos</p>
                        : <ul className="space-y-2">
                            {metrics.complaintsByCategory?.map((c: any) => (
                              <li key={c.category} className="flex items-center justify-between text-sm">
                                <span className="text-slate-600 capitalize">{c.category.toLowerCase().replace(/_/g, " ")}</span>
                                <span className="font-semibold text-slate-900">{c._count.id}</span>
                              </li>
                            ))}
                          </ul>
                      }
                    </CardContent>
                  </Card>
                </div>

                {/* Tickets urgentes */}
                {(() => {
                  const urgent = metrics.recentActivity?.filter((t: any) => (t.priority === "CRITICA" || t.priority === "ALTA") && t.status === "ABIERTO") ?? [];
                  if (!urgent.length) return null;
                  return (
                    <Card className="border-red-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-700">
                          <ExclamationTriangleIcon className="h-5 w-5" /> Tickets urgentes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {urgent.map((t: any) => (
                            <li key={t.id} className="flex items-center gap-3 text-sm">
                              <PriorityBadge priority={t.priority} />
                              <Link href={`/tickets/${t.id}`} className="flex-1 truncate text-slate-700 hover:text-indigo-600">{t.title}</Link>
                              <TicketStatusBadge status={t.status} />
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Canal denuncias */}
                <Card className="p-4 bg-red-50 border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-red-900">Canal de denuncias</p>
                      <p className="text-sm text-red-700">Acceso restringido a RRHH y Dirección</p>
                    </div>
                    <Link href="/admin/denuncias" className="text-sm text-red-700 hover:text-red-900 font-medium underline">
                      Gestionar denuncias →
                    </Link>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {/* ════════════════ TAB: ANALYTICS ════════════════ */}
        {tab === "analytics" && (
          <div className="space-y-5">
            {loadingAn ? (
              <div className="space-y-5">
                <Skeleton className="h-72 w-full rounded-xl" />
                <Skeleton className="h-48 w-full rounded-xl" />
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Cumplimiento SLA — últimas 12 semanas</CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Barras: cumplidos (verde) / incumplidos (rojo) · Línea: % cumplimiento
                    </p>
                  </CardHeader>
                  <CardContent>
                    <SlaTrendChart data={slaData} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Mapa de calor de incidencias</CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Distribución por hora y día de la semana — últimos 90 días
                    </p>
                  </CardHeader>
                  <CardContent>
                    {heatmap
                      ? <IncidentHeatmap map={heatmap.map} maxCount={heatmap.maxCount} />
                      : <div className="text-sm text-slate-400 py-8 text-center">Sin datos</div>}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* ════════════════ TAB: AGENTES ════════════════ */}
        {tab === "agentes" && (
          <Card>
            <CardHeader>
              <CardTitle>Métricas por agente</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Haz clic en las cabeceras para ordenar · Valoración CSAT media de tickets resueltos
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {loadingAg ? (
                <div className="p-6 space-y-3">
                  {[1,2,3,4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <AgentMetricsTable data={agents} />
              )}
            </CardContent>
          </Card>
        )}

        {/* ════════════════ TAB: EXPORTAR ════════════════ */}
        {tab === "exportar" && (
          <div className="space-y-5">

            {/* CSV exports */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TableCellsIcon className="h-5 w-5 text-slate-500" /> Exportar a CSV
                </CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Compatible con Excel y Google Sheets · Incluye UTF-8 BOM automáticamente
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  <ExportBtn
                    label="Tickets"
                    sublabel="ID, estado, prioridad, autor, SLA, etiquetas…"
                    icon={<TicketIcon className="h-4 w-4 text-indigo-500" />}
                    loading={downloading === "tickets-csv"}
                    onClick={() => downloadFile("tickets-csv")}
                  />
                  <ExportBtn
                    label="Peticiones"
                    sublabel="Título, estado, votos, departamento, autor…"
                    icon={<HandThumbUpIcon className="h-4 w-4 text-amber-500" />}
                    loading={downloading === "features-csv"}
                    onClick={() => downloadFile("features-csv")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* PDF report — only SUPERADMIN */}
            {isSuperAdmin && (
              <Card className="border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DocumentArrowDownIcon className="h-5 w-5 text-indigo-600" /> Informe PDF de KPIs
                  </CardTitle>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                    Genera un informe ejecutivo con métricas del período seleccionado
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-indigo-800 dark:text-indigo-300">Desde</label>
                      <input
                        type="date" value={fromDate} max={toDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-indigo-800 dark:text-indigo-300">Hasta</label>
                      <input
                        type="date" value={toDate} min={fromDate} max={new Date().toISOString().split("T")[0]}
                        onChange={(e) => setToDate(e.target.value)}
                        className="rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                    <button
                      onClick={() => downloadFile("pdf")}
                      disabled={downloading === "pdf"}
                      className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-4 py-2 text-sm font-semibold text-white transition-colors shadow-sm"
                    >
                      <DocumentArrowDownIcon className="h-4 w-4" />
                      {downloading === "pdf" ? "Generando…" : "Descargar PDF"}
                    </button>
                  </div>
                  <p className="text-xs text-indigo-500 mt-3">
                    El informe semanal también se envía automáticamente cada lunes a las 8:00h a todos los administradores.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

      </div>
    </AppLayout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function LiveKpi({ icon, bg, value, label, alert = false }: {
  icon: React.ReactNode; bg: string; value?: number; label: string; alert?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
      <div className={`rounded-lg p-2 ${bg} flex-shrink-0`}>{icon}</div>
      <div>
        <p className={`text-2xl font-bold tabular-nums ${alert ? "text-red-600" : "text-slate-900 dark:text-slate-100"}`}>
          {value ?? <span className="text-slate-300 animate-pulse">—</span>}
        </p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function StatKpi({ icon, bg, value, label }: {
  icon: React.ReactNode; bg: string; value: string | number; label: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 flex items-center gap-3">
      <div className={`rounded-lg p-1.5 ${bg} flex-shrink-0`}>{icon}</div>
      <div>
        <p className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function ExportBtn({ label, sublabel, icon, loading, onClick }: {
  label: string; sublabel: string; icon: React.ReactNode; loading: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50 disabled:opacity-60 transition-colors shadow-sm min-w-[200px]"
    >
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-sm font-medium text-slate-700">{loading ? "Exportando…" : `Exportar ${label} CSV`}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>
      </div>
    </button>
  );
}
