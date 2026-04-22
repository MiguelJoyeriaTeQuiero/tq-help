"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/permissions";
import {
  METAL_FAMILY_LABELS,
  METAL_ORDER_STATUS_LABELS,
  METAL_ORDER_STATUS_COLORS,
} from "@/lib/metal-families";
import { getDeptLabel } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckIcon,
  XMarkIcon,
  TruckIcon,
  ArchiveBoxIcon,
  PencilSquareIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import type { MetalFamily, MetalOrderStatus } from "@prisma/client";

interface OrderItem {
  id: string;
  family: MetalFamily;
  description: string | null;
  quantity: number;
  originalQuantity: number | null;
}

interface OrderDetail {
  id: string;
  status: MetalOrderStatus;
  notes: string | null;
  department: string;
  createdBy: { id: string; name: string };
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_FLOW: Record<MetalOrderStatus, MetalOrderStatus | null> = {
  BORRADOR:   "ENVIADO",
  ENVIADO:    "CONFIRMADO",
  CONFIRMADO: "PREPARANDO",
  PREPARANDO: "EN_CAMINO",
  EN_CAMINO:  "ENTREGADO",
  ENTREGADO:  null,
  CANCELADO:  null,
};

const NEXT_ACTION_LABEL: Record<MetalOrderStatus, string> = {
  BORRADOR:   "Enviar pedido",
  ENVIADO:    "Confirmar recepción",
  CONFIRMADO: "Marcar en preparación",
  PREPARANDO: "Marcar enviado",
  EN_CAMINO:  "Marcar entregado",
  ENTREGADO:  "",
  CANCELADO:  "",
};

export default function PedidoMetalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params);
  const router  = useRouter();
  const { data: session } = useSession();
  const admin   = session?.user ? isAdmin(session.user) : false;

  const [order,      setOrder]      = useState<OrderDetail | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [acting,     setActing]     = useState(false);

  // Edición de cantidades (admin)
  const [editMode,   setEditMode]   = useState(false);
  const [draftQtys,  setDraftQtys]  = useState<Record<string, number>>({});
  const [saving,     setSaving]     = useState(false);
  const [saveMsg,    setSaveMsg]    = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch(`/api/metal-orders/${id}`)
      .then((r) => r.json())
      .then((d) => { setOrder(d); setLoading(false); });
  }, [id]);

  // Al entrar en modo edición, inicializa el draft con las cantidades actuales
  const enterEditMode = () => {
    if (!order) return;
    const draft: Record<string, number> = {};
    order.items.forEach((it) => { draft[it.id] = it.quantity; });
    setDraftQtys(draft);
    setEditMode(true);
    setSaveMsg("");
  };

  const cancelEdit = () => { setEditMode(false); setSaveMsg(""); };

  const downloadReport = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/metal-orders/${id}/report`);
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Error al generar el informe");
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `no-disponibles-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const saveQuantities = async () => {
    if (!order) return;
    setSaving(true);
    setSaveMsg("");
    const items = order.items
      .map((it) => ({ id: it.id, quantity: draftQtys[it.id] ?? it.quantity }))
      .filter((it) => it.quantity >= 0);

    const res = await fetch(`/api/metal-orders/${id}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (res.ok) {
      setOrder(data);
      setEditMode(false);
      setSaveMsg("Cantidades actualizadas. Se ha notificado a la tienda.");
    } else {
      setSaveMsg(data.error ?? "Error al guardar");
    }
    setSaving(false);
  };

  const updateStatus = async (status: MetalOrderStatus) => {
    setActing(true);
    const res = await fetch(`/api/metal-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    setOrder(data);
    setActing(false);
  };

  const deleteOrder = async () => {
    if (!confirm("¿Eliminar este borrador?")) return;
    await fetch(`/api/metal-orders/${id}`, { method: "DELETE" });
    router.push("/pedidos-metal");
  };

  if (loading) {
    return (
      <AppLayout title="Pedido de material">
        <div className="space-y-4 max-w-2xl">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  if (!order) {
    return (
      <AppLayout title="Pedido no encontrado">
        <p className="text-slate-500">Este pedido no existe o no tienes acceso.</p>
      </AppLayout>
    );
  }

  const nextStatus     = STATUS_FLOW[order.status];
  const isDone         = order.status === "ENTREGADO" || order.status === "CANCELADO";
  const isOwner        = order.createdBy.id === session?.user?.id;
  const canAdvance     = nextStatus !== null && (admin || (order.status === "BORRADOR" && isOwner));
  const canCancel      = !isDone && (admin || (order.status === "BORRADOR" && isOwner));
  const canEdit        = admin && !isDone;
  const hasModified    = order.items.some((it) => it.originalQuantity !== null);
  const hasUnavailable = order.items.some((it) => it.quantity === 0);

  // Columnas del grid de artículos
  // Si hay modificaciones: Familia | Descripción | Cant. original | Cant. actual
  // Si no: Familia | Descripción | Cant.
  const gridCols = hasModified || editMode
    ? "sm:grid-cols-[2fr_3fr_90px_90px]"
    : "sm:grid-cols-[2fr_3fr_90px]";

  return (
    <AppLayout title="Pedido de material">
      <div className="max-w-2xl space-y-5">

        {/* ── Meta y acciones de estado ── */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-1">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${METAL_ORDER_STATUS_COLORS[order.status]}`}>
                  {METAL_ORDER_STATUS_LABELS[order.status]}
                </span>
                <p className="text-sm text-slate-500">
                  {getDeptLabel(order.department)} · {order.createdBy.name}
                </p>
                <p className="text-xs text-slate-400">
                  Creado el {new Date(order.createdAt).toLocaleDateString("es-ES", {
                    day: "2-digit", month: "long", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
                {order.notes && (
                  <p className="text-sm text-slate-600 mt-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                    {order.notes}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {canAdvance && nextStatus && (
                  <Button onClick={() => updateStatus(nextStatus)} loading={acting} className="gap-2 text-sm">
                    {order.status === "BORRADOR"  && <ArchiveBoxIcon className="h-4 w-4" />}
                    {order.status === "EN_CAMINO" && <TruckIcon className="h-4 w-4" />}
                    {!["BORRADOR","EN_CAMINO"].includes(order.status) && <CheckIcon className="h-4 w-4" />}
                    {NEXT_ACTION_LABEL[order.status]}
                  </Button>
                )}
                {canCancel && (
                  <Button
                    variant="outline"
                    onClick={() => updateStatus("CANCELADO")}
                    loading={acting}
                    className="gap-2 text-sm text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    <XMarkIcon className="h-4 w-4" /> Cancelar pedido
                  </Button>
                )}
                {order.status === "BORRADOR" && isOwner && (
                  <button
                    onClick={deleteOrder}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors text-right"
                  >
                    Eliminar borrador
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Banner: artículos no disponibles ── */}
        {hasUnavailable && (
          <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-red-700">
                Hay artículos no disponibles en este pedido
              </p>
              <p className="text-xs text-red-500 mt-0.5">
                El administrador ha marcado {order.items.filter((it) => it.quantity === 0).length}{" "}
                {order.items.filter((it) => it.quantity === 0).length === 1 ? "artículo" : "artículos"} como no disponible.
              </p>
            </div>
            <Button
              onClick={downloadReport}
              loading={downloading}
              variant="outline"
              className="gap-1.5 text-sm border-red-300 text-red-600 hover:bg-red-100 hover:text-red-700 shrink-0"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Descargar informe
            </Button>
          </div>
        )}

        {/* ── Artículos ── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2">
              <span>Artículos</span>
              {hasModified && (
                <span className="text-xs font-normal text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                  Cantidades modificadas por admin
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm font-normal text-slate-400">
                {order.items.reduce((s, it) => s + it.quantity, 0)} uds. totales
              </span>
              {canEdit && !editMode && (
                <button
                  onClick={enterEditMode}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors ml-2"
                >
                  <PencilSquareIcon className="h-3.5 w-3.5" /> Editar cantidades
                </button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Cabecera tabla */}
            <div className={`hidden sm:grid ${gridCols} gap-3 px-5 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide`}>
              <span>Familia</span>
              <span>Descripción</span>
              {(hasModified || editMode) && (
                <span className="text-center text-slate-400">Pedido</span>
              )}
              <span className="text-center">{editMode ? "Nueva cant." : (hasModified ? "Ajustado" : "Cant.")}</span>
            </div>

            {/* Filas */}
            <div className="divide-y divide-slate-100">
              {order.items.map((item) => {
                const wasModified = item.originalQuantity !== null;
                const draftVal    = draftQtys[item.id] ?? item.quantity;

                return (
                  <div
                    key={item.id}
                    className={`grid grid-cols-1 ${gridCols} gap-1 sm:gap-3 px-5 py-3 items-center`}
                  >
                    {/* Familia */}
                    <span className="font-medium text-sm text-slate-800">
                      {METAL_FAMILY_LABELS[item.family]}
                    </span>

                    {/* Descripción */}
                    <span className="text-sm text-slate-500">
                      {item.description || <span className="text-slate-300 italic">—</span>}
                    </span>

                    {/* Cantidad original (pedida) — solo si hay modificaciones o en modo edición */}
                    {(hasModified || editMode) && (
                      <span className="text-sm sm:text-center">
                        {wasModified ? (
                          <span className="line-through text-slate-400 font-normal">
                            {item.originalQuantity}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-medium">{item.quantity}</span>
                        )}
                      </span>
                    )}

                    {/* Cantidad actual / input edición */}
                    <span className="text-sm sm:text-center">
                      {editMode ? (
                        <input
                          type="number"
                          min={0}
                          value={draftVal}
                          onChange={(e) =>
                            setDraftQtys((prev) => ({
                              ...prev,
                              [item.id]: Math.max(0, Number(e.target.value)),
                            }))
                          }
                          className="w-16 rounded-lg border border-indigo-300 bg-white px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      ) : wasModified && item.quantity === 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                          No disponible
                        </span>
                      ) : wasModified ? (
                        <span className="font-bold text-indigo-700">{item.quantity}</span>
                      ) : (
                        <span className="font-semibold text-slate-700">
                          <span className="sm:hidden text-slate-400 font-normal">Cant: </span>
                          {item.quantity}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer totales / acciones edición */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
              <span className="text-sm text-slate-400">
                {order.items.length} {order.items.length === 1 ? "línea" : "líneas"}
              </span>
              {editMode ? (
                <div className="flex gap-2 items-center flex-wrap">
                  <button
                    onClick={cancelEdit}
                    className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <Button onClick={saveQuantities} loading={saving} className="text-sm gap-1.5">
                    <CheckIcon className="h-4 w-4" /> Guardar cambios
                  </Button>
                </div>
              ) : (
                <span className="font-semibold text-sm text-slate-700">
                  Total: {order.items.reduce((s, it) => s + it.quantity, 0)} uds.
                </span>
              )}
            </div>

            {/* Mensaje de confirmación / error tras guardar */}
            {saveMsg && (
              <div className={`px-5 py-2.5 text-sm border-t ${
                saveMsg.startsWith("Error") || saveMsg.startsWith("La cantidad")
                  ? "bg-red-50 text-red-600 border-red-100"
                  : "bg-green-50 text-green-700 border-green-100"
              }`}>
                {saveMsg}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-start">
          <Button variant="outline" onClick={() => router.push("/pedidos-metal")}>
            ← Volver a pedidos
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
