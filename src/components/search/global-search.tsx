"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface SearchResult {
  type: "ticket" | "feature" | "faq" | "user";
  id: string;
  title: string;
  subtitle?: string;
  url: string;
}

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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 300);
  };

  const navigate = (result: SearchResult) => {
    router.push(result.url);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((p) => Math.min(p + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelected((p) => Math.max(p - 1, 0)); }
    if (e.key === "Enter" && results[selected]) navigate(results[selected]);
  };

  // Group results by type
  const grouped: Record<string, SearchResult[]> = {};
  for (const r of results) {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  }
  const allResults = results; // flat for keyboard nav

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 transition-colors"
        aria-label="Buscar"
      >
        <MagnifyingGlassIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] font-medium text-slate-400">
          <span>⌘</span><span>K</span>
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[10vh]" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <MagnifyingGlassIcon className="h-5 w-5 flex-shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Buscar incidencias, peticiones, FAQ..."
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
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

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {query.trim().length < 2 && (
            <p className="px-4 py-6 text-center text-sm text-slate-400">Escribe al menos 2 caracteres para buscar</p>
          )}

          {query.trim().length >= 2 && !loading && results.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-400">Sin resultados para "{query}"</p>
          )}

          {results.length > 0 && (
            <div className="py-2">
              {Object.entries(grouped).map(([type, items]) => (
                <div key={type}>
                  <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    {TYPE_LABELS[type] ?? type}
                  </p>
                  {items.map((result) => {
                    const idx = allResults.indexOf(result);
                    return (
                      <button
                        key={result.id}
                        onClick={() => navigate(result)}
                        onMouseEnter={() => setSelected(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          selected === idx ? "bg-indigo-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_COLORS[type]}`}>
                          {TYPE_LABELS[type]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                          )}
                        </div>
                        {selected === idx && (
                          <kbd className="flex-shrink-0 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400">↵</kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-slate-100 px-4 py-2 flex items-center gap-3 text-[10px] text-slate-400">
          <span><kbd className="rounded border border-slate-200 px-1">↑↓</kbd> navegar</span>
          <span><kbd className="rounded border border-slate-200 px-1">↵</kbd> abrir</span>
          <span><kbd className="rounded border border-slate-200 px-1">Esc</kbd> cerrar</span>
        </div>
      </div>
    </div>
  );
}
