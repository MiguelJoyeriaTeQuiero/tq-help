"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  TicketIcon,
  LightBulbIcon,
  PlusIcon,
  ChartBarIcon,
  UsersIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  BoltIcon,
  SignalIcon,
  QuestionMarkCircleIcon,
  ComputerDesktopIcon,
  CubeIcon,
  MapIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

interface SearchResult {
  type: "ticket" | "feature" | "faq" | "user";
  id: string;
  title: string;
  subtitle?: string;
  url: string;
}

interface QuickAction {
  id: string;
  label: string;
  subtitle?: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  group: "crear" | "navegar" | "admin";
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: "new-ticket",     label: "Nueva incidencia",        url: "/tickets/nuevo",        icon: PlusIcon,        group: "crear" },
  { id: "new-feature",    label: "Nueva petición",          url: "/peticiones/nueva",     icon: PlusIcon,        group: "crear" },
  { id: "new-asset",      label: "Nuevo activo",            url: "/activos/nuevo",        icon: PlusIcon,        group: "crear", roles: ["SUPERADMIN","DEPT_ADMIN"] },

  { id: "tickets",        label: "Incidencias",             url: "/tickets",              icon: TicketIcon,             group: "navegar" },
  { id: "peticiones",     label: "Peticiones",              url: "/peticiones",           icon: LightBulbIcon,          group: "navegar" },
  { id: "roadmap",        label: "Roadmap",                 url: "/roadmap",              icon: MapIcon,                group: "navegar" },
  { id: "activos",        label: "Activos (ITAM)",          url: "/activos",              icon: ComputerDesktopIcon,    group: "navegar", roles: ["SUPERADMIN","DEPT_ADMIN"] },
  { id: "faq",            label: "FAQ",                     url: "/faq",                  icon: QuestionMarkCircleIcon, group: "navegar" },
  { id: "pedidos",        label: "Pedidos material",        url: "/pedidos-metal",        icon: CubeIcon,               group: "navegar", roles: ["SUPERADMIN","DEPT_ADMIN","EMPLOYEE"] },

  { id: "admin",          label: "Panel admin",             url: "/admin",                icon: ChartBarIcon,           group: "admin",  roles: ["SUPERADMIN","DEPT_ADMIN","VIEWER"] },
  { id: "usuarios",       label: "Gestión de usuarios",     url: "/admin/usuarios",       icon: UsersIcon,              group: "admin",  roles: ["SUPERADMIN"] },
  { id: "plantillas",     label: "Plantillas de ticket",    url: "/admin/plantillas",     icon: DocumentDuplicateIcon,  group: "admin",  roles: ["SUPERADMIN","DEPT_ADMIN"] },
  { id: "recurrentes",    label: "Tickets recurrentes",     url: "/admin/recurrentes",    icon: ArrowPathIcon,          group: "admin",  roles: ["SUPERADMIN","DEPT_ADMIN"] },
  { id: "reglas",         label: "Reglas de negocio",       url: "/admin/reglas",         icon: BoltIcon,               group: "admin",  roles: ["SUPERADMIN"] },
  { id: "estado",         label: "Estado del sistema",      url: "/admin/estado",         icon: SignalIcon,             group: "admin",  roles: ["SUPERADMIN"] },
  { id: "gestion-faq",    label: "Gestión de FAQ",          url: "/admin/faq",            icon: QuestionMarkCircleIcon, group: "admin",  roles: ["SUPERADMIN","DEPT_ADMIN"] },
  { id: "configuracion",  label: "Configuración",           url: "/admin/configuracion",  icon: Cog6ToothIcon,          group: "admin",  roles: ["SUPERADMIN"] },
];

const GROUP_LABELS: Record<string, string> = {
  crear: "Crear",
  navegar: "Navegación",
  admin: "Administración",
};

const TYPE_LABELS: Record<string, string> = {
  ticket: "Incidencia",
  feature: "Petición",
  faq: "FAQ",
  user: "Usuario",
};

const TYPE_COLORS: Record<string, string> = {
  ticket: "bg-indigo-100 text-indigo-700",
  feature: "bg-amber-100 text-amber-700",
  faq: "bg-green-100 text-green-700",
  user: "bg-slate-100 text-slate-700",
};

