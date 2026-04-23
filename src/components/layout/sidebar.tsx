"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn, getDeptLabel, ROLE_LABELS } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  TicketIcon,
  LightBulbIcon,
  MapIcon,
  ChartBarIcon,
  UsersIcon,
  Cog6ToothIcon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  ComputerDesktopIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  BoltIcon,
  SignalIcon,
  QuestionMarkCircleIcon,
  CursorArrowRaysIcon,
  CubeIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from "@heroicons/react/24/outline";

const navItems = [
  { href: "/tickets",              label: "Incidencias",        icon: TicketIcon,             roles: ["SUPERADMIN", "DEPT_ADMIN", "EMPLOYEE", "VIEWER"] },
  { href: "/peticiones",           label: "Peticiones",         icon: LightBulbIcon,           roles: ["SUPERADMIN", "DEPT_ADMIN", "EMPLOYEE", "VIEWER"] },
  { href: "/roadmap",              label: "Roadmap",            icon: MapIcon,                 roles: ["SUPERADMIN", "DEPT_ADMIN", "EMPLOYEE", "VIEWER"] },
  { href: "/activos",              label: "Activos (ITAM)",     icon: ComputerDesktopIcon,     roles: ["SUPERADMIN", "DEPT_ADMIN"] },
  { href: "/faq",                  label: "FAQ",                icon: QuestionMarkCircleIcon,  roles: ["SUPERADMIN", "DEPT_ADMIN", "EMPLOYEE", "VIEWER"] },
  { href: "/pedidos-metal",        label: "Pedidos material",   icon: CubeIcon,                roles: ["SUPERADMIN", "DEPT_ADMIN", "EMPLOYEE"] },
  { href: "/admin",                label: "Panel admin",        icon: ChartBarIcon,            roles: ["SUPERADMIN", "DEPT_ADMIN", "VIEWER"], exact: true },
  { href: "/admin/usuarios",       label: "Usuarios",           icon: UsersIcon,               roles: ["SUPERADMIN"] },
  { href: "/admin/plantillas",     label: "Plantillas",         icon: DocumentDuplicateIcon,   roles: ["SUPERADMIN", "DEPT_ADMIN"] },
  { href: "/admin/recurrentes",    label: "Tickets recurrentes",icon: ArrowPathIcon,           roles: ["SUPERADMIN", "DEPT_ADMIN"] },
  { href: "/admin/reglas",         label: "Reglas de negocio",  icon: BoltIcon,                roles: ["SUPERADMIN"] },
  { href: "/admin/estado",         label: "Estado del sistema", icon: SignalIcon,              roles: ["SUPERADMIN"] },
  { href: "/admin/faq",            label: "Gestión FAQ",        icon: QuestionMarkCircleIcon,  roles: ["SUPERADMIN", "DEPT_ADMIN"] },
  { href: "/admin/widget",         label: "Widget embebible",   icon: CursorArrowRaysIcon,     roles: ["SUPERADMIN"] },
  { href: "/admin/configuracion",  label: "Configuración",      icon: Cog6ToothIcon,           roles: ["SUPERADMIN"] },
];

interface SidebarProps {
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const visible = navItems.filter((item) => !role || item.roles.includes(role));

  return (
    <Tooltip.Provider delayDuration={150} skipDelayDuration={100}>
      <aside
        className={cn(
          "flex h-full flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ease-out dark:border-slate-700",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        {/* Logo + cerrar móvil + toggle colapso */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-slate-200 dark:border-slate-700",
            collapsed ? "justify-center px-2" : "justify-between px-5"
          )}
        >
          {!collapsed && <Logo className="h-8 w-auto" />}
          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="lg:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              aria-label="Cerrar menú"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden lg:inline-flex rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
              >
                {collapsed
                  ? <ChevronDoubleRightIcon className="h-4 w-4" />
                  : <ChevronDoubleLeftIcon className="h-4 w-4" />
                }
              </button>
            )}
          </div>
        </div>

        {/* Navegación */}
        <nav className={cn("flex-1 overflow-y-auto py-4 space-y-0.5", collapsed ? "px-2" : "px-3")}>
          {visible.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            const linkEl = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-colors",
                  collapsed ? "justify-center h-10 w-full" : "gap-3 px-3 py-2.5",
                  active
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                )}
                aria-label={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );

            if (!collapsed) return linkEl;
            return (
              <Tooltip.Root key={item.href}>
                <Tooltip.Trigger asChild>{linkEl}</Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="right"
                    sideOffset={8}
                    className="z-50 rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-token-lg"
                  >
                    {item.label}
                    <Tooltip.Arrow className="fill-slate-900" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            );
          })}
        </nav>

        {/* Perfil */}
        {session?.user && (
          <div
            className={cn(
              "border-t border-slate-200 dark:border-slate-700",
              collapsed ? "px-2 py-3" : "px-4 py-3"
            )}
          >
            {collapsed ? (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex h-10 w-full items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-500 transition-colors"
                    aria-label="Cerrar sesión"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="right"
                    sideOffset={8}
                    className="z-50 rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-token-lg"
                  >
                    Cerrar sesión
                    <Tooltip.Arrow className="fill-slate-900" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-900 truncate">{session.user.name}</p>
                <p className="text-xs text-slate-500 truncate">
                  {getDeptLabel(session.user.department)} · {ROLE_LABELS[session.user.role]}
                </p>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="mt-2 flex items-center gap-2 text-xs text-slate-400 hover:text-red-500 transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </>
            )}
          </div>
        )}
      </aside>
    </Tooltip.Provider>
  );
}
