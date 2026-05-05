"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { METAL_FAMILY_LABELS, MATERIAL_CATALOG } from "@/lib/metal-families";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { MetalFamily } from "@prisma/client";

const TABS = Object.keys(METAL_FAMILY_LABELS) as MetalFamily[];

type Quantities = Record<string, number>;

function itemKey(family: MetalFamily, article: string) {
  return `${family}::${article}`;
}

export default function NuevoPedidoMetalPage() {
  const router = useRouter();
  const [notes, setNotes]         = useState("");
  const [activeTab, setActiveTab] = useState<MetalFamily>(TABS[0]);
  const [quantities, setQuantities] = useState<Quantities>({});
  const [search, setSearch]       = useState("");
  const [saving, setSaving]       = useState<"draft" | "send" | null>(null);
  const [error, setError]         = useState("");

  const setQty = (family: MetalFamily, article: string, raw: string) => {
    const val = raw === "" ? 0 : Math.max(0, Math.floor(Number(raw)));
    const key = itemKey(family, article);
    setQuantities((prev) => {
      if (val === 0) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: val };
    });
  };

  const getQty = (family: MetalFamily, article: string) =>
    quantities[itemKey(family, article)] ?? 0;

  const countForTab = (family: MetalFamily) =>
    MATERIAL_CATALOG[family].filter((a) => getQty(family, a) > 0).length;

  const totalSelected = useMemo(
    () => Object.keys(quantities).length,
    [quantities]
  );

  const totalUnits = useMemo(
    () => Object.values(quantities).reduce((s, v) => s + v, 0),
    [quantities]
  );

  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const filteredArticles = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return MATERIAL_CATALOG[activeTab];
    return MATERIAL_CATALOG[activeTab].filter((a) => normalize(a).includes(q));
  }, [activeTab, search]);

  const submit = async (send: boolean) => {
    setError("");
    const items = TABS.flatMap((family) =>
      MATERIAL_CATALOG[family]
        .filter((a) => getQty(family, a) > 0)
        .map((a) => ({ family, description: a, quantity: getQty(family, a) }))
    );
    if (items.length === 0) {
      setError("Añade al menos un artículo con cantidad mayor a 0");
      return;
    }
    setSaving(send ? "send" : "draft");
    try {
      const res = await fetch("/api/metal-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, items, send }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Error al guardar");
        return;
      }
      const order = await res.json();
      router.push(`/pedidos-metal/${order.id}`);
    } finally {
      setSaving(null);
    }
  };

  return (
    <AppLayout title="Nuevo pedido de material">
      <div className="max-w-3xl space-y-5">

        {/* Notas */}
        <Card>
          <CardHeader><CardTitle>Observaciones del pedido</CardTitle></CardHeader>
          <CardContent>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrucciones especiales, urgencias, referencias… (opcional)"
              rows={2}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </CardContent>
        </Card>

        {/* Catálogo */}
        <Card>
          {/* Tabs */}
          <div className="flex border-b border-slate-200 overflow-x-auto">
            {TABS.map((tab) => {
              const count = countForTab(tab);
              return (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSearch(""); }}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {METAL_FAMILY_LABELS[tab]}
                  {count > 0 && (
                    <span className="rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold px-1.5 py-0.5 leading-none">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Buscador */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Buscar en ${METAL_FAMILY_LABELS[activeTab]}…`}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* Lista de artículos */}
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {filteredArticles.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-400 text-center">
                  Sin resultados para &ldquo;{search}&rdquo;
                </p>
              ) : (
                filteredArticles.map((article) => {
                  const qty = getQty(activeTab, article);
                  return (
                    <div
                      key={article}
                      className={`flex items-center justify-between gap-3 px-5 py-2.5 transition-colors ${
                        qty > 0 ? "bg-indigo-50/60" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className={`text-sm flex-1 ${qty > 0 ? "text-indigo-900 font-medium" : "text-slate-700"}`}>
                        {article}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setQty(activeTab, article, String(Math.max(0, qty - 1)))}
                          disabled={qty === 0}
                          className="w-7 h-7 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-base leading-none flex items-center justify-center font-medium transition-colors"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={qty === 0 ? "" : qty}
                          onChange={(e) => setQty(activeTab, article, e.target.value)}
                          placeholder="0"
                          className={`w-12 rounded-md border text-center text-sm py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                            qty > 0
                              ? "border-indigo-300 bg-white text-indigo-700 font-semibold"
                              : "border-slate-200 bg-white text-slate-500"
                          }`}
                        />
                        <button
                          onClick={() => setQty(activeTab, article, String(qty + 1))}
                          className="w-7 h-7 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 text-base leading-none flex items-center justify-center font-medium transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer resumen */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-sm text-slate-500">
              <span>
                {totalSelected > 0
                  ? <span className="text-indigo-600 font-medium">{totalSelected} artículo{totalSelected !== 1 ? "s" : ""} seleccionado{totalSelected !== 1 ? "s" : ""}</span>
                  : "Ningún artículo seleccionado aún"
                }
              </span>
              {totalUnits > 0 && (
                <span className="font-medium text-slate-700">Total: {totalUnits} uds.</span>
              )}
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex flex-wrap gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => submit(false)}
            loading={saving === "draft"}
            disabled={saving !== null}
          >
            Guardar borrador
          </Button>
          <Button
            onClick={() => submit(true)}
            loading={saving === "send"}
            disabled={saving !== null}
          >
            Enviar pedido
          </Button>
        </div>

      </div>
    </AppLayout>
  );
}
