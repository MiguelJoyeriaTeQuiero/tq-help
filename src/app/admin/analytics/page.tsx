"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveMetrics } from "@/components/analytics/live-metrics";
import { AgentMetricsTable } from "@/components/analytics/agent-metrics-table";
import { DocumentArrowDownIcon, TableCellsIcon } from "@heroicons/react/24/outline";
import { Skeleton } from "@/components/ui/skeleton";

// Dynamic imports to avoid SSR issues with recharts / DOM-dependent components
const SlaTrendChart  = dynamic(() => import("@/components/analytics/sla-trend-chart").then((m) => ({ default: m.SlaTrendChart })), { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> });
const IncidentHeatmap = dynamic(() => import("@/components/analytics/heatmap").then((m) => ({ default: m.IncidentHeatmap })), { ssr: false, loading: () => <Skeleton className="h-40 w-full" /> });

export default function AnalyticsPage() {
  const [slaData,     setSlaData]     = useState<any[]>([]);
  const [heatmap,     setHeatmap]     = useState<{ map: Record<string, number>; maxCount: number } | null>(null);
  const [agents,      setAgents]      = useState<any[]>([]);
  const [loadingSla,  setLoadingSla]  = useState(true);
  const [loadingHm,   setLoadingHm]   = useState(true);
  const [loadingAg,   setLoadingAg]   = useState(true);
  const [downloading, setDownloading] = useState<"tickets" | "features" | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics/sla-trend")
      .then((r) => r.json())
      .then((d) => { setSlaData(d); setLoadingSla(false); })
      .catch(() => setLoadingSla(false));

    fetch("/api/admin/analytics/heatmap")
      .then((r) => r.json())
      .then((d) => { setHeatmap(d); setLoadingHm(false); })
      .catch(() => setLoadingHm(false));

    fetch("/api/admin/agent-metrics")
      .then((r) => r.json())
      .then((d) => { setAgents(Array.isArray(d) ? d : []); setLoadingAg(false); })
      .catch(() => setLoadingAg(false));
  }, []);

  const exportCsv = async (type: "tickets" | "features") => {
    setDownloading(type);
    try {
      const endpoint = type === "tickets" ? "/api/tickets/export" : "/api/features/export";
      const name     = type === "tickets" ? "tickets" : "peticiones";
      const res  = await fetch(endpoint);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("No se pudo exportar.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <AppLayout title="Analytics">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ── Título ── */}
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Análisis y Reporting</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Métricas en tiempo real, tendencias y productividad del equipo
          </p>
        </div>

        {/* ── 1. Live KPIs ── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
            Métricas en tiempo real
          </h2>
          <LiveMetrics />
        </section>

        {/* ── 2. SLA Trend Chart ── */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Cumplimiento SLA — últimas 12 semanas</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Barras: tickets cumplidos (verde) vs incumplidos (rojo) · Línea: % cumplimiento
              </p>
            </CardHeader>
            <CardContent>
              {loadingSla ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <SlaTrendChart data={slaData} />
              )}
            </CardContent>
          </Card>
        </section>

        {/* ── 3. Heatmap ── */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Mapa de calor de incidencias</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Distribución de tickets creados por hora y día de la semana (últimos 90 días)
              </p>
            </CardHeader>
            <CardContent>
              {loadingHm ? (
                <Skeleton className="h-40 w-full" />
              ) : heatmap ? (
                <IncidentHeatmap map={heatmap.map} maxCount={heatmap.maxCount} />
              ) : null}
            </CardContent>
          </Card>
        </section>

        {/* ── 4. Agent Metrics ── */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Métricas por agente</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Productividad individual — haz clic en las cabeceras para ordenar
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {loadingAg ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <AgentMetricsTable data={agents} />
              )}
            </CardContent>
          </Card>
        </section>

        {/* ── 5. Exportar ── */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TableCellsIcon className="h-5 w-5 text-slate-500" />
                Exportar datos
              </CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Descarga en formato CSV, compatible con Excel y Google Sheets
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => exportCsv("tickets")}
                  disabled={downloading === "tickets"}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-colors shadow-sm"
                >
                  <DocumentArrowDownIcon className="h-4 w-4 text-indigo-500" />
                  {downloading === "tickets" ? "Exportando..." : "Exportar tickets CSV"}
                </button>
                <button
                  onClick={() => exportCsv("features")}
                  disabled={downloading === "features"}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-colors shadow-sm"
                >
                  <DocumentArrowDownIcon className="h-4 w-4 text-amber-500" />
                  {downloading === "features" ? "Exportando..." : "Exportar peticiones CSV"}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Los archivos incluyen UTF-8 BOM para compatibilidad con Excel. Los tickets exportados incluyen:
                ID, título, estado, prioridad, autor, departamento, asignado, etiquetas, SLA y fechas.
              </p>
            </CardContent>
          </Card>
        </section>

      </div>
    </AppLayout>
  );
}
