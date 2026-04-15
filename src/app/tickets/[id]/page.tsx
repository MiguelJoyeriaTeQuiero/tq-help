"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { TicketStatusBadge } from "@/components/tickets/status-badge";
import { FileUpload } from "@/components/ui/file-upload";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { getDeptLabel, TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowPathIcon, PaperClipIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { TicketAssetsPanel } from "@/components/assets/ticket-assets-panel";
import { ApprovalBanner } from "@/components/tickets/approval-banner";
import { TicketRelationsPanel } from "@/components/tickets/ticket-relations-panel";
import { MergeTicketModal } from "@/components/tickets/merge-ticket-modal";
import { StarRating } from "@/components/ui/star-rating";
import { LiveComments } from "@/components/tickets/live-comments";

function renderWithMentions(text: string) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.startsWith("@")
      ? <span key={i} className="text-indigo-600 font-medium">{part}</span>
      : part
  );
}

const STATUS_OPTIONS = [
  { value: "ABIERTO", label: "Abierto" },
  { value: "EN_PROGRESO", label: "En progreso" },
  { value: "RESUELTO", label: "Resuelto" },
  { value: "CERRADO", label: "Cerrado" },
];

const PRIORITY_OPTIONS = [
  { value: "BAJA", label: "Baja" },
  { value: "MEDIA", label: "Media" },
  { value: "ALTA", label: "Alta" },
  { value: "CRITICA", label: "Crítica" },
];

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newPriority, setNewPriority] = useState("");
  const [updatingPriority, setUpdatingPriority] = useState(false);
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [updatingAssignee, setUpdatingAssignee] = useState(false);
  const [agents, setAgents] = useState<{ value: string; label: string }[]>([]);
  const [lightbox, setLightbox] = useState<{ images: { url: string; filename: string }[]; index: number } | null>(null);
  const [csat, setCsat] = useState<any>(null);

  const load = async () => {
    const res = await fetch(`/api/tickets/${id}`);
    if (!res.ok) { router.push("/tickets"); return; }
    const data = await res.json();
    setTicket(data);
    setNewStatus(data.status);
    setNewPriority(data.priority);
    setNewAssigneeId(data.assigneeId ?? "");
    setLoading(false);
    // Load CSAT if ticket is closed/resolved
    if (["CERRADO", "RESUELTO"].includes(data.status)) {
      fetch(`/api/tickets/${id}/csat`).then((r) => r.ok ? r.json() : null).then(setCsat).catch(() => {});
    }
  };

  useEffect(() => { load(); }, [id]);

  // Load agents (admins) for assignment
  useEffect(() => {
    fetch("/api/users/agents")
      .then((r) => r.ok ? r.json() : [])
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          setAgents([
            { value: "", label: "Sin asignar" },
            ...data.map((u) => ({ value: u.id, label: u.name })),
          ]);
        }
      })
      .catch(() => {});
  }, []);

  const handleStatusUpdate = async () => {
    if (newStatus === ticket.status) return;
    setUpdatingStatus(true);
    await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setUpdatingStatus(false);
    load();
  };

  const handlePriorityUpdate = async () => {
    if (newPriority === ticket.priority) return;
    setUpdatingPriority(true);
    await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority: newPriority }),
    });
    setUpdatingPriority(false);
    load();
  };

  const handleAssigneeUpdate = async () => {
    setUpdatingAssignee(true);
    await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId: newAssigneeId || null }),
    });
    setUpdatingAssignee(false);
    load();
  };

  const handleConvert = async () => {
    if (!confirm("¿Convertir esta incidencia en petición de funcionalidad?")) return;
    const res = await fetch(`/api/tickets/${id}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: ticket.title, description: ticket.description }),
    });
    if (res.ok) {
      const f = await res.json();
      router.push(`/peticiones/${f.id}`);
    }
  };

  const isAdminForTicket = session?.user && ticket
    ? (session.user.role === "SUPERADMIN" ||
       (session.user.role === "DEPT_ADMIN" && ticket.targetDept.includes(session.user.department)))
    : false;

  if (loading) return (
    <AppLayout title="Cargando...">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-72" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 xl:grid-cols-4">
          <div className="lg:col-span-2 xl:col-span-3 space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
              <Skeleton className="h-5 w-36" />
              {[1,2].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
  if (!ticket) return null;

  const slaOk = ticket.slaDeadline && new Date(ticket.slaDeadline) > new Date();

  return (
    <AppLayout title="Detalle de incidencia">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Cabecera */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{ticket.title}</h1>
            <p className="text-sm text-slate-500 mt-1">
              Creado por <strong>{ticket.author.name}</strong> ·{" "}
              {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: es })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <PriorityBadge priority={ticket.priority} />
            <TicketStatusBadge status={ticket.status} />
            {ticket.tags?.map((tt: any) => (
              <Badge key={tt.tag.id} className="text-white text-xs" style={{ backgroundColor: tt.tag.color }}>
                {tt.tag.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Approval Banner */}
        {ticket.approvalStatus && (
          <ApprovalBanner
            ticketId={id}
            approvalStatus={ticket.approvalStatus}
            approval={ticket.approval}
            onUpdated={load}
          />
        )}

        {/* Merged into banner */}
        {ticket.mergedIntoId && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-2 text-sm text-slate-600">
            <span>🔀 Este ticket fue fusionado en:</span>
            <Link href={`/tickets/${ticket.mergedIntoId}`} className="font-medium text-indigo-600 hover:underline">
              {ticket.mergedInto?.title}
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {/* Columna principal */}
          <div className="lg:col-span-2 xl:col-span-3 space-y-4">
            <Card>
              <CardHeader><CardTitle>Descripción</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
                {ticket.attachments?.length > 0 && (() => {
                  const images = ticket.attachments.filter((a: any) => a.mimeType?.startsWith("image/"));
                  const videos = ticket.attachments.filter((a: any) => a.mimeType?.startsWith("video/"));
                  const docs = ticket.attachments.filter((a: any) => !a.mimeType?.startsWith("image/") && !a.mimeType?.startsWith("video/"));
                  const lightboxImages = images.map((a: any) => ({ url: a.storageKey, filename: a.filename }));
                  return (
                    <div className="mt-4 space-y-3">
                      {/* Miniaturas de imágenes */}
                      {images.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {images.map((a: any, i: number) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => setLightbox({ images: lightboxImages, index: i })}
                              className="group relative overflow-hidden rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                            >
                              <img
                                src={a.storageKey}
                                alt={a.filename}
                                className="h-24 w-24 object-cover transition-transform group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <span className="text-white text-xs opacity-0 group-hover:opacity-100 font-medium">Ver</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Videos */}
                      {videos.length > 0 && (
                        <div className="space-y-2">
                          {videos.map((a: any) => (
                            <div key={a.id} className="rounded-lg overflow-hidden border border-slate-200 bg-black">
                              <video
                                controls
                                preload="metadata"
                                className="w-full max-h-80"
                                src={a.storageKey}
                              >
                                <source src={a.storageKey} type={a.mimeType} />
                                <a href={a.storageKey} target="_blank" rel="noopener noreferrer"
                                  className="text-indigo-400 underline p-2 block">
                                  Descargar vídeo: {a.filename}
                                </a>
                              </video>
                              <p className="text-xs text-slate-400 px-2 py-1 bg-slate-900/60 truncate">{a.filename}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Documentos */}
                      {docs.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {docs.map((a: any) => (
                            <a key={a.id} href={a.storageKey} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors">
                              <PaperClipIcon className="h-4 w-4 flex-shrink-0" />
                              <span className="max-w-[160px] truncate">{a.filename}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Historial de estado */}
            {ticket.statusHistory?.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Historial de estados</CardTitle></CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {ticket.statusHistory.map((h: any, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="text-slate-400 text-xs">
                          {format(new Date(h.changedAt), "dd/MM HH:mm")}
                        </span>
                        {h.fromStatus && (
                          <><TicketStatusBadge status={h.fromStatus} /><span>→</span></>
                        )}
                        <TicketStatusBadge status={h.toStatus} />
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* Comentarios en tiempo real */}
            <Card>
              <CardHeader><CardTitle>Comentarios</CardTitle></CardHeader>
              <CardContent>
                <LiveComments
                  ticketId={id}
                  isAdmin={isAdminForTicket}
                  onComment={load}
                />
              </CardContent>
            </Card>
          </div>

          {/* Columna lateral */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Detalles</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-slate-500">Departamento origen</span>
                  <p className="font-medium">{getDeptLabel(ticket.originDept)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Departamento destino</span>
                  <p className="font-medium">{ticket.targetDept.map((k: string) => getDeptLabel(k)).join(", ")}</p>
                </div>
                {ticket.slaDeadline && (
                  <div>
                    <span className="text-slate-500">SLA límite</span>
                    <p className={`font-medium ${ticket.slaBreached ? "text-red-600" : "text-green-600"}`}>
                      {format(new Date(ticket.slaDeadline), "dd/MM HH:mm")}
                      {ticket.slaBreached && " ⚠️ Superado"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CSAT */}
            {["CERRADO", "RESUELTO"].includes(ticket.status) && (
              <Card>
                <CardContent className="pt-5">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Valoración del servicio</p>
                  {csat ? (
                    <div className="space-y-1">
                      <StarRating value={csat.rating} readonly size="sm" />
                      <p className="text-xs text-slate-400">
                        {["", "Muy insatisfecho", "Insatisfecho", "Neutral", "Satisfecho", "Muy satisfecho"][csat.rating]}
                      </p>
                      {csat.comment && <p className="text-xs text-slate-500 italic">"{csat.comment}"</p>}
                    </div>
                  ) : session?.user?.id === ticket.authorId ? (
                    <Link href={`/tickets/${id}/valorar`} className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                      <StarRating value={0} readonly size="sm" />
                      <span className="ml-1">Valorar atención →</span>
                    </Link>
                  ) : (
                    <p className="text-xs text-slate-400">Sin valoración todavía</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Activos vinculados */}
            <Card>
              <CardContent className="pt-5">
                <TicketAssetsPanel ticketId={id} />
              </CardContent>
            </Card>

            {/* Tickets relacionados */}
            <Card>
              <CardContent className="pt-5">
                <TicketRelationsPanel ticketId={id} />
              </CardContent>
            </Card>

            {/* Panel de gestión para admins */}
            {isAdminForTicket && (
              <Card>
                <CardHeader><CardTitle>Gestión</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Select
                      label="Cambiar estado"
                      options={STATUS_OPTIONS}
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={handleStatusUpdate}
                      loading={updatingStatus}
                      disabled={newStatus === ticket.status}
                      className="w-full"
                    >
                      <ArrowPathIcon className="mr-1 h-4 w-4" />
                      Actualizar estado
                    </Button>
                  </div>
                  <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-700">
                    <Select
                      label="Cambiar prioridad"
                      options={PRIORITY_OPTIONS}
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePriorityUpdate}
                      loading={updatingPriority}
                      disabled={newPriority === ticket.priority}
                      className="w-full"
                    >
                      <ArrowPathIcon className="mr-1 h-4 w-4" />
                      Actualizar prioridad
                    </Button>
                  </div>
                  <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-700">
                    <Select
                      label="Agente asignado"
                      options={agents}
                      value={newAssigneeId}
                      onChange={(e) => setNewAssigneeId(e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAssigneeUpdate}
                      loading={updatingAssignee}
                      disabled={newAssigneeId === (ticket.assigneeId ?? "")}
                      className="w-full"
                    >
                      <ArrowPathIcon className="mr-1 h-4 w-4" />
                      Asignar agente
                    </Button>
                    {ticket.assignee && (
                      <p className="text-xs text-slate-500">
                        Asignado a: <span className="font-medium text-slate-700">{ticket.assignee.name}</span>
                      </p>
                    )}
                  </div>
                  {!ticket.convertedTo && (
                    <Button size="sm" variant="outline" className="w-full" onClick={handleConvert}>
                      Convertir en petición
                    </Button>
                  )}
                  {ticket.convertedTo && (
                    <p className="text-xs text-slate-500">
                      Convertido en petición: <a href={`/peticiones/${ticket.convertedTo.id}`} className="text-indigo-600 hover:underline">{ticket.convertedTo.title}</a>
                    </p>
                  )}
                  {!ticket.mergedIntoId && (
                    <div className="pt-1 border-t border-slate-100">
                      <MergeTicketModal masterId={id} masterTitle={ticket.title} onMerged={load} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </AppLayout>
  );
}
