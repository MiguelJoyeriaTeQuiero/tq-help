"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureStatusBadge } from "@/components/features/feature-status-badge";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { TicketStatusBadge } from "@/components/tickets/status-badge";
import { DEPARTMENT_LABELS } from "@/lib/utils";
import { HandThumbUpIcon, TicketIcon, ClockIcon, FlagIcon, ExclamationTriangleIcon, ArrowPathIcon, DocumentArrowDownIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

function getDefaultDates() {
  const to = new Date();
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

export default function AdminPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPERADMIN";

  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const defaults = getDefaultDates();
  const [fromDate, setFromDate] = useState(defaults.from);
  const [toDate, setToDate] = useState(defaults.to);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/metrics")
      .then((r) => r.json())
      .then((d) => { setMetrics(d); setLoading(false); });
  }, []);

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/admin/report?from=${fromDate}&to=${toDate}`);
      if (!res.ok) throw new Error("Error generando informe");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tq-help-informe-${fromDate}-${toDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("No se pudo generar el informe PDF.");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <AppLayout title="Panel de administración"><div className="text-center py-12 text-slate-400">Cargando métricas...</div></AppLayout>;

  return (
    <AppLayout title="Panel de administración">
      <div className="space-y-6">

        {/* PDF Export — solo SUPERADMIN */}
        {isSuperAdmin && (
          <Card className="p-4 border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-800">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div>
                <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 mb-1">Exportar informe PDF</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400">Genera un informe con los KPIs del periodo seleccionado</p>
              </div>
              <div className="flex flex-wrap items-end gap-3 sm:ml-auto">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-indigo-800 dark:text-indigo-300">Desde</label>
                  <input
                    type="date"
                    value={fromDate}
                    max={toDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-indigo-800 dark:text-indigo-300">Hasta</label>
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setToDate(e.target.value)}
                    className="rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white transition-colors shadow-sm"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  {downloading ? "Generando…" : "Descargar Informe PDF"}
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* KPIs — row 1 */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2"><TicketIcon className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{metrics.openTickets}</p>
                <p className="text-xs text-slate-500">Tickets abiertos</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-50 p-2"><ClockIcon className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{metrics.avgResolutionHours}h</p>
                <p className="text-xs text-slate-500">Tiempo medio resolución</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-50 p-2"><HandThumbUpIcon className="h-5 w-5 text-indigo-600" /></div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{metrics.topFeatures?.length ?? 0}</p>
                <p className="text-xs text-slate-500">Peticiones activas</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-50 p-2"><FlagIcon className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {metrics.complaintsByCategory?.reduce((a: number, c: any) => a + c._count.id, 0) ?? 0}
                </p>
                <p className="text-xs text-slate-500">Denuncias totales</p>
              </div>
            </div>
          </Card>
        </div>

        {/* KPIs — row 2 */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-50 p-2"><ExclamationTriangleIcon className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-2xl font-bold text-red-600">{metrics.slaBreaches ?? 0}</p>
                <p className="text-xs text-slate-500">SLA incumplidos</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2"><ArrowPathIcon className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{metrics.inProgressTickets ?? 0}</p>
                <p className="text-xs text-slate-500">Tickets en progreso</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Tickets por departamento */}
          <Card>
            <CardHeader><CardTitle>Tickets abiertos por departamento</CardTitle></CardHeader>
            <CardContent>
              {metrics.ticketsByDept?.length === 0 ? (
                <p className="text-sm text-slate-400">Sin datos</p>
              ) : (
                <ul className="space-y-2">
                  {metrics.ticketsByDept?.map((d: any) => (
                    <li key={d.targetDept} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{DEPARTMENT_LABELS[d.targetDept as keyof typeof DEPARTMENT_LABELS]}</span>
                      <span className="font-semibold text-slate-900">{d._count.id}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Peticiones más votadas */}
          <Card>
            <CardHeader><CardTitle>Peticiones más votadas</CardTitle></CardHeader>
            <CardContent>
              {metrics.topFeatures?.length === 0 ? (
                <p className="text-sm text-slate-400">Sin datos</p>
              ) : (
                <ul className="space-y-2">
                  {metrics.topFeatures?.map((f: any) => (
                    <li key={f.id} className="flex items-start justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex items-center gap-1 text-indigo-600 font-bold whitespace-nowrap">
                          <HandThumbUpIcon className="h-3 w-3" />{f.voteCount}
                        </span>
                        <Link href={`/peticiones/${f.id}`} className="truncate text-slate-700 hover:text-indigo-600">
                          {f.title}
                        </Link>
                      </div>
                      <FeatureStatusBadge status={f.status} />
                    </li>
                  ))}
                </ul>
              )}
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
              {metrics.complaintsByCategory?.length === 0 ? (
                <p className="text-sm text-slate-400">Sin datos</p>
              ) : (
                <ul className="space-y-2">
                  {metrics.complaintsByCategory?.map((c: any) => (
                    <li key={c.category} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 capitalize">{c.category.toLowerCase().replace(/_/g, " ")}</span>
                      <span className="font-semibold text-slate-900">{c._count.id}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tickets urgentes */}
        {(() => {
          const urgentTickets = metrics.recentActivity?.filter(
            (t: any) =>
              (t.priority === "CRITICA" || t.priority === "ALTA") &&
              t.status === "ABIERTO"
          ) ?? [];
          if (urgentTickets.length === 0) return null;
          return (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  Tickets urgentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {urgentTickets.map((t: any) => (
                    <li key={t.id} className="flex items-center gap-3 text-sm">
                      <PriorityBadge priority={t.priority} />
                      <Link href={`/tickets/${t.id}`} className="flex-1 truncate text-slate-700 hover:text-indigo-600">
                        {t.title}
                      </Link>
                      <TicketStatusBadge status={t.status} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })()}

        {/* Enlace a gestión de denuncias */}
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
      </div>
    </AppLayout>
  );
}
