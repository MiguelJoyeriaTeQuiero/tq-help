"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { BellIcon } from "@heroicons/react/24/outline";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotificacionesPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => { setNotifications(Array.isArray(d) ? d : []); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH" });
    load();
  };

  return (
    <AppLayout title="Notificaciones">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">{notifications.filter((n) => !n.read).length} sin leer</p>
          <Button size="sm" variant="outline" onClick={markAllRead}>
            Marcar todas como leídas
          </Button>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 flex items-start gap-3">
                <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="flex justify-between gap-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <BellIcon className="mx-auto h-10 w-10 mb-2" />
            No hay notificaciones
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <Card key={n.id} className={`p-4 ${!n.read ? "border-indigo-200 bg-indigo-50" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{n.title}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
                    {n.link && (
                      <Link href={n.link} className="text-xs text-indigo-600 hover:underline mt-1 block">
                        Ver detalle →
                      </Link>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: es })}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
