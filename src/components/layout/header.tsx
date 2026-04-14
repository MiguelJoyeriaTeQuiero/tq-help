"use client";

import { useSession } from "next-auth/react";
import { BellIcon, Bars3Icon, XMarkIcon, SunIcon, MoonIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useTheme } from "@/components/theme-provider";

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string | null;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const { theme, toggle } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setNotifications(data);
          setUnread(data.filter((n: Notification) => !n.read).length);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch once on mount, then poll every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  // Auto-mark all as read after 2 seconds when dropdown is open
  useEffect(() => {
    if (!dropdownOpen || last8.length === 0) return;
    const timer = setTimeout(() => {
      fetch("/api/notifications", { method: "PATCH" }).then(() => fetchNotifications());
    }, 2000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropdownOpen]);

  const handleMarkAllRead = async () => {
    setMarkingRead(true);
    await fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
    setMarkingRead(false);
    fetchNotifications();
  };

  const handleNotificationClick = async (notifId: string) => {
    setDropdownOpen(false);
    await fetch(`/api/notifications/${notifId}`, { method: "PATCH" }).catch(() => {});
    fetchNotifications();
  };

  const last8 = notifications.slice(0, 8);

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
        {/* Nombre usuario — solo visible en desktop */}
        {session?.user && (
          <span className="hidden md:block text-sm text-slate-500 truncate max-w-[160px]">
            {session.user.name}
          </span>
        )}

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="Cambiar tema"
        >
          {theme === "dark"
            ? <SunIcon className="h-5 w-5" />
            : <MoonIcon className="h-5 w-5" />
          }
        </button>

        {/* Notificaciones */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="relative p-1 rounded-md hover:bg-slate-100 transition-colors"
            aria-label="Notificaciones"
          >
            <BellIcon className="h-6 w-6 text-slate-500 hover:text-slate-700" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold leading-none">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {/* Dropdown panel */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white shadow-lg z-50">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-900">Notificaciones</span>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      disabled={markingRead}
                      className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors"
                    >
                      {markingRead ? "Marcando..." : "Marcar todas leídas"}
                    </button>
                  )}
                  <button
                    onClick={() => setDropdownOpen(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    aria-label="Cerrar"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Notification list */}
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                {last8.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-400">
                    No tienes notificaciones
                  </p>
                ) : (
                  last8.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 text-sm ${!n.read ? "bg-indigo-50" : "bg-white"}`}
                    >
                      {n.link ? (
                        <Link
                          href={n.link}
                          onClick={() => handleNotificationClick(n.id)}
                          className="block hover:opacity-80 transition-opacity"
                        >
                          <p className="font-medium text-slate-800 truncate">{n.title}</p>
                          <p className="text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: es })}
                          </p>
                        </Link>
                      ) : (
                        <div onClick={() => handleNotificationClick(n.id)} className="cursor-pointer">
                          <p className="font-medium text-slate-800 truncate">{n.title}</p>
                          <p className="text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: es })}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 px-4 py-2 text-center">
                <Link
                  href="/notificaciones"
                  onClick={() => setDropdownOpen(false)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  Ver todas →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
