"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { TicketStatusBadge } from "./status-badge";
import { PriorityBadge } from "./priority-badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusIcon, TrashIcon, LinkIcon } from "@heroicons/react/24/outline";

const RELATION_LABELS: Record<string, string> = {
  RELACIONADO:   "Relacionado",
  DUPLICADO:     "Duplicado de",
  BLOQUEADO_POR: "Bloqueado por",
  BLOQUEA:       "Bloquea a",
};

const RELATION_OPTIONS = Object.entries(RELATION_LABELS).map(([value, label]) => ({ value, label }));

interface TicketRelationsPanelProps {
  ticketId: string;
}

export function TicketRelationsPanel({ ticketId }: TicketRelationsPanelProps) {
  const { data: session } = useSession();
  const canManage = session?.user?.role === "SUPERADMIN" || session?.user?.role === "DEPT_ADMIN";

  const [relations, setRelations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [relationType, setRelationType] = useState("RELACIONADO");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const load = () => {
    fetch(`/api/tickets/${ticketId}/relations`)
      .then((r) => r.json())
      .then((d) => { setRelations(Array.isArray(d) ? d : []); setLoading(false); });
  };

  useEffect(() => { load(); }, [ticketId]);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const params = new URLSearchParams({ limit: "10" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/tickets?limit=10`);
      const data = await res.json();
      const tickets = (data.tickets ?? []).filter((t: any) => t.id !== ticketId);
      setSearchResults(tickets);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleAdd = async () => {
    if (!selectedTicket) return;
    setAdding(true);
    setAddError("");
    const res = await fetch(`/api/tickets/${ticketId}/relations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId: selectedTicket.id, relationType }),
    });
    setAdding(false);
    if (!res.ok) {
      const d = await res.json();
      setAddError(d.error ?? "Error al vincular");
      return;
    }
    setAddOpen(false);
    setSelectedTicket(null);
    setSearch("");
    setRelationType("RELACIONADO");
    load();
  };

  const handleRemove = async (relationId: string) => {
    if (!confirm("¿Eliminar esta relación?")) return;
    await fetch(`/api/tickets/${ticketId}/relations/${relationId}`, { method: "DELETE" });
    load();
  };

  // Group by type
  const grouped = relations.reduce((acc: Record<string, any[]>, r) => {
    const key = r.relationType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <LinkIcon className="h-4 w-4" />
          Tickets relacionados
        </h3>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => { setAddOpen(true); setAddError(""); setSearch(""); setSelectedTicket(null); }}>
            <PlusIcon className="h-3.5 w-3.5 mr-1" />
            Vincular
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-1.5">
          {[1,2].map(i => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
        </div>
      ) : relations.length === 0 ? (
        <p className="text-sm text-slate-400 py-1">Sin relaciones</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type}>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                {RELATION_LABELS[type]}
              </p>
              <ul className="space-y-1.5">
                {items.map((r: any) => (
                  <li key={r.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-sm">
                    <Link href={`/tickets/${r.linkedTicket.id}`} className="flex-1 truncate text-indigo-600 hover:underline font-medium">
                      {r.linkedTicket.title}
                    </Link>
                    <PriorityBadge priority={r.linkedTicket.priority} />
                    <TicketStatusBadge status={r.linkedTicket.status} />
                    {canManage && (
                      <button onClick={() => handleRemove(r.id)} className="text-slate-400 hover:text-red-500 transition-colors ml-1">
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Vincular ticket relacionado">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de relación</label>
            <select
              value={relationType}
              onChange={(e) => setRelationType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {RELATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Buscar ticket</label>
            <input
              type="text"
              placeholder="Escribe para buscar incidencias…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {selectedTicket && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-2.5 text-sm">
              <p className="font-medium text-indigo-900">Seleccionado: {selectedTicket.title}</p>
              <button onClick={() => setSelectedTicket(null)} className="text-xs text-indigo-600 hover:underline">Cambiar</button>
            </div>
          )}

          {!selectedTicket && search && (
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {searching ? (
                <p className="text-sm text-slate-400 py-3 text-center">Buscando…</p>
              ) : searchResults.length === 0 ? (
                <p className="text-sm text-slate-400 py-3 text-center">Sin resultados</p>
              ) : (
                searchResults.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTicket(t); setSearch(""); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="flex-1 text-sm truncate text-slate-800">{t.title}</span>
                    <TicketStatusBadge status={t.status} />
                  </button>
                ))
              )}
            </div>
          )}

          {addError && <p className="text-sm text-red-600">{addError}</p>}

          <div className="flex gap-3">
            <Button loading={adding} disabled={!selectedTicket} onClick={handleAdd}>
              Vincular ticket
            </Button>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
