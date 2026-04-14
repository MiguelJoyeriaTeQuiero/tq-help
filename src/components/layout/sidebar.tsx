"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn, DEPARTMENT_LABELS, ROLE_LABELS } from "@/lib/utils";
import {
  TicketIcon,
  LightBulbIcon,
  MapIcon,
  ShieldExclamationIcon,
  ChartBarIcon,
  UsersIcon,
  Cog6ToothIcon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

const navItems = [
  { href: "/tickets",            label: "Incidencias",        icon: TicketIcon,            roles: ["SUPERADMIN", "DEPT_ADMIN", "EMPLOYEE", "VIEWER"] },
  { href: "/peticiones",         label: "Peticiones",         icon: LightBulbIcon,          roles: ["SUPERADMIN", "DEPT_ADMIN", "EMPLOYEE", "VIEWER"] },
  { href: "/roadmap",            label: "Roadmap",            icon: MapIcon,                roles: ["SUPERADMIN", "DEPT_ADMIN", "EMPLOYEE", "VIEWER"] },
  { href: "/denuncias/consultar",label: "Canal de denuncias", icon: ShieldExclamationIcon,  roles: ["SUPERADMIN", "DEPT_ADMIN", "EMPLOYEE", "VIEWER"] },
  { href: "/admin",              label: "Panel admin",        icon: ChartBarIcon,           roles: ["SUPERADMIN", "DEPT_ADMIN", "VIEWER"], exact: true },
  { href: "/admin/usuarios",     label: "Usuarios",           icon: UsersIcon,              roles: ["SUPERADMIN"] },
  { href: "/admin/configuracion",label: "Configuración",      icon: Cog6ToothIcon,          roles: ["SUPERADMIN"] },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const visible = navItems.filter((item) => !role || item.roles.includes(role));

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      {/* Logo + botón cerrar (solo móvil) */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-slate-200">
        <span className="text-lg font-bold text-indigo-600">TQ-HELP</span>
        <button
          onClick={onClose}
          className="lg:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Cerrar menú"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visible.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Perfil de usuario */}
      {session?.user && (
        <div className="border-t border-slate-200 px-4 py-3">
          <p className="text-sm font-medium text-slate-900 truncate">{session.user.name}</p>
          <p className="text-xs text-slate-500 truncate">
            {DEPARTMENT_LABELS[session.user.department]} · {ROLE_LABELS[session.user.role]}
          </p>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-2 flex items-center gap-2 text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      )}
    </aside>
  );
}
