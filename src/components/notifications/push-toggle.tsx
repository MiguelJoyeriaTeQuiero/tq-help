"use client";

import { usePush } from "@/hooks/use-push";
import { BellIcon, BellSlashIcon } from "@heroicons/react/24/outline";

export function PushToggle() {
  const { state, subscribe, unsubscribe } = usePush();

  if (state === "unsupported") return null;
  if (state === "loading") return null;

  if (state === "denied") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
        <BellSlashIcon className="h-4 w-4 flex-shrink-0" />
        Notificaciones bloqueadas en el navegador
      </div>
    );
  }

  if (state === "subscribed") {
    return (
      <button
        onClick={unsubscribe}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
        title="Desactivar notificaciones push"
      >
        <BellIcon className="h-4 w-4 text-indigo-500" />
        Notificaciones activadas
        <span className="text-slate-400 ml-1">· Desactivar</span>
      </button>
    );
  }

  return (
    <button
      onClick={subscribe}
      className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-700 hover:bg-indigo-100 transition-colors"
      title="Activar notificaciones push"
    >
      <BellIcon className="h-4 w-4" />
      Activar notificaciones push
    </button>
  );
}
