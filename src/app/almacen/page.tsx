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
import { canManageWarehouse } from "@/lib/permissions";
import { METAL_FAMILY_LABELS, METAL_FAMILY_OPTIONS } from "@/lib/metal-families";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import type { MetalFamily } from "@prisma/client";

interface Product {
  id: string;
  name: string;
  family: MetalFamily;
  imageUrl: string | null;
  stock: number;
  active: boolean;
}

const FAMILY_TABS = ["ALL", ...(Object.keys(METAL_FAMILY_LABELS) as MetalFamily[])] as const;

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function AlmacenPage() {
  const { data: session, status } = useSession();
  const allowed = session?.user ? canManageWarehouse(session.user) : false;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [familyTab, setFamilyTab] = useState<(typeof FAMILY_TABS)[number]>("ALL");

  const [editing, setEditing]   = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [stockFor, setStockFor] = useState<Product | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/products?all=true")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setProducts(d); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    fetch("/api/products?all=true")
      .then((r) => r.json())
      .then((d) => { if (active && Array.isArray(d)) setProducts(d); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed]);

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

  const deleteProduct = async (p: Product) => {
    if (!confirm(`¿Eliminar "${p.name}"? Si tiene pedidos asociados, se desactivará en su lugar.`)) return;
    const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "No se pudo eliminar"); return; }
    if (data.deactivated) toast.success("Producto desactivado (tiene pedidos asociados)");
    else toast.success("Producto eliminado");
    load();
  };

  const toggleActive = async (p: Product) => {
    const res = await fetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    if (res.ok) { toast.success(p.active ? "Producto desactivado" : "Producto activado"); load(); }
    else toast.error("No se pudo actualizar");
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
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-slate-500">
            Gestiona los productos del catálogo de pedidos: alta, foto y stock.
          </p>
          <Button onClick={() => setCreating(true)} className="gap-2">
            <PlusIcon className="h-4 w-4" /> Nuevo producto
          </Button>
        </div>

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
                    className={`flex items-center gap-3 px-4 py-3 ${p.active ? "" : "bg-slate-50/70 opacity-70"}`}
                  >
                    {/* Foto */}
                    <div className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <PhotoIcon className="h-5 w-5 text-slate-300" />
                      )}
                    </div>

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
                    <div className="shrink-0 flex items-center gap-1">
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
      </div>

      {(creating || editing) && (
        <ProductModal
          product={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}

      {stockFor && (
        <StockModal
          product={stockFor}
          onClose={() => setStockFor(null)}
          onSaved={() => { setStockFor(null); load(); }}
        />
      )}
    </AppLayout>
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
    const payload = isEdit
      ? { name, family, imageUrl }
      : { name, family, imageUrl, stock: Math.max(0, Math.floor(Number(stock) || 0)) };
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