export function GlobalSearch() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Quick actions filtradas por rol
  const visibleActions = useMemo(() => {
    return QUICK_ACTIONS.filter((a) => !a.roles || !role || a.roles.includes(role));
  }, [role]);

  // Filtrado local de quick actions por la query
  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return visibleActions;
    return visibleActions.filter((a) => a.label.toLowerCase().includes(q));
  }, [visibleActions, query]);

  // Keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((p) => !p);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSelected(0);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
        setSelected(0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setSelected(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 300);
  };

  const navigate = (url: string) => {
    router.push(url);
    setOpen(false);
  };

  // Navegación por teclado: combina quick actions (cuando query < 2) + resultados remotos
  const showRemoteResults = query.trim().length >= 2;
  const flatItems: { kind: "action" | "result"; url: string }[] = showRemoteResults
    ? [
        ...filteredActions.map((a) => ({ kind: "action" as const, url: a.url })),
        ...results.map((r) => ({ kind: "result" as const, url: r.url })),
      ]
    : filteredActions.map((a) => ({ kind: "action" as const, url: a.url }));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((p) => Math.min(p + 1, Math.max(flatItems.length - 1, 0))); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected((p) => Math.max(p - 1, 0)); }
    if (e.key === "Enter" && flatItems[selected]) navigate(flatItems[selected].url);
  };

  // Agrupar quick actions por group
  const actionGroups = useMemo(() => {
    const g: Record<string, QuickAction[]> = {};
    for (const a of filteredActions) {
      if (!g[a.group]) g[a.group] = [];
      g[a.group].push(a);
    }
    return g;
  }, [filteredActions]);

  // Agrupar resultados remotos por type
  const resultGroups = useMemo(() => {
    const g: Record<string, SearchResult[]> = {};
    for (const r of results) {
      if (!g[r.type]) g[r.type] = [];
      g[r.type].push(r);
    }
    return g;
  }, [results]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-token-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 transition-colors dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-800"
        aria-label="Buscar"
      >
        <MagnifyingGlassIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Buscar o ir a…</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] font-medium text-slate-400 dark:border-slate-600 dark:bg-slate-900">
          <span>⌘</span><span>K</span>
        </kbd>
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 backdrop-blur-sm px-4 pt-[10vh]"
        onClick={() => setOpen(false)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <motion.div
          className="w-full max-w-xl rounded-token-xl border border-slate-200 bg-white shadow-token-2xl overflow-hidden dark:border-slate-700 dark:bg-slate-900"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {/* Input */}
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 px-4 py-3">
            <MagnifyingGlassIcon className="h-5 w-5 flex-shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Buscar o saltar a una página…"
              className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
            />
            {loading && (
              <svg className="h-4 w-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            )}
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[60vh] overflow-y-auto py-2">
            {/* Quick actions (siempre visibles, filtradas por query) */}
            {Object.entries(actionGroups).map(([group, items]) => (
              <div key={group}>
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {GROUP_LABELS[group] ?? group}
                </p>
                {items.map((a) => {
                  const idx = flatItems.findIndex((f) => f.kind === "action" && f.url === a.url);
                  const isSelected = selected === idx;
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.id}
                      onClick={() => navigate(a.url)}
                      onMouseEnter={() => setSelected(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-500/15"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-token-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1 text-sm text-slate-800 dark:text-slate-100 truncate">{a.label}</span>
                      {isSelected && (
                        <ArrowRightIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Separador visual entre acciones y resultados remotos */}
            {showRemoteResults && filteredActions.length > 0 && (
              <div className="my-2 h-px bg-slate-100 dark:bg-slate-800" />
            )}

            {/* Resultados remotos */}
            {showRemoteResults && !loading && results.length === 0 && filteredActions.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-400">Sin resultados para &ldquo;{query}&rdquo;</p>
            )}

            {Object.entries(resultGroups).map(([type, items]) => (
              <div key={type}>
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {TYPE_LABELS[type] ?? type}
                </p>
                {items.map((result) => {
                  const idx = flatItems.findIndex((f) => f.kind === "result" && f.url === result.url);
                  const isSelected = selected === idx;
                  return (
                    <button
                      key={result.id}
                      onClick={() => navigate(result.url)}
                      onMouseEnter={() => setSelected(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected ? "bg-indigo-50 dark:bg-indigo-500/15" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_COLORS[type]}`}>
                        {TYPE_LABELS[type]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{result.title}</p>
                        {result.subtitle && (
                          <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                        )}
                      </div>
                      {isSelected && (
                        <kbd className="flex-shrink-0 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400 dark:border-slate-600 dark:bg-slate-800">↵</kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer hint */}
          <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-2 flex items-center gap-3 text-[10px] text-slate-400">
            <span><kbd className="rounded border border-slate-200 dark:border-slate-600 px-1">↑↓</kbd> navegar</span>
            <span><kbd className="rounded border border-slate-200 dark:border-slate-600 px-1">↵</kbd> abrir</span>
            <span><kbd className="rounded border border-slate-200 dark:border-slate-600 px-1">Esc</kbd> cerrar</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
