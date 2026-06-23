"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { canManageWarehouse } from "@/lib/permissions";
import { METAL_FAMILY_LABELS, METAL_FAMILY_OPTIONS } from "@/lib/metal-families";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  TruckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import type { MetalFamily } from "@prisma/client";

interface Product {
  id: string;
  name: string;
  family: MetalFamily;
  imageUrl: string | null;
  stock: number;
  active: boolean;
  supplier: string | null;
  leadTimeDays: number | null;
  reorderPointOverride: number | null;
  replenishmentRequested: boolean;
}

interface ReplItem {
  id: string;
  name: string;
  family: MetalFamily;
  imageUrl: string | null;
  stock: number;
  supplier: string | null;
  leadTimeDays: number | null;
  reorderPointOverride: number | null;
  replenishmentRequested: boolean;
  reorderPoint: number;
  targetStock: number;
  suggestedQty: number;
  perCycleDemand: number;
  enoughHistory: boolean;
  needsReorder: boolean;
  usingOverride: boolean;
  leadDays: number;
  demand: { totalDemand: number; orderCount: number; firstOrderAt: string | null };
}

const FAMILY_TABS = ["ALL", ...(Object.keys(METAL_FAMILY_LABELS) as MetalFamily[])] as const;

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function replItemToProduct(it: ReplItem): Product {
  return {
    id: it.id, name: it.name, family: it.family, imageUrl: it.imageUrl, stock: it.stock,
    active: true, supplier: it.supplier, leadTimeDays: it.leadTimeDays,
    reorderPointOverride: it.reorderPointOverride, replenishmentRequested: it.replenishmentRequested,
  };
}

