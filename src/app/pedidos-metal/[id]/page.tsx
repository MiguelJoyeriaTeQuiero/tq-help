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
import { CheckIcon, XMarkIcon, TruckIcon, ArchiveBoxIcon } from "@heroicons/react/24/outline";
import type { MetalFamily, MetalOrderStatus } from "@prisma/client";

interface OrderDetail {
  id: string;
  status: MetalOrderStatus;
  notes: string | null;
  department: string;
  createdBy: { id: string; name: string };
  items: { id: string; family: MetalFamily; description: string | null; quantity: number }[];
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
  const { id } = use(params);
  const router  = useRouter();
  const { data: session } = useSession();
  const admin   = session?.user ? isAdmin(session.user) : false;
  const isOwner = session?.user?.id !== undefined;

  const [order,   setOrder]   = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(false);

  useEffect(() => {
    fetch(`/api/metal-orders/${id}`)
      .then((r) => r.json())
      .then((d) => { setOrder(d); setLoading(false); });
  }, [id]);

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

  const nextStatus = STATUS_FLOW[order.status];
  const canAdvance = nextStatus !== null && (admin || (order.status === "BORRADOR" && order.createdBy.id === session?.user?.id));
  const canCancel  = order.status !== "ENTREGADO" && order.status !== "CANCELADO" && (admin || (order.status === "BORRADOR" && order.createdBy.id === session?.user?.id));

  return (
    <AppLayout title="Pedido de material">
      <div className="max-w-2xl space-y-5">

        {/* Estado y meta */}
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
                    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
                {order.notes && (
                  <p className="text-sm text-slate-600 mt-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                    {order.notes}
                  </p>
                )}
              </div>

              {/* Acciones de estado */}
              <div className="flex flex-col gap-2">
                {canAdvance && nextStatus && (
                  <Button
                    onClick={() => updateStatus(nextStatus)}
                    loading={acting}
                    className="gap-2 text-sm"
                  >
                    {order.status === "BORRADOR" && <ArchiveBoxIcon className="h-4 w-4" />}
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
                {order.status === "BORRADOR" && order.createdBy.id === session?.user?.id && (
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

        {/* Artículos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Artículos del pedido</span>
              <span className="text-sm font-normal text-slate-400">
                {order.items.reduce((s, it) => s + it.quantity, 0)} uds. totales
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">

            {/* Cabecera */}
            <div className="hidden sm:grid grid-cols-[2fr_3fr_80px] gap-3 px-5 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <span>Familia</span>
              <span>Descripción</span>
              <span className="text-center">Cant.</span>
            </div>

            {/* Filas */}
            <div className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 sm:grid-cols-[2fr_3fr_80px] gap-1 sm:gap-3 px-5 py-3 items-center"
                >
                  <span className="font-medium text-sm text-slate-800">
                    {METAL_FAMILY_LABELS[item.family]}
                  </span>
                  <span className="text-sm text-slate-500">
                    {item.description || <span className="text-slate-300 italic">—</span>}
                  </span>
                  <span className="text-sm font-semibold text-slate-700 sm:text-center">
                    <span className="sm:hidden text-slate-400 font-normal">Cant: </span>{item.quantity}
                  </span>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-between text-sm">
              <span className="text-slate-400">{order.items.length} {order.items.length === 1 ? "línea" : "líneas"}</span>
              <span className="font-semibold text-slate-700">
                Total: {order.items.reduce((s, it) => s + it.quantity, 0)} uds.
              </span>
            </div>
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
