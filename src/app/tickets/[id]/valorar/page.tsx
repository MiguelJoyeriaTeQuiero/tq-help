"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { StarRating } from "@/components/ui/star-rating";
import { AppLayout } from "@/components/layout/app-layout";

export default function ValorarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [ticket, setTicket] = useState<any>(null);
  const [existing, setExisting] = useState<any>(null);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/tickets/${id}`).then((r) => r.json()),
      fetch(`/api/tickets/${id}/csat`).then((r) => r.ok ? r.json() : null),
    ]).then(([t, c]) => {
      setTicket(t);
      if (c) setExisting(c);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (score === 0) { setError("Selecciona una valoración"); return; }
    setSubmitting(true);
    setError("");
    const res = await fetch(`/api/tickets/${id}/csat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, comment }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al enviar");
      setSubmitting(false);
      return;
    }
    setSuccess(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <AppLayout title="Valorar atención">
        <div className="flex justify-center py-20 text-slate-400">Cargando...</div>
      </AppLayout>
    );
  }

  if (!ticket) return null;

  const canRate = session?.user?.id === ticket.authorId && ["CERRADO", "RESUELTO"].includes(ticket.status);

  return (
    <AppLayout title="Valorar atención">
      <div className="max-w-lg mx-auto py-10">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
          {/* Ticket info */}
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">Incidencia resuelta</p>
            <h2 className="text-lg font-semibold text-slate-900">{ticket.title}</h2>
          </div>

          {/* Already rated */}
          {existing && !success && (
            <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-5 py-4 text-center space-y-3">
              <p className="text-sm font-medium text-indigo-800">Ya has valorado esta incidencia</p>
              <StarRating value={existing.score} readonly size="lg" />
              <p className="text-xs text-indigo-600">
                {["", "Muy insatisfecho", "Insatisfecho", "Neutral", "Satisfecho", "Muy satisfecho"][existing.score]}
              </p>
              {existing.comment && (
                <p className="text-sm text-indigo-700 italic">"{existing.comment}"</p>
              )}
            </div>
          )}

          {/* Success state */}
          {success && (
            <div className="rounded-xl bg-green-50 border border-green-200 px-5 py-6 text-center space-y-3">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mx-auto">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-base font-semibold text-green-800">¡Gracias por tu valoración!</p>
              <p className="text-sm text-green-600">Tu opinión nos ayuda a mejorar el servicio.</p>
              <StarRating value={score} readonly size="lg" />
              <button
                onClick={() => router.push(`/tickets/${id}`)}
                className="mt-2 text-sm text-green-700 hover:text-green-900 font-medium underline"
              >
                Volver a la incidencia
              </button>
            </div>
          )}

          {/* Form */}
          {!existing && !success && (
            <>
              {!canRate && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                  Solo el autor puede valorar una incidencia cerrada o resuelta.
                </div>
              )}

              {canRate && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="text-center">
                    <p className="text-sm text-slate-600 mb-3">¿Cómo valorarías la atención recibida?</p>
                    <div className="flex justify-center">
                      <StarRating value={score} onChange={setScore} size="lg" />
                    </div>
                    {score > 0 && (
                      <p className="text-xs text-slate-500 mt-1.5">
                        {["", "Muy insatisfecho", "Insatisfecho", "Neutral", "Satisfecho", "Muy satisfecho"][score]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Comentario <span className="text-slate-400 font-normal">(opcional)</span>
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                      placeholder="¿Algo que quieras destacar o mejorar?"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || score === 0}
                    className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                  >
                    {submitting ? "Enviando..." : "Enviar valoración"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
