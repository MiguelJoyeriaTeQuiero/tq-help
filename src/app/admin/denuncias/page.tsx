"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "RECIBIDA", label: "Recibida" },
  { value: "EN_INVESTIGACION", label: "En investigación" },
  { value: "RESUELTA", label: "Resuelta" },
  { value: "ARCHIVADA", label: "Archivada" },
];

const CATEGORY_LABELS: Record<string, string> = {
  ACOSO_LABORAL: "Acoso laboral",
  FRAUDE: "Fraude",
  DISCRIMINACION: "Discriminación",
  CONFLICTO_INTERESES: "Conflicto de intereses",
  OTRO: "Otro",
};

const STATUS_COLORS: Record<string, string> = {
  RECIBIDA: "bg-blue-100 text-blue-700",
  EN_INVESTIGACION: "bg-yellow-100 text-yellow-700",
  RESUELTA: "bg-green-100 text-green-700",
  ARCHIVADA: "bg-slate-100 text-slate-700",
};

export default function AdminDenunciasPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/complaints?${params}`)
      .then(async (r) => {
        if (r.status === 403) { setForbidden(true); setLoading(false); return; }
        const d = await r.json();
        setComplaints(Array.isArray(d) ? d : []);
        setLoading(false);
      });
  }, [statusFilter]);

  if (forbidden) {
    return (
      <AppLayout title="Denuncias">
        <div className="text-center py-20">
          <p className="text-slate-500">No tienes permiso para ver esta sección.</p>
          <p className="text-sm text-slate-400 mt-1">Solo RRHH y Dirección pueden acceder al canal de denuncias.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Canal de denuncias — Gestión">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Select options={STATUS_OPTIONS} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-48" />
          <p className="text-sm text-slate-500">{complaints.length} denuncia{complaints.length !== 1 ? "s" : ""}</p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex items-center gap-4 px-4 py-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-24 rounded-full" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-5 w-28 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </div>
        ) : complaints.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No hay denuncias</div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-4 py-3 font-medium text-slate-500">Código</th>
                    <th className="px-4 py-3 font-medium text-slate-500">Categoría</th>
                    <th className="px-4 py-3 font-medium text-slate-500">Estado</th>
                    <th className="px-4 py-3 font-medium text-slate-500 hidden md:table-cell">Recibida</th>
                    <th className="px-4 py-3 font-medium text-slate-500">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {complaints.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/admin/denuncias/${c.id}`} className="font-mono text-indigo-600 hover:underline font-medium">
                          {c.trackingCode}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{CATEGORY_LABELS[c.category]}</td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_COLORS[c.status]}>{c.status.replace("_", " ")}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-400">
                        {format(new Date(c.createdAt), "dd/MM/yyyy", { locale: es })}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{c._count.internalNotes}</td>
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
