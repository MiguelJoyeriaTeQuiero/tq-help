"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { TicketStatusBadge } from "@/components/tickets/status-badge";
import { Badge } from "@/components/ui/badge";
import { getDeptLabel } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { PlusIcon, ExclamationTriangleIcon, ClockIcon } from "@heroicons/react/24/outline";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";

type Tab = "activas" | "historico";

// Statuses that belong to each tab
const ACTIVE_STATUSES   = "ABIERTO,EN_PROGRESO";
const HISTORIC_STATUSES = "RESUELTO,CERRADO";

const STATUS_OPTIONS_ACTIVAS = [
  { value: "", label: "Todos los activos" },
  { value: "ABIERTO", label: "Abierto" },
  { value: "EN_PROGRESO", label: "En progreso" },
];

const STATUS_OPTIONS_HISTORICO = [
  { value: "", label: "Todo el histórico" },
  { value: "RESUELTO", label: "Resuelto" },
  { value: "CERRADO", label: "Cerrado" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "Todas las prioridades" },
  { value: "CRITICA", label: "Crítica" },
  { value: "ALTA", label: "Alta" },
  { value: "MEDIA", label: "Media" },
  { value: "BAJA", label: "Baja" },
];

const DEPT_OPTIONS = [
  { value: "", label: "Todos los departamentos" },
  { value: "IT", label: "IT" },
  { value: "MARKETING", label: "Marketing" },
  { value: "LOGISTICA", label: "Logística" },
  { value: "RRHH", label: "RRHH" },
  { value: "CONTABILIDAD", label: "Contabilidad" },
  { value: "PRODUCTO", label: "Producto" },
  { value: "DIRECCION", label: "Dirección" },
];

