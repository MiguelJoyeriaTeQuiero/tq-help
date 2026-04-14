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

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-10 flex items-center border-t border-slate-200 bg-white">
      {visible.map((tab, i) => {
        const active = pathname.startsWith(tab.href) &&
          (tab.href !== "/admin" || pathname === "/admin" || pathname.startsWith("/admin/"));
        const Icon = active ? tab.ActiveIcon : tab.Icon;

        // Insertar botón + en el centro si toca
        const isMiddle = i === Math.floor(visible.length / 2);

        return (
          <div key={tab.href} className="flex flex-1">
            {isMiddle && showCreate && (
              <Link
                href={createHref}
                className="flex flex-1 flex-col items-center justify-center py-2 gap-0.5 text-white"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 shadow-lg -mt-5 border-4 border-white">
                  <PlusCircleIcon className="h-6 w-6" />
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5">Nuevo</span>
              </Link>
            )}
            <Link
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center py-2 gap-0.5 transition-colors",
                active ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
