"use client";

import { useSession } from "next-auth/react";
import { BellIcon, Bars3Icon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect } from "react";

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUnread(data.filter((n: any) => !n.read).length);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* Botón hamburger — solo visible en móvil */}
        <button
          onClick={onMenuClick}
          className="lg:hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="Abrir menú"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-slate-900 truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Notificaciones */}
        <Link href="/notificaciones" className="relative p-1">
          <BellIcon className="h-6 w-6 text-slate-500 hover:text-slate-700" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold leading-none">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>

        {/* Nombre usuario — solo visible en desktop */}
        {session?.user && (
          <span className="hidden md:block text-sm text-slate-500 truncate max-w-[160px]">
            {session.user.name}
          </span>
        )}
      </div>
    </header>
  );
}