export default function TicketsPage() {
  const { data: session } = useSession();

  const [tab,      setTab]      = useState<Tab>("activas");
  const [tickets,  setTickets]  = useState<any[]>([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [status,   setStatus]   = useState("");
  const [priority, setPriority] = useState("");
  const [dept,     setDept]     = useState("");
  const [page,     setPage]     = useState(1);
  const pageSize = 10;

  // Derive the effective status param for the API
  const effectiveStatus = status !== ""
    ? status
    : tab === "activas" ? ACTIVE_STATUSES : HISTORIC_STATUSES;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("status", effectiveStatus);
    if (priority) params.set("priority", priority);
    if (dept) params.set("dept", dept);
    params.set("page", String(page));
    params.set("limit", String(pageSize));

    const res  = await fetch(`/api/tickets?${params}`);
    const data = await res.json();
    setTickets(data.tickets ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveStatus, priority, dept, page]);

  useEffect(() => { load(); }, [load]);

  // When switching tabs: reset status filter and page
  const switchTab = (t: Tab) => {
    if (t === tab) return;
    setTab(t);
    setStatus("");
    setPage(1);
  };

  const showDeptFilter =
    session?.user.role === "SUPERADMIN" ||
    session?.user.role === "DEPT_ADMIN"  ||
    session?.user.role === "VIEWER";

  const statusOptions = tab === "activas" ? STATUS_OPTIONS_ACTIVAS : STATUS_OPTIONS_HISTORICO;

  // ── Skeleton ──────────────────────────────────────────────────────────────
  const skeleton = (
    <>
      <div className="flex flex-col gap-2 md:hidden">
        {[1,2,3,4].map(i => (
          <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2">
            <div className="flex justify-between gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-4 w-12 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
      <Card className="hidden md:block">
        <div className="divide-y divide-slate-100">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </Card>
    </>
  );

  // ── Ticket list (shared between tabs) ─────────────────────────────────────
  const ticketList = (
    <>
      {/* Vista móvil */}
      <div className="flex flex-col gap-2 md:hidden">
        {tickets.map((ticket) => (
          <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
            <Card className="p-3 hover:shadow-md transition-shadow active:scale-[0.99]">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-slate-900 text-sm leading-snug">
                  {ticket.slaBreached && (
                    <ExclamationTriangleIcon className="inline h-3.5 w-3.5 text-red-500 mr-1 -mt-0.5" />
                  )}
                  {ticket.title}
                </p>
                <TicketStatusBadge status={ticket.status} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <PriorityBadge priority={ticket.priority} />
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500">
                  {ticket.targetDept.map((k: string) => getDeptLabel(k)).join(", ")}
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-400">
                  {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: es })}
                </span>
              </div>
              {ticket.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {ticket.tags.map((tt: any) => (
                    <Badge
                      key={tt.tag.id}
                      className="text-white text-[10px] px-1.5 py-0"
                      style={{ backgroundColor: tt.tag.color }}
                    >
                      {tt.tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          </Link>
        ))}
        <p className="text-xs text-slate-400 text-center py-1">
          Mostrando {Math.min((page-1)*pageSize+1, total)}–{Math.min(page*pageSize, total)} de {total} incidencia{total !== 1 ? "s" : ""}
        </p>
        <Pagination page={page} total={total} pageSize={pageSize} onChange={setPage} />
      </div>

      {/* Vista escritorio */}
      <Card className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="px-4 py-3 font-medium text-slate-500">Incidencia</th>
                <th className="px-4 py-3 font-medium text-slate-500">Prioridad</th>
                <th className="px-4 py-3 font-medium text-slate-500">Estado</th>
                <th className="px-4 py-3 font-medium text-slate-500 hidden md:table-cell">Dept. destino</th>
                <th className="px-4 py-3 font-medium text-slate-500 hidden lg:table-cell">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/tickets/${ticket.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {ticket.slaBreached && (
                        <ExclamationTriangleIcon className="inline h-4 w-4 text-red-500 mr-1" />
                      )}
                      {ticket.title}
                    </Link>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ticket.tags?.map((tt: any) => (
                        <Badge
                          key={tt.tag.id}
                          className="text-white text-[10px] px-1.5 py-0"
                          style={{ backgroundColor: tt.tag.color }}
                        >
                          {tt.tag.name}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={ticket.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <TicketStatusBadge status={ticket.status} />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-500">
                    {ticket.targetDept.map((k: string) => getDeptLabel(k)).join(", ")}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-400">
                    {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: es })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 text-sm text-slate-500 flex items-center justify-between flex-wrap gap-2">
          <span>
            Mostrando {Math.min((page-1)*pageSize+1, total)}–{Math.min(page*pageSize, total)} de {total} incidencia{total !== 1 ? "s" : ""}
          </span>
          <Pagination page={page} total={total} pageSize={pageSize} onChange={setPage} />
        </div>
      </Card>
    </>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppLayout title="Incidencias">
      <div className="space-y-4">

        {/* Cabecera: tabs + botón nueva */}
        <div className="flex items-center justify-between gap-3 flex-wrap">

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => switchTab("activas")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === "activas"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Activas
            </button>
            <button
              onClick={() => switchTab("historico")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === "historico"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <ClockIcon className="h-3.5 w-3.5" />
              Histórico
            </button>
          </div>

          {session?.user.role !== "VIEWER" && (
            <Link href="/tickets/nuevo">
              <Button>
                <PlusIcon className="mr-1 h-4 w-4" />
                Nueva incidencia
              </Button>
            </Link>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-44"
          />
          <Select
            options={PRIORITY_OPTIONS}
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPage(1); }}
            className="w-44"
          />
          {showDeptFilter && (
            <Select
              options={DEPT_OPTIONS}
              value={dept}
              onChange={(e) => { setDept(e.target.value); setPage(1); }}
              className="w-44"
            />
          )}
        </div>

        {/* Contenido */}
        {loading ? (
          skeleton
        ) : tickets.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            {tab === "activas"
              ? "No hay incidencias activas"
              : "No hay incidencias en el histórico"}
          </div>
        ) : (
          ticketList
        )}

      </div>
    </AppLayout>
  );
}
