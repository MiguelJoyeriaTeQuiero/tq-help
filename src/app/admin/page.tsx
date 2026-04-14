"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureStatusBadge } from "@/components/features/feature-status-badge";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { TicketStatusBadge } from "@/components/tickets/status-badge";
import { DEPARTMENT_LABELS } from "@/lib/utils";
import { HandThumbUpIcon, TicketIcon, ClockIcon, FlagIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function AdminPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/metrics")
      .then((r) => r.json())
      .then((d) => { setMetrics(d); setLoading(false); });
  }, []);

  if (loading) return <AppLayout title="Panel de administración"><div className="text-center py-12 text-slate-400">Cargando métricas...</div></AppLayout>;

  return (
    <AppLayout title="Panel de administración">
      <div className="space-y-6">
        {/* KPIs */}
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
