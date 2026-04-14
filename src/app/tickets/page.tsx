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
import { DEPARTMENT_LABELS } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { PlusIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "ABIERTO", label: "Abierto" },
  { value: "EN_PROGRESO", label: "En progreso" },
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
  const [tickets, setTickets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [dept, setDept] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (dept) params.set("dept", dept);

    const res = await fetch(`/api/tickets?${params}`);
    const data = await res.json();
    setTickets(data.tickets ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [status, priority, dept]);

  useEffect(() => { load(); }, [load]);

  return (
    <AppLayout title="Incidencias">
      <div className="space-y-4">
        {/* Barra de filtros + botón crear */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Select
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-44"
            />
            <Select
              options={PRIORITY_OPTIONS}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-44"
            />
            {(session?.user.role === "SUPERADMIN" || session?.user.role === "DEPT_ADMIN" || session?.user.role === "VIEWER") && (
              <Select
                options={DEPT_OPTIONS}
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                className="w-44"
              />
            )}
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

        {/* Lista */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Cargando...</div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No hay incidencias</div>
        ) : (
          <>
            {/* Vista móvil: cards */}
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
                        {DEPARTMENT_LABELS[ticket.targetDept as keyof typeof DEPARTMENT_LABELS]}
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
                {total} incidencia{total !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Vista escritorio: tabla */}
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
                          {DEPARTMENT_LABELS[ticket.targetDept as keyof typeof DEPARTMENT_LABELS]}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-slate-400">
                          {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: es })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
                {total} incidencia{total !== 1 ? "s" : ""}
              </div>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
