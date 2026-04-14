"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureStatusBadge } from "@/components/features/feature-status-badge";
import { Badge } from "@/components/ui/badge";
import { getDeptLabel, FEATURE_STATUS_LABELS } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { HandThumbUpIcon, LockClosedIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { HandThumbUpIcon as HandThumbUpSolid } from "@heroicons/react/24/solid";

const STATUS_OPTIONS = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "EN_REVISION", label: "En revisión" },
  { value: "EN_DESARROLLO", label: "En desarrollo" },
  { value: "COMPLETADO", label: "Completado" },
  { value: "DESCARTADO", label: "Descartado" },
];

export default function PeticionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [feature, setFeature] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [voting, setVoting] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/features/${id}`);
    if (!res.ok) { router.push("/peticiones"); return; }
    const data = await res.json();
    setFeature(data);
    setNewStatus(data.status);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleVote = async () => {
    if (session?.user.role === "VIEWER") return;
    setVoting(true);
    await fetch(`/api/features/${id}/vote`, { method: "POST" });
    setVoting(false);
    load();
  };

  const handleStatusUpdate = async () => {
    if (newStatus === feature.status) return;
    setUpdatingStatus(true);
    await fetch(`/api/features/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setUpdatingStatus(false);
    load();
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSendingComment(true);
    await fetch(`/api/features/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment, isInternal }),
    });
    setComment("");
    setSendingComment(false);
    load();
  };

  const isAdminForFeature = session?.user && feature
    ? (session.user.role === "SUPERADMIN" ||
       (session.user.role === "DEPT_ADMIN" && session.user.department === feature.targetDept))
    : false;

  if (loading) return <AppLayout title="Cargando..."><div className="text-center py-12 text-slate-400">Cargando...</div></AppLayout>;
  if (!feature) return null;

  return (
    <AppLayout title="Detalle de petición">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{feature.title}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {feature.author.name} · {formatDistanceToNow(new Date(feature.createdAt), { addSuffix: true, locale: es })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleVote}
              disabled={voting || session?.user.role === "VIEWER"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-400 transition-colors disabled:opacity-40"
            >
              {feature.hasVoted
                ? <HandThumbUpSolid className="h-5 w-5 text-indigo-600" />
                : <HandThumbUpIcon className="h-5 w-5 text-slate-500" />}
              <span className="font-bold text-slate-700">{feature.voteCount}</span>
            </button>
            <FeatureStatusBadge status={feature.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader><CardTitle>Descripción</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{feature.description}</p>
              </CardContent>
            </Card>

            {feature.statusHistory?.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Historial</CardTitle></CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {feature.statusHistory.map((h: any, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="text-slate-400 text-xs">{format(new Date(h.changedAt), "dd/MM HH:mm")}</span>
                        {h.fromStatus && <><FeatureStatusBadge status={h.fromStatus} /><span>→</span></>}
                        <FeatureStatusBadge status={h.toStatus} />
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>Comentarios ({feature.comments?.length ?? 0})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  {feature.comments?.map((c: any) => (
                    <div key={c.id} className={`rounded-lg p-3 ${c.isInternal ? "bg-yellow-50 border border-yellow-200" : "bg-slate-50"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-800">{c.author.name}</span>
                        {c.isInternal && <span className="flex items-center gap-1 text-xs text-yellow-700"><LockClosedIcon className="h-3 w-3" /> Interno</span>}
                        <span className="ml-auto text-xs text-slate-400">{format(new Date(c.createdAt), "dd/MM HH:mm")}</span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))}
                </div>
                {session?.user.role !== "VIEWER" && (
                  <form onSubmit={handleComment} className="space-y-3">
                    <Textarea
                      placeholder="Escribe un comentario..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="min-h-[80px]"
                    />
                    {isAdminForFeature && (
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                        <LockClosedIcon className="h-3 w-3" /> Interno
                      </label>
                    )}
                    <Button type="submit" size="sm" loading={sendingComment}>Comentar</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Detalles</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-slate-500">Origen</span>
                  <p className="font-medium">{getDeptLabel(feature.originDept)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Responsable</span>
                  <p className="font-medium">{getDeptLabel(feature.targetDept)}</p>
                </div>
                {feature.convertedFrom && (
                  <div>
                    <span className="text-slate-500">Convertida de ticket</span>
                    <p><a href={`/tickets/${feature.convertedFrom.id}`} className="text-indigo-600 hover:underline text-xs">{feature.convertedFrom.title}</a></p>
                  </div>
                )}
              </CardContent>
            </Card>
            {isAdminForFeature && (
              <Card>
                <CardHeader><CardTitle>Gestión</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Select label="Estado" options={STATUS_OPTIONS} value={newStatus} onChange={(e) => setNewStatus(e.target.value)} />
                  <Button size="sm" onClick={handleStatusUpdate} loading={updatingStatus} disabled={newStatus === feature.status} className="w-full">
                    <ArrowPathIcon className="mr-1 h-4 w-4" />Actualizar estado
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
