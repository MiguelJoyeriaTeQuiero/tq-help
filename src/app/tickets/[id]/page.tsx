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
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { TicketStatusBadge } from "@/components/tickets/status-badge";
import { FileUpload } from "@/components/ui/file-upload";
import { DEPARTMENT_LABELS, TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowPathIcon, LockClosedIcon, PaperClipIcon } from "@heroicons/react/24/outline";

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

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/tickets/${id}`);
    if (!res.ok) { router.push("/tickets"); return; }
    const data = await res.json();
    setTicket(data);
    setNewStatus(data.status);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

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

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSendingComment(true);
    await fetch(`/api/tickets/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment, isInternal }),
    });
    setComment("");
    setSendingComment(false);
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
       (session.user.role === "DEPT_ADMIN" && session.user.department === ticket.targetDept))
    : false;

  if (loading) return <AppLayout title="Cargando..."><div className="text-center py-12 text-slate-400">Cargando...</div></AppLayout>;
  if (!ticket) return null;

  const slaOk = ticket.slaDeadline && new Date(ticket.slaDeadline) > new Date();

  return (
    <AppLayout title="Detalle de incidencia">
      <div className="max-w-4xl mx-auto space-y-4">
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

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader><CardTitle>Descripción</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
                {ticket.attachments?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {ticket.attachments.map((a: any) => (
                      <a key={a.id} href={a.storageKey} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-indigo-600 hover:underline">
                        <PaperClipIcon className="h-4 w-4" />
                        {a.filename}
                      </a>
                    ))}
                  </div>
                )}
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

            {/* Comentarios */}
            <Card>
              <CardHeader><CardTitle>Comentarios ({ticket.comments?.length ?? 0})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  {ticket.comments?.map((c: any) => (
                    <div key={c.id} className={`rounded-lg p-3 ${c.isInternal ? "bg-yellow-50 border border-yellow-200" : "bg-slate-50"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-800">{c.author.name}</span>
                        {c.isInternal && (
                          <span className="flex items-center gap-1 text-xs text-yellow-700">
                            <LockClosedIcon className="h-3 w-3" /> Interno
                          </span>
                        )}
                        <span className="ml-auto text-xs text-slate-400">
                          {format(new Date(c.createdAt), "dd/MM HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{renderWithMentions(c.content)}</p>
                    </div>
                  ))}
                </div>

                {/* Formulario nuevo comentario */}
                {(session?.user.role !== "VIEWER") && (
                  <form onSubmit={handleComment} className="space-y-3">
                    <Textarea
                      placeholder="Escribe un comentario..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <p className="text-xs text-slate-400">Usa @nombre para mencionar a alguien</p>
                    {isAdminForTicket && (
                      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                        <LockClosedIcon className="h-3 w-3" />
                        Comentario interno (no visible para el usuario)
                      </label>
                    )}
                    <Button type="submit" size="sm" loading={sendingComment}>
                      Enviar comentario
                    </Button>
                  </form>
                )}
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
                  <p className="font-medium">{DEPARTMENT_LABELS[ticket.originDept as keyof typeof DEPARTMENT_LABELS]}</p>
                </div>
                <div>
                  <span className="text-slate-500">Departamento destino</span>
                  <p className="font-medium">{DEPARTMENT_LABELS[ticket.targetDept as keyof typeof DEPARTMENT_LABELS]}</p>
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

            {/* Panel de gestión para admins */}
            {isAdminForTicket && (
              <Card>
                <CardHeader><CardTitle>Gestión</CardTitle></CardHeader>
                <CardContent className="space-y-3">
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
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
