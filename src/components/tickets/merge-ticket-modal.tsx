"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TicketStatusBadge } from "./status-badge";
import { PriorityBadge } from "./priority-badge";
import { ArrowsRightLeftIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface MergeTicketModalProps {
  masterId: string;
  masterTitle: string;
  onMerged: () => void;
}

export function MergeTicketModal({ masterId, masterTitle, onMerged }: MergeTicketModalProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [step, setStep] = useState<"search" | "confirm">("search");
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState("");

  let searchTimeout: ReturnType<typeof setTimeout>;

  const handleSearch = (q: string) => {
    setSearch(q);
    clearTimeout(searchTimeout);
    if (!q.trim()) { setResults([]); return; }
    searchTimeout = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/tickets?limit=10`);
      const data = await res.json();
      const tickets = (data.tickets ?? []).filter((t: any) => t.id !== masterId && !t.mergedIntoId);
      setResults(tickets);
      setSearching(false);
    }, 300);
  };

  const handleMerge = async () => {
    setMerging(true);
    setError("");
    const res = await fetch(`/api/tickets/${masterId}/merge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId: selected.id }),
    });
    setMerging(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Error al fusionar");
      return;
    }
    setOpen(false);
    onMerged();
  };

  const reset = () => {
    setSearch("");
    setResults([]);
    setSelected(null);
    setStep("search");
    setError("");
  };

  return (
    <>
      <Button size="sm" variant="outline" className="w-full" onClick={() => { reset(); setOpen(true); }}>
        <ArrowsRightLeftIcon className="h-3.5 w-3.5 mr-1" />
        Fusionar con otro ticket
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Fusionar tickets">
        {step === "search" ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Busca el ticket que deseas fusionar <strong>en este ticket</strong>. El ticket seleccionado se cerrará y todos sus comentarios y adjuntos pasarán a esta incidencia.
            </p>
            <input
              type="text"
              placeholder="Buscar ticket por título…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {search && (
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {searching ? (
                  <p className="text-sm text-slate-400 py-3 text-center">Buscando…</p>
                ) : results.length === 0 ? (
                  <p className="text-sm text-slate-400 py-3 text-center">Sin resultados</p>
                ) : (
                  results.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setSelected(t); setStep("confirm"); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                    >
                      <span className="flex-1 text-sm truncate text-slate-800">{t.title}</span>
                      <PriorityBadge priority={t.priority} />
                      <TicketStatusBadge status={t.status} />
                    </button>
                  ))
                )}
              </div>
            )}
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold mb-1">Esta acción es irreversible</p>
                <p>El ticket <strong>"{selected?.title}"</strong> se cerrará y sus datos se moverán a <strong>"{masterTitle}"</strong>.</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                <span className="text-slate-500">🗑️ Se cierra:</span>
                <span className="font-medium text-slate-900 truncate">{selected?.title}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2">
                <span className="text-indigo-600">✓ Permanece:</span>
                <span className="font-medium text-indigo-900 truncate">{masterTitle}</span>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <Button loading={merging} onClick={handleMerge} className="bg-red-600 hover:bg-red-700 text-white">
                <ArrowsRightLeftIcon className="h-4 w-4 mr-1" />
                Confirmar fusión
              </Button>
              <Button variant="outline" onClick={() => setStep("search")}>Volver</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
