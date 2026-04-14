"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  TicketIcon,
  LightBulbIcon,
  MapIcon,
  ChartBarIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import {
  TicketIcon as TicketSolid,
  LightBulbIcon as LightBulbSolid,
  MapIcon as MapSolid,
  ChartBarIcon as ChartBarSolid,
} from "@heroicons/react/24/solid";

const tabs = [
  { href: "/tickets",    label: "Incidencias", Icon: TicketIcon,    ActiveIcon: TicketSolid,    roles: ["SUPERADMIN","DEPT_ADMIN","EMPLOYEE","VIEWER"] },
  { href: "/peticiones", label: "Peticiones",  Icon: LightBulbIcon, ActiveIcon: LightBulbSolid, roles: ["SUPERADMIN","DEPT_ADMIN","EMPLOYEE","VIEWER"] },
  { href: "/roadmap",    label: "Roadmap",     Icon: MapIcon,       ActiveIcon: MapSolid,       roles: ["SUPERADMIN","DEPT_ADMIN","EMPLOYEE","VIEWER"] },
  { href: "/admin",      label: "Admin",       Icon: ChartBarIcon,  ActiveIcon: ChartBarSolid,  roles: ["SUPERADMIN","DEPT_ADMIN","VIEWER"] },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const visible = tabs.filter((t) => !role || t.roles.includes(role));

  // Detectar si estamos en una página donde tiene sentido el botón de crear
  const showCreate =
    role !== "VIEWER" &&
    (pathname.startsWith("/tickets") || pathname.startsWith("/peticiones"));

  const createHref = pathname.startsWith("/peticiones")
    ? "/peticiones/nueva"
    : "/tickets/nuevo";

  // Construir lista de items: tabs + botón crear en el centro si aplica
  const middleIndex = Math.floor(visible.length / 2);
  const items = visible.map((tab, i) => ({ type: "tab" as const, tab, insertCreate: showCreate && i === middleIndex }));

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-10 flex items-end border-t border-slate-200 bg-white pb-safe">
      {items.map(({ tab, insertCreate }, i) => {
        const active = pathname.startsWith(tab.href) &&
          (tab.href !== "/admin" || pathname === "/admin" || pathname.startsWith("/admin/"));
        const Icon = active ? tab.ActiveIcon : tab.Icon;

        return (
          <>
            {insertCreate && (
              <Link
                key="create"
                href={createHref}
                className="flex flex-1 flex-col items-center justify-center pb-2 pt-1 gap-0.5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 shadow-lg -mt-6 border-4 border-white">
                  <PlusCircleIcon className="h-6 w-6 text-white" />
                </div>
                <span className="text-[10px] text-slate-500">Nuevo</span>
              </Link>
            )}
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center py-2 gap-0.5 transition-colors",
                active ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          </>
        );
      })}
    </nav>
  );
}
