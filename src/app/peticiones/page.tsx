"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeatureStatusBadge } from "@/components/features/feature-status-badge";
import { getDeptLabel } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { PlusIcon, HandThumbUpIcon } from "@heroicons/react/24/outline";
import { Skeleton } from "@/components/ui/skeleton";
import { HandThumbUpIcon as HandThumbUpSolid } from "@heroicons/react/24/solid";
import { Pagination } from "@/components/ui/pagination";

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "EN_REVISION", label: "En revisión" },
  { value: "EN_DESARROLLO", label: "En desarrollo" },
  { value: "COMPLETADO", label: "Completado" },
  { value: "DESCARTADO", label: "Descartado" },
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

export default function PeticionesPage() {
  const { data: session } = useSession();
  const [features, setFeatures] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [dept, setDept] = useState("");
  const [voting, setVoting] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (dept) params.set("dept", dept);
    params.set("page", String(page));
    params.set("limit", String(pageSize));

    const res = await fetch(`/api/features?${params}`);
    const data = await res.json();
    setFeatures(data.features ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [status, dept, page]);

  useEffect(() => { load(); }, [load]);

  const handleVote = async (featureId: string) => {
    if (session?.user.role === "VIEWER") return;
    setVoting(featureId);
    await fetch(`/api/features/${featureId}/vote`, { method: "POST" });
    setVoting(null);
    load();
  };

  return (
    <AppLayout title="Peticiones de funcionalidad">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Select options={STATUS_OPTIONS} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-44" />
            <Select options={DEPT_OPTIONS} value={dept} onChange={(e) => { setDept(e.target.value); setPage(1); }} className="w-44" />
          </div>
          {session?.user.role !== "VIEWER" && (
            <Link href="/peticiones/nueva">
              <Button><PlusIcon className="mr-1 h-4 w-4" />Nueva petición</Button>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-start gap-4">
                <div className="flex flex-col items-center gap-2 min-w-[48px]">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-4 w-6" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-56" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : features.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No hay peticiones</div>
        ) : (
          <div className="space-y-3">
            {features.map((f) => (
              <Card key={f.id} className="p-4 flex items-start gap-4">
                {/* Botón de voto */}
                <div className="flex flex-col items-center gap-1 min-w-[48px]">
                  <button
                    onClick={() => handleVote(f.id)}
                    disabled={voting === f.id || session?.user.role === "VIEWER"}
                    className="text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-40"
                  >
                    {f.hasVoted
                      ? <HandThumbUpSolid className="h-6 w-6 text-indigo-600" />
                      : <HandThumbUpIcon className="h-6 w-6" />}
                  </button>
                  <span className="text-sm font-bold text-slate-700">{f.voteCount}</span>
                </div>
                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Link href={`/peticiones/${f.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {f.title}
                    </Link>
                    <FeatureStatusBadge status={f.status} />
                    {f.tags?.map((ft: any) => (
                      <Badge key={ft.tag.id} className="text-white text-[10px] px-1.5 py-0" style={{ backgroundColor: ft.tag.color }}>
                        {ft.tag.name}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2">{f.description}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {getDeptLabel(f.originDept)} → {f.targetDept.map((k: string) => getDeptLabel(k)).join(", ")} ·{" "}
                    {formatDistanceToNow(new Date(f.createdAt), { addSuffix: true, locale: es })} ·{" "}
                    {f._count.comments} comentarios
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
        <p className="text-sm text-slate-400">
          Mostrando {total === 0 ? 0 : Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} de {total} peticion{total !== 1 ? "es" : ""}
        </p>
        <Pagination page={page} total={total} pageSize={pageSize} onChange={setPage} />
      </div>
    </AppLayout>
  );
}
