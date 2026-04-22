"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { METAL_FAMILY_OPTIONS, METAL_FAMILY_LABELS } from "@/lib/metal-families";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { MetalFamily } from "@prisma/client";

interface OrderItem {
  family: MetalFamily;
  description: string;
  quantity: number;
}

function emptyItem(): OrderItem {
  return { family: "ANILLO", description: "", quantity: 1 };
}

export default function NuevoPedidoMetalPage() {
  const router = useRouter();
  const [notes, setNotes]   = useState("");
  const [items, setItems]   = useState<OrderItem[]>([emptyItem()]);
  const [saving, setSaving] = useState<"draft" | "send" | null>(null);
  const [error, setError]   = useState("");

  const addRow = () => setItems((prev) => [...prev, emptyItem()]);

  const removeRow = (i: number) =>
    setItems((prev) => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);

  const updateItem = (i: number, field: keyof OrderItem, value: string | number) =>
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const submit = async (send: boolean) => {
    setError("");
    if (items.some((it) => it.quantity < 1)) {
      setError("Todas las cantidades deben ser ≥ 1");
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

        {/* Notas generales */}
        <Card>
          <CardHeader>
            <CardTitle>Observaciones del pedido</CardTitle>
          </CardHeader>
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

        {/* Líneas del pedido */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Artículos</CardTitle>
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              <PlusIcon className="h-4 w-4" /> Añadir línea
            </button>
          </CardHeader>
          <CardContent className="p-0">

            {/* Cabecera tabla */}
            <div className="hidden sm:grid grid-cols-[2fr_3fr_80px_40px] gap-3 px-5 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <span>Familia</span>
              <span>Descripción</span>
              <span className="text-center">Cant.</span>
              <span />
            </div>

            {/* Filas */}
            <div className="divide-y divide-slate-100">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 sm:grid-cols-[2fr_3fr_80px_40px] gap-3 px-5 py-3 items-center"
                >
                  {/* Familia */}
                  <div>
                    <label className="sm:hidden text-xs text-slate-400 mb-1 block">Familia</label>
                    <select
                      value={item.family}
                      onChange={(e) => updateItem(i, "family", e.target.value as MetalFamily)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      {METAL_FAMILY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="sm:hidden text-xs text-slate-400 mb-1 block">Descripción</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(i, "description", e.target.value)}
                      placeholder="Ej: oro 18k, 4g aprox."
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  {/* Cantidad */}
                  <div>
                    <label className="sm:hidden text-xs text-slate-400 mb-1 block">Cantidad</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(i, "quantity", Math.max(1, Number(e.target.value)))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  {/* Eliminar */}
                  <button
                    onClick={() => removeRow(i)}
                    disabled={items.length === 1}
                    className="text-slate-300 hover:text-red-500 transition-colors disabled:opacity-0 justify-self-center"
                    aria-label="Eliminar línea"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-sm text-slate-500">
              <span>{items.length} {items.length === 1 ? "línea" : "líneas"}</span>
              <span className="font-medium text-slate-700">
                Total: {items.reduce((s, it) => s + it.quantity, 0)} uds.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Acciones */}
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
