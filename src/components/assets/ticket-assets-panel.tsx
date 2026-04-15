"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AssetStatusBadge } from "./asset-status-badge";
import { AssetTypeBadge } from "./asset-type-badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { PlusIcon, TrashIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline";

interface TicketAssetsPanelProps {
  ticketId: string;
}

export function TicketAssetsPanel({ ticketId }: TicketAssetsPanelProps) {
  const { data: session } = useSession();
  const canManage = session?.user?.role === "SUPERADMIN" || session?.user?.role === "DEPT_ADMIN";

  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkOpen, setLinkOpen] = useState(false);
  const [allAssets, setAllAssets] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [linking, setLinking] = useState<string | null>(null);

  const load = () => {
    fetch(`/api/tickets/${ticketId}/assets`)
      .then((r) => r.json())
      .then((d) => { setLinks(Array.isArray(d) ? d : []); setLoading(false); });
  };

  useEffect(() => { load(); }, [ticketId]);

  const openLinkModal = async () => {
    setLinkOpen(true);
    setSearch("");
    const assets = await fetch("/api/assets").then((r) => r.json());
    setAllAssets(Array.isArray(assets) ? assets : []);
  };

  const handleLink = async (assetId: string) => {
    setLinking(assetId);
    await fetch(`/api/tickets/${ticketId}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId }),
    });
    setLinking(null);
    setLinkOpen(false);
    load();
  };

  const handleUnlink = async (assetId: string) => {
    if (!confirm("¿Desvincular este activo del ticket?")) return;
    await fetch(`/api/tickets/${ticketId}/assets/${assetId}`, { method: "DELETE" });
    load();
  };

  const linkedIds = new Set(links.map((l) => l.assetId));
  const filteredAssets = allAssets.filter((a) =>
    !linkedIds.has(a.id) &&
    (a.name.toLowerCase().includes(search.toLowerCase()) ||
     (a.serialNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
     (a.brand ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <ComputerDesktopIcon className="h-4 w-4" />
          Activos vinculados
        </h3>
        {canManage && (
          <Button size="sm" variant="outline" onClick={openLinkModal}>
            <PlusIcon className="h-3.5 w-3.5 mr-1" />
            Vincular
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20 rounded-full ml-auto" />
            </div>
          ))}
        </div>
      ) : links.length === 0 ? (
        <p className="text-sm text-slate-400 py-2">Sin activos vinculados</p>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.assetId} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
              <Link href={`/activos/${link.assetId}`} className="font-medium text-indigo-600 hover:underline flex-1 truncate">
                {link.asset.name}
              </Link>
              <AssetTypeBadge type={link.asset.type} showIcon={false} />
              <AssetStatusBadge status={link.asset.status} />
              {canManage && (
                <button
                  onClick={() => handleUnlink(link.assetId)}
                  className="ml-1 rounded p-1 text-slate-400 hover:text-red-500 transition-colors"
                  title="Desvincular"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Modal vincular activo */}
      <Modal open={linkOpen} onClose={() => setLinkOpen(false)} title="Vincular activo">
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Buscar por nombre, serie o marca…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredAssets.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Sin resultados</p>
            ) : (
              filteredAssets.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleLink(a.id)}
                  disabled={linking === a.id}
                  className="w-full flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 px-3 py-2 text-left transition-colors disabled:opacity-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{a.name}</p>
                    {a.serialNumber && <p className="text-xs text-slate-400">S/N: {a.serialNumber}</p>}
                  </div>
                  <AssetTypeBadge type={a.type} showIcon={false} />
                  <AssetStatusBadge status={a.status} />
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
