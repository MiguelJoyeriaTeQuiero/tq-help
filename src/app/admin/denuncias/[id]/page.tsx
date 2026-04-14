"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ShieldExclamationIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

const CATEGORY_LABELS: Record<string, string> = {
  ACOSO_LABORAL: "Acoso laboral", FRAUDE: "Fraude",
  DISCRIMINACION: "Discriminación", CONFLICTO_INTERESES: "Conflicto de intereses", OTRO: "Otro",
};
const STATUS_LABELS: Record<string, string> = {
  RECIBIDA: "Recibida", EN_INVESTIGACION: "En investigación", RESUELTA: "Resuelta", ARCHIVADA: "Archivada",
};
const STATUS_COLORS: Record<string, string> = {
  RECIBIDA: "bg-blue-100 text-blue-700", EN_INVESTIGACION: "bg-yellow-100 text-yellow-700",
  RESUELTA: "bg-green-100 text-green-700", ARCHIVADA: "bg-slate-100 text-slate-700",
};
const STATUS_OPTIONS = [
  { value: "RECIBIDA", label: "Recibida" }, { value: "EN_INVESTIGACION", label: "En investigación" },
  { value: "RESUELTA", label: "Resuelta" }, { value: "ARCHIVADA", label: "Archivada" },
];

export default function AdminDenunciaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/complaints/${id}`);
    if (!res.ok) { router.push("/admin/denuncias"); return; }
    const d = await res.json();
    setComplaint(d);
    setNewStatus(d.status);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleSave = async () => {
    setSaving(true);
    const body: any = {};
    if (newStatus !== complaint.status) body.status = newStatus;
    if (note.trim()) body.note = note.trim();

    if (Object.keys(body).length) {
      await fetch(`/api/complaints/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setNote("");
    }
    setSaving(false);
    load();
  };

  if (loading) return <AppLayout title="Cargando..."><div className="text-center py-12 text-slate-400">Cargando...</div></AppLayout>;

  return (
    <AppLayout title="Detalle de denuncia">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldExclamationIcon className="h-5 w-5 text-slate-500" />
              <span className="font-mono text-lg font-bold text-slate-700">{complaint.trackingCode}</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">{CATEGORY_LABELS[complaint.category]}</p>
          </div>
          <Badge className={STATUS_COLORS[complaint.status]}>{STATUS_LABELS[complaint.status]}</Badge>
        </div>

        <Card>
          <CardHeader><CardTitle>Descripción</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{complaint.description}</p>
            <p className="text-xs text-slate-400 mt-3">
              Recibida el {format(new Date(complaint.createdAt), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Notas internas */}
          <Card>
            <CardHeader><CardTitle>Notas internas</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                {complaint.internalNotes?.length === 0 && <p className="text-sm text-slate-400">Sin notas</p>}
                {complaint.internalNotes?.map((n: any, i: number) => (
                  <div key={i} className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{n.content}</p>
                    <p className="text-xs text-slate-400 mt-1">{format(new Date(n.createdAt), "dd/MM HH:mm")}</p>
                  </div>
                ))}
              </div>
              <Textarea
                placeholder="Añadir nota interna..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-[80px]"
              />
            </CardContent>
          </Card>

          {/* Gestión */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Cambiar estado</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Select options={STATUS_OPTIONS} value={newStatus} onChange={(e) => setNewStatus(e.target.value)} />
                <Button onClick={handleSave} loading={saving} className="w-full">
                  <ArrowPathIcon className="mr-1 h-4 w-4" />
                  Guardar cambios
                </Button>
              </CardContent>
            </Card>

            {/* Historial */}
            <Card>
              <CardHeader><CardTitle>Historial de estados</CardTitle></CardHeader>
              <CardContent>
                <ol className="space-y-1">
                  {complaint.statusHistory?.map((h: any, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="text-slate-400">{format(new Date(h.changedAt), "dd/MM HH:mm")}</span>
                      <Badge className={STATUS_COLORS[h.toStatus]}>{STATUS_LABELS[h.toStatus]}</Badge>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {/* Audit log */}
            <Card>
              <CardHeader><CardTitle>Log de auditoría</CardTitle></CardHeader>
              <CardContent>
                <ol className="space-y-1 max-h-48 overflow-y-auto">
                  {complaint.auditLogs?.map((l: any, i: number) => (
                    <li key={i} className="text-xs text-slate-500">
                      <span className="text-slate-400">{format(new Date(l.accessedAt), "dd/MM HH:mm")}</span>
                      {" · "}<span className="font-medium">{l.user.name}</span>
                      {" · "}{l.action}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
