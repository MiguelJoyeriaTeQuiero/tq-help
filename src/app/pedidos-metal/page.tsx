"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/permissions";
import {
  METAL_ORDER_STATUS_LABELS,
  METAL_ORDER_STATUS_COLORS,
} from "@/lib/metal-families";
import { getDeptLabel } from "@/lib/utils";
import { PlusIcon, CubeIcon } from "@heroicons/react/24/outline";
import { Skeleton } from "@/components/ui/skeleton";
import type { MetalOrderStatus } from "@prisma/client";

interface OrderSummary {
  id: string;
  status: MetalOrderStatus;
  notes: string | null;
  department: string;
  createdBy: { name: string };
  items: { id: string }[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "BORRADOR",   label: "Borrador" },
  { value: "ENVIADO",    label: "Enviado" },
  { value: "CONFIRMADO", label: "Confirmado" },
  { value: "PREPARANDO", label: "Preparando" },
  { value: "EN_CAMINO",  label: "En camino" },
  { value: "ENTREGADO",  label: "Entregado" },
  { value: "CANCELADO",  label: "Cancelado" },
];

export default function PedidosMetalPage() {
  const { data: session } = useSession();
  const admin = session?.user ? isAdmin(session.user) : false;

  const [orders, setOrders]   = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("");

  useEffect(() => {
    const url = filter ? `/api/metal-orders?status=${filter}` : "/api/metal-orders";
    setLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((d) => { setOrders(Array.isArray(d) ? d : []); setLoading(false); });
  }, [filter]);

  return (
    <AppLayout title="Pedidos de material">
      <div className="space-y-4">

        {/* Cabecera */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm text-slate-500">
              {admin ? "Pedidos de todas las tiendas" : "Mis pedidos de material de ocasión"}
            </p>
          </div>
          <Link href="/pedidos-metal/nuevo">
            <Button className="gap-2">
              <PlusIcon className="h-4 w-4" /> Nuevo pedido
            </Button>
          </Link>
        </div>

        {/* Filtro de estado */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                filter === f.value
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <CubeIcon className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No hay pedidos{filter ? " con ese estado" : ""}</p>
              <Link href="/pedidos-metal/nuevo" className="mt-3 inline-block">
                <Button variant="outline" size="sm">Crear primer pedido</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link key={order.id} href={`/pedidos-metal/${order.id}`}>
                <Card className="hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${METAL_ORDER_STATUS_COLORS[order.status]}`}>
                            {METAL_ORDER_STATUS_LABELS[order.status]}
                          </span>
                          <span className="text-xs text-slate-400">
                            {getDeptLabel(order.department)}
                            {admin && ` · ${order.createdBy.name}`}
                          </span>
                        </div>
                        {order.notes && (
                          <p className="mt-1 text-sm text-slate-600 truncate">{order.notes}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {order.items.length} {order.items.length === 1 ? "artículo" : "artículos"} ·{" "}
                          {new Date(order.createdAt).toLocaleDateString("es-ES", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </p>
                      </div>
                      <span className="text-indigo-500 text-sm shrink-0">Ver →</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