export default function AlmacenPage() {
  const { data: session, status } = useSession();
  const allowed = session?.user ? canManageWarehouse(session.user) : false;

  const [view, setView] = useState<"inventory" | "replenishment" | "count">("inventory");

  // Inventario
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [familyTab, setFamilyTab] = useState<(typeof FAMILY_TABS)[number]>("ALL");

  // Reposición
  const [repl, setRepl]         = useState<ReplItem[]>([]);
  const [inCampaign, setInCampaign] = useState(false);
  const [replLoading, setReplLoading] = useState(false);
  const [replLoaded, setReplLoaded]   = useState(false);

  const [editing, setEditing]   = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [stockFor, setStockFor] = useState<Product | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; filename: string } | null>(null);

  const loadInventory = () => {
    setLoading(true);
    fetch("/api/products?all=true")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setProducts(d); })
      .finally(() => setLoading(false));
  };

  const loadReplenishment = () => {
    setReplLoading(true);
    fetch("/api/products/replenishment")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.products)) setRepl(d.products);
        setInCampaign(!!d?.inCampaign);
        setReplLoaded(true);
      })
      .finally(() => setReplLoading(false));
  };

  const reload = () => { loadInventory(); if (replLoaded) loadReplenishment(); };

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    fetch("/api/products?all=true")
      .then((r) => r.json())
      .then((d) => { if (active && Array.isArray(d)) setProducts(d); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed]);

  // Cargar reposición la primera vez que se entra en esa vista
  useEffect(() => {
    if (!allowed || view !== "replenishment" || replLoaded) return;
    let active = true;
    fetch("/api/products/replenishment")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (Array.isArray(d?.products)) setRepl(d.products);
        setInCampaign(!!d?.inCampaign);
        setReplLoaded(true);
      })
      .finally(() => { if (active) setReplLoading(false); });
    return () => { active = false; };
  }, [allowed, view, replLoaded]);

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return products.filter((p) => {
      if (familyTab !== "ALL" && p.family !== familyTab) return false;
      if (q && !normalize(p.name).includes(q)) return false;
      return true;
    });
  }, [products, search, familyTab]);

  const countForFamily = (fam: (typeof FAMILY_TABS)[number]) =>
    fam === "ALL" ? products.length : products.filter((p) => p.family === fam).length;

  const alerts        = useMemo(() => repl.filter((r) => r.needsReorder).sort((a, b) => b.suggestedQty - a.suggestedQty), [repl]);
  const inProgress    = useMemo(() => repl.filter((r) => r.replenishmentRequested), [repl]);
  const noHistory     = useMemo(() => repl.filter((r) => !r.enoughHistory && !r.usingOverride).length, [repl]);

  const deleteProduct = async (p: Product) => {
    if (!confirm(`¿Eliminar "${p.name}"? Si tiene pedidos asociados, se desactivará en su lugar.`)) return;
    const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "No se pudo eliminar"); return; }
    if (data.deactivated) toast.success("Producto desactivado (tiene pedidos asociados)");
    else toast.success("Producto eliminado");
    reload();
  };

  const toggleActive = async (p: Product) => {
    const res = await fetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    if (res.ok) { toast.success(p.active ? "Producto desactivado" : "Producto activado"); reload(); }
    else toast.error("No se pudo actualizar");
  };

  const setRequested = async (it: ReplItem, value: boolean) => {
    const res = await fetch(`/api/products/${it.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replenishmentRequested: value }),
    });
    if (res.ok) {
      toast.success(value ? "Marcado como pedido al proveedor" : "Aviso reactivado");
      loadReplenishment();
    } else toast.error("No se pudo actualizar");
  };

  if (status === "loading") {
    return (
      <AppLayout title="Almacén">
        <div className="space-y-4 max-w-4xl"><Skeleton className="h-64 w-full rounded-xl" /></div>
      </AppLayout>
    );
  }

  if (!allowed) {
    return (
      <AppLayout title="Almacén">
        <div className="text-center py-20 text-slate-400">
          Solo el departamento de logística puede gestionar el almacén.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Almacén">
      <div className="max-w-5xl space-y-5">
        {/* Selector de vista + acción */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
            <button
              onClick={() => setView("inventory")}
              className={`rounded-md px-3 py-1.5 sm:px-4 font-medium transition-colors ${view === "inventory" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Inventario
            </button>
            <button
              onClick={() => setView("replenishment")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 sm:px-4 font-medium transition-colors ${view === "replenishment" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Reposición
              {replLoaded && alerts.length > 0 && (
                <span className={`rounded-full text-xs font-semibold px-1.5 py-0.5 leading-none ${view === "replenishment" ? "bg-white/25 text-white" : "bg-red-100 text-red-600"}`}>
                  {alerts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setView("count")}
              className={`rounded-md px-3 py-1.5 sm:px-4 font-medium transition-colors ${view === "count" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Recuento
            </button>
          </div>
          {view === "inventory" && (
            <Button onClick={() => setCreating(true)} className="gap-2">
              <PlusIcon className="h-4 w-4" /> Nuevo producto
            </Button>
          )}
        </div>

        {view === "inventory" ? (
          <Card>
            {/* Tabs por familia */}
            <div className="flex border-b border-slate-200 overflow-x-auto">
              {FAMILY_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFamilyTab(tab)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    familyTab === tab
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab === "ALL" ? "Todos" : METAL_FAMILY_LABELS[tab]}
                  <span className="rounded-full bg-slate-100 text-slate-600 text-xs font-semibold px-1.5 py-0.5 leading-none">
                    {countForFamily(tab)}
                  </span>
                </button>
              ))}
            </div>

            {/* Buscador */}
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar producto…"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-5 space-y-3">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                </div>
              ) : filtered.length === 0 ? (
                <p className="px-5 py-10 text-sm text-slate-400 text-center">
                  No hay productos {search ? "para esa búsqueda" : "en esta familia"}.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filtered.map((p) => (
                    <div
                      key={p.id}
                      className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 ${p.active ? "" : "bg-slate-50/70 opacity-70"}`}
                    >
                      {/* Foto */}
                      {p.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => setLightbox({ url: p.imageUrl!, filename: p.name })}
                          className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden cursor-zoom-in focus-ring"
                          title="Ampliar foto"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                        </button>
                      ) : (
                        <div className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                          <PhotoIcon className="h-5 w-5 text-slate-300" />
                        </div>
                      )}

                      {/* Nombre + familia */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {p.name}
                          {!p.active && <span className="ml-2 text-xs font-normal text-slate-400">(inactivo)</span>}
                        </p>
                        <p className="text-xs text-slate-400">{METAL_FAMILY_LABELS[p.family]}</p>
                      </div>

                      {/* Stock */}
                      <div className="shrink-0 text-right w-20">
                        <span
                          className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-md text-sm font-semibold ${
                            p.stock <= 0
                              ? "bg-red-50 text-red-600"
                              : p.stock <= 5
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                          title="Stock disponible"
                        >
                          {p.stock}
                        </span>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-1 w-full justify-end sm:w-auto sm:shrink-0">
                        <button
                          onClick={() => setStockFor(p)}
                          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Dar entrada / ajustar stock"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" /> Stock
                        </button>
                        <button
                          onClick={() => setEditing(p)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          title="Editar"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(p)}
                          className="rounded-md px-2 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          title={p.active ? "Desactivar" : "Activar"}
                        >
                          {p.active ? "Ocultar" : "Mostrar"}
                        </button>
                        <button
                          onClick={() => deleteProduct(p)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Eliminar"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : view === "replenishment" ? (
          <ReplenishmentView
            loading={replLoading || !replLoaded}
            inCampaign={inCampaign}
            alerts={alerts}
            inProgress={inProgress}
            noHistoryCount={noHistory}
            onStock={(it) => setStockFor(replItemToProduct(it))}
            onAdjust={(it) => setEditing(replItemToProduct(it))}
            onRequested={setRequested}
            onLightbox={setLightbox}
          />
        ) : (
          <CountView
            loading={loading}
            products={products.filter((p) => p.active)}
            onApplied={reload}
            onLightbox={setLightbox}
          />
        )}
      </div>

      {(creating || editing) && (
        <ProductModal
          product={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); reload(); }}
        />
      )}

      {stockFor && (
        <StockModal
          product={stockFor}
          onClose={() => setStockFor(null)}
          onSaved={() => { setStockFor(null); reload(); }}
        />
      )}

      {lightbox && (
        <ImageLightbox images={[lightbox]} onClose={() => setLightbox(null)} />
      )}
    </AppLayout>
  );
}

// ── Vista de Reposición ──────────────────────────────────────────────────────

function ReplenishmentView({
  loading,
  inCampaign,
  alerts,
  inProgress,
  noHistoryCount,
  onStock,
  onAdjust,
  onRequested,
  onLightbox,
}: {
  loading: boolean;
  inCampaign: boolean;
  alerts: ReplItem[];
  inProgress: ReplItem[];
  noHistoryCount: number;
  onStock: (it: ReplItem) => void;
  onAdjust: (it: ReplItem) => void;
  onRequested: (it: ReplItem, value: boolean) => void;
  onLightbox: (img: { url: string; filename: string }) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {inCampaign && (
        <div className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700">
          <SparklesIcon className="h-5 w-5 shrink-0" />
          <span>Periodo de <strong>campaña</strong> activo: las cantidades sugeridas se han incrementado para cubrir el pico de demanda.</span>
        </div>
      )}

      {/* Avisos de reposición */}
      <Card>
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
          <ExclamationTriangleIcon className={`h-5 w-5 ${alerts.length ? "text-red-500" : "text-emerald-500"}`} />
          <h2 className="text-sm font-semibold text-slate-800">
            {alerts.length ? `${alerts.length} producto${alerts.length !== 1 ? "s" : ""} por reponer` : "Sin avisos de reposición"}
          </h2>
        </div>
        <CardContent className="p-0">
          {alerts.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              <CheckCircleIcon className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
              Todo el stock está por encima de su punto de pedido.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alerts.map((it) => (
                <ReplRow key={it.id} it={it} onStock={onStock} onAdjust={onAdjust} onRequested={onRequested} onLightbox={onLightbox} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* En curso (ya pedido al proveedor) */}
      {inProgress.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
            <TruckIcon className="h-5 w-5 text-blue-500" />
            <h2 className="text-sm font-semibold text-slate-800">
              {inProgress.length} pedido{inProgress.length !== 1 ? "s" : ""} al proveedor en curso
            </h2>
          </div>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {inProgress.map((it) => (
                <div key={it.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                  <Thumb it={it} onLightbox={onLightbox} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{it.name}</p>
                    <p className="text-xs text-slate-400">
                      {METAL_FAMILY_LABELS[it.family]} · stock {it.stock}
                      {it.supplier ? ` · ${it.supplier}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 w-full justify-end sm:w-auto">
                    <button
                      onClick={() => onStock(it)}
                      className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" /> Recibir
                    </button>
                    <button
                      onClick={() => onRequested(it, false)}
                      className="rounded-md px-2 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      title="Reactivar el aviso de reposición"
                    >
                      Reactivar aviso
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {noHistoryCount > 0 && (
        <p className="text-xs text-slate-400 px-1">
          {noHistoryCount} producto{noHistoryCount !== 1 ? "s" : ""} aún sin histórico suficiente para calcular el punto de pedido.
          Puedes fijarles un punto de pedido manual desde «Editar» en el inventario.
        </p>
      )}
    </div>
  );
}

function Thumb({ it, onLightbox }: { it: ReplItem; onLightbox: (img: { url: string; filename: string }) => void }) {
  if (!it.imageUrl) {
    return (
      <div className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
        <PhotoIcon className="h-5 w-5 text-slate-300" />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onLightbox({ url: it.imageUrl!, filename: it.name })}
      className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden cursor-zoom-in focus-ring"
      title="Ampliar foto"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={it.imageUrl} alt={it.name} className="h-full w-full object-cover" />
    </button>
  );
}

function ReplRow({
  it, onStock, onAdjust, onRequested, onLightbox,
}: {
  it: ReplItem;
  onStock: (it: ReplItem) => void;
  onAdjust: (it: ReplItem) => void;
  onRequested: (it: ReplItem, value: boolean) => void;
  onLightbox: (img: { url: string; filename: string }) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 flex-wrap sm:flex-nowrap">
      <Thumb it={it} onLightbox={onLightbox} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{it.name}</p>
        <p className="text-xs text-slate-400">
          {METAL_FAMILY_LABELS[it.family]}
          {it.supplier ? ` · ${it.supplier}` : ""}
          {` · entrega ${it.leadDays}d`}
          {it.usingOverride && " · punto manual"}
        </p>
      </div>

      {/* Métricas */}
      <div className="flex items-center gap-4 text-center shrink-0">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Stock</p>
          <p className="text-sm font-semibold text-red-600">{it.stock}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Punto</p>
          <p className="text-sm font-medium text-slate-600">{it.reorderPoint}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Pedir</p>
          <p className="text-base font-bold text-indigo-700">{it.suggestedQty}</p>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onStock(it)}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
          title="Dar entrada de stock"
        >
          <ArrowDownTrayIcon className="h-4 w-4" /> Recibir
        </button>
        <button
          onClick={() => onRequested(it, true)}
          className="rounded-md px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
          title="Marcar como pedido al proveedor (silencia el aviso)"
        >
          Ya pedido
        </button>
        <button
          onClick={() => onAdjust(it)}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title="Ajustar punto de pedido / datos"
        >
          <PencilSquareIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Modal de alta/edición de producto ────────────────────────────────────────

function ProductModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!product;
  const [name, setName]       = useState(product?.name ?? "");
  const [family, setFamily]   = useState<MetalFamily>(product?.family ?? METAL_FAMILY_OPTIONS[0].value);
  const [imageUrl, setImageUrl] = useState<string | null>(product?.imageUrl ?? null);
  const [stock, setStock]     = useState<string>(product ? String(product.stock) : "0");
  const [supplier, setSupplier] = useState(product?.supplier ?? "");
  const [leadTime, setLeadTime] = useState(product?.leadTimeDays != null ? String(product.leadTimeDays) : "");
  const [reorder, setReorder]   = useState(product?.reorderPointOverride != null ? String(product.reorderPointOverride) : "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File) => {
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) setImageUrl(data.url);
    else setError(data.error ?? "Error al subir la imagen");
    setUploading(false);
  };

  const save = async () => {
    setError("");
    if (!name.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true);
    const common = {
      name, family, imageUrl,
      supplier: supplier.trim() || null,
      leadTimeDays: leadTime === "" ? null : Math.max(0, Math.floor(Number(leadTime) || 0)),
      reorderPointOverride: reorder === "" ? null : Math.max(0, Math.floor(Number(reorder) || 0)),
    };
    const payload = isEdit ? common : { ...common, stock: Math.max(0, Math.floor(Number(stock) || 0)) };
    const res = await fetch(isEdit ? `/api/products/${product!.id}` : "/api/products", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Error al guardar"); return; }
    toast.success(isEdit ? "Producto actualizado" : "Producto creado");
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? "Editar producto" : "Nuevo producto"}>
      <div className="space-y-4">
        {/* Imagen */}
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 shrink-0 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <PhotoIcon className="h-7 w-7 text-slate-300" />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <PhotoIcon className="mr-1 h-4 w-4" />
              {imageUrl ? "Cambiar foto" : "Subir foto"}
            </Button>
            {imageUrl && (
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className="text-xs text-slate-400 hover:text-red-500 text-left"
              >
                Quitar foto
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
            />
          </div>
        </div>

        <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del producto" />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Familia</label>
          <select
            value={family}
            onChange={(e) => setFamily(e.target.value as MetalFamily)}
            className="h-10 w-full rounded-token-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-ring"
          >
            {METAL_FAMILY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {!isEdit && (
          <Input
            label="Stock inicial"
            type="number"
            min={0}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        )}

        {/* Reposición */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Proveedor" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Opcional" />
          <Input label="Plazo entrega (días)" type="number" min={0} value={leadTime} onChange={(e) => setLeadTime(e.target.value)} placeholder="p. ej. 7" />
        </div>
        <Input
          label="Punto de pedido manual (opcional)"
          type="number"
          min={0}
          value={reorder}
          onChange={(e) => setReorder(e.target.value)}
          placeholder="Déjalo vacío para cálculo automático"
        />

        {isEdit && (
          <p className="text-xs text-slate-400">
            Para modificar el stock usa la acción «Stock» de la lista.
          </p>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} loading={saving} disabled={uploading}>
            {isEdit ? "Guardar" : "Crear producto"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal de entrada/ajuste de stock ─────────────────────────────────────────

function StockModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode]   = useState<"add" | "set">("add");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const n = Math.floor(Number(value));
  const preview = mode === "add"
    ? Math.max(0, product.stock + (Number.isFinite(n) ? n : 0))
    : Math.max(0, Number.isFinite(n) ? n : 0);

  const save = async () => {
    setError("");
    if (value === "" || !Number.isFinite(n)) { setError("Indica una cantidad"); return; }
    setSaving(true);
    const res = await fetch(`/api/products/${product.id}/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mode === "add" ? { delta: n } : { set: n }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Error al actualizar el stock"); return; }
    toast.success("Stock actualizado");
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Stock de producto">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-slate-800">{product.name}</p>
          <p className="text-xs text-slate-400">Stock actual: <span className="font-semibold text-slate-600">{product.stock}</span></p>
        </div>

        <div className="flex rounded-lg border border-slate-200 p-1 text-sm">
          <button
            onClick={() => setMode("add")}
            className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${mode === "add" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Dar entrada (+/−)
          </button>
          <button
            onClick={() => setMode("set")}
            className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${mode === "set" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Fijar valor
          </button>
        </div>

        <Input
          label={mode === "add" ? "Unidades a sumar (negativo para restar)" : "Nuevo stock total"}
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={mode === "add" ? "p. ej. 50" : "p. ej. 120"}
          autoFocus
        />

        <p className="text-sm text-slate-500">
          Stock resultante: <span className="font-semibold text-slate-800">{preview}</span>
        </p>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Guardar</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Vista de Recuento físico ─────────────────────────────────────────────────

const COUNT_STORAGE_KEY = "almacen-recuento-v1";

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function CountView({
  loading,
  products,
  onApplied,
  onLightbox,
}: {
  loading: boolean;
  products: Product[];
  onApplied: () => void;
  onLightbox: (img: { url: string; filename: string }) => void;
}) {
  const [counts, setCounts] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(COUNT_STORAGE_KEY) || "{}"); } catch { return {}; }
  });
  const [search, setSearch] = useState("");
  const [familyTab, setFamilyTab] = useState<(typeof FAMILY_TABS)[number]>("ALL");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts)); } catch { /* almacenamiento lleno */ }
  }, [counts]);

  const setCount = (id: string, raw: string) =>
    setCounts((prev) => {
      if (raw === "") { const next = { ...prev }; delete next[id]; return next; }
      const val = Math.max(0, Math.floor(Number(raw)));
      return { ...prev, [id]: String(val) };
    });

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return products.filter((p) => {
      if (familyTab !== "ALL" && p.family !== familyTab) return false;
      if (q && !normalize(p.name).includes(q)) return false;
      return true;
    });
  }, [products, search, familyTab]);

  const countedEntries = useMemo(
    () => products.filter((p) => counts[p.id] !== undefined && counts[p.id] !== ""),
    [products, counts],
  );
  const withDiff = countedEntries.filter((p) => Number(counts[p.id]) !== p.stock).length;

  const exportCsv = () => {
    const header = ["Familia", "Producto", "Proveedor", "Stock sistema", "Contado", "Diferencia"];
    const rows = filtered.map((p) => {
      const raw = counts[p.id];
      const counted = raw !== undefined && raw !== "" ? Number(raw) : "";
      const diff = counted === "" ? "" : Number(counted) - p.stock;
      return [METAL_FAMILY_LABELS[p.family], p.name, p.supplier ?? "", p.stock, counted, diff];
    });
    const csv = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recuento-almacen-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyAdjustments = async () => {
    if (countedEntries.length === 0) return;
    if (!confirm(`Vas a fijar el stock de ${countedEntries.length} producto${countedEntries.length !== 1 ? "s" : ""} a su valor contado. ¿Continuar?`)) return;
    setApplying(true);
    const items = countedEntries.map((p) => ({ id: p.id, counted: Number(counts[p.id]) }));
    const res = await fetch("/api/products/stock-adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    setApplying(false);
    if (!res.ok) { toast.error(data.error ?? "Error al aplicar los ajustes"); return; }
    toast.success(`${data.updated} producto${data.updated !== 1 ? "s" : ""} ajustado${data.updated !== 1 ? "s" : ""}`);
    setCounts({});
    onApplied();
  };

  const clearCounts = () => {
    if (countedEntries.length > 0 && !confirm("¿Borrar todas las cantidades contadas?")) return;
    setCounts({});
  };

  return (
    <Card>
      {/* Tabs por familia */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {FAMILY_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setFamilyTab(tab)}
            className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              familyTab === tab ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "ALL" ? "Todos" : METAL_FAMILY_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Buscador + acciones */}
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:flex-1 sm:w-auto sm:min-w-[180px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <Button variant="outline" onClick={exportCsv} className="gap-1.5 flex-1 sm:flex-none justify-center">
          <ArrowDownTrayIcon className="h-4 w-4" /> <span className="hidden sm:inline">Exportar a </span>Excel
        </Button>
        <Button onClick={applyAdjustments} loading={applying} disabled={countedEntries.length === 0} className="gap-1.5 flex-1 sm:flex-none justify-center">
          <CheckCircleIcon className="h-4 w-4" /> Aplicar
        </Button>
      </div>

      <CardContent className="p-0">
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-10 text-sm text-slate-400 text-center">No hay productos.</p>
        ) : (
          <>
            {/* Cabecera tabla */}
            <div className="hidden sm:grid grid-cols-[1fr_90px_110px_90px] gap-3 px-5 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <span>Producto</span>
              <span className="text-center">Sistema</span>
              <span className="text-center">Contado</span>
              <span className="text-center">Diferencia</span>
            </div>
            <div className="divide-y divide-slate-100">
              {filtered.map((p) => {
                const raw = counts[p.id];
                const hasCount = raw !== undefined && raw !== "";
                const diff = hasCount ? Number(raw) - p.stock : null;
                const diffClass = diff === null ? "text-slate-300" : diff === 0 ? "text-slate-400" : diff > 0 ? "text-emerald-600" : "text-red-600";
                return (
                  <div key={p.id} className="flex flex-col gap-2 px-4 py-3 sm:grid sm:grid-cols-[1fr_90px_110px_90px] sm:gap-3 sm:items-center sm:px-5 sm:py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      {p.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => onLightbox({ url: p.imageUrl!, filename: p.name })}
                          className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden cursor-zoom-in focus-ring"
                          title="Ampliar foto"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                        </button>
                      ) : (
                        <div className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                          <PhotoIcon className="h-4 w-4 text-slate-300" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                        <p className="text-xs text-slate-400">{METAL_FAMILY_LABELS[p.family]}</p>
                      </div>
                    </div>

                    {/* Métricas: en móvil fila con etiquetas; en escritorio celdas del grid */}
                    <div className="flex items-center justify-between gap-3 sm:contents">
                      <span className="text-sm text-slate-600 sm:text-center sm:font-medium">
                        <span className="text-xs text-slate-400 sm:hidden">Sistema </span>
                        <span className="font-semibold sm:font-medium">{p.stock}</span>
                      </span>

                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={raw ?? ""}
                        onChange={(e) => setCount(p.id, e.target.value)}
                        placeholder="Contado"
                        className={`w-28 sm:w-full rounded-md border text-center text-base sm:text-sm py-2 sm:py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                          hasCount ? "border-indigo-300 bg-white text-indigo-700 font-semibold" : "border-slate-200 bg-white text-slate-500"
                        }`}
                      />

                      <span className={`text-sm font-semibold sm:text-center ${diffClass}`}>
                        <span className="text-xs text-slate-400 font-normal sm:hidden">Dif </span>
                        {diff === null ? "—" : diff > 0 ? `+${diff}` : diff}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 flex-wrap text-sm">
          <span className="text-slate-500">
            {countedEntries.length > 0
              ? <><span className="font-medium text-indigo-600">{countedEntries.length} contado{countedEntries.length !== 1 ? "s" : ""}</span>{withDiff > 0 && <span className="text-slate-400"> · {withDiff} con diferencia</span>}</>
              : "Introduce las cantidades contadas. Se guardan en este dispositivo hasta que las apliques."}
          </span>
          {countedEntries.length > 0 && (
            <button onClick={clearCounts} className="text-xs text-slate-400 hover:text-red-500 transition-colors">
              Limpiar recuento
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
