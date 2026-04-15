"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AssetStatusBadge } from "@/components/assets/asset-status-badge";
import { AssetTypeBadge, ASSET_TYPE_OPTIONS } from "@/components/assets/asset-type-badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { PlusIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline";
import { useDepartments } from "@/hooks/use-departments";

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "EN_STOCK", label: "En stock" },
  { value: "ASIGNADO", label: "Asignado" },
  { value: "EN_REPARACION", label: "En reparación" },
  { value: "DADO_DE_BAJA", label: "Dado de baja" },
];

const TYPE_OPTIONS = [{ value: "", label: "Todos los tipos" }, ...ASSET_TYPE_OPTIONS];

export default function ActivosPage() {
  const { data: session } = useSession();
  const { getDeptLabel } = useDepartments();
  const canManage = session?.user?.role === "SUPERADMIN" || session?.user?.role === "DEPT_ADMIN";

  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);
    setLoading(true);
    fetch(`/api/assets?${params}`)
      .then((r) => r.json())
      .then((d) => { setAssets(Array.isArray(d) ? d : []); setLoading(false); });
  }, [typeFilter, statusFilter, search]);

  return (
    <AppLayout title="Inventario de activos">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="Buscar activo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48"
            />
            <Select options={TYPE_OPTIONS} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-44" />
            <Select options={STATUS_OPTIONS} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40" />
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-500 whitespace-nowrap">{assets.length} activo{assets.length !== 1 ? "s" : ""}</p>
            {canManage && (
              <Link href="/activos/nuevo">
                <Button size="sm">
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Nuevo activo
                </Button>
              </Link>
            )}
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-5 w-24 rounded-full hidden md:block" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ComputerDesktopIcon className="mx-auto h-12 w-12 mb-3" />
            <p>No hay activos registrados</p>
            {canManage && (
              <Link href="/activos/nuevo" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">
                Añadir el primero →
              </Link>
            )}
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-4 py-3 font-medium text-slate-500">Activo</th>
                    <th className="px-4 py-3 font-medium text-slate-500 hidden md:table-cell">Tipo</th>
                    <th className="px-4 py-3 font-medium text-slate-500 hidden lg:table-cell">Asignado a</th>
                    <th className="px-4 py-3 font-medium text-slate-500">Estado</th>
                    <th className="px-4 py-3 font-medium text-slate-500 hidden lg:table-cell">Tickets</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/activos/${a.id}`} className="font-medium text-indigo-600 hover:underline">
                          {a.name}
                        </Link>
                        {(a.brand || a.model) && (
                          <p className="text-xs text-slate-400">{[a.brand, a.model].filter(Boolean).join(" · ")}</p>
                        )}
                        {a.serialNumber && (
                          <p className="text-xs text-slate-400 font-mono">S/N: {a.serialNumber}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <AssetTypeBadge type={a.type} />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-slate-600">
                        {a.assignedTo ? (
                          <div>
                            <p className="font-medium">{a.assignedTo.name}</p>
                            <p className="text-xs text-slate-400">{getDeptLabel(a.assignedTo.department)}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <AssetStatusBadge status={a.status} />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-slate-500">
                        {a._count?.ticketAssets ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
