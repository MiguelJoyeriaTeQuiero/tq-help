"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDownIcon, XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label?: string;
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  error,
  disabled,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(v: string) {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      onChange([...value, v]);
    }
  }

  function remove(v: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(value.filter((x) => x !== v));
  }

  const selectedLabels = value.map(
    (v) => options.find((o) => o.value === v)?.label ?? v
  );

  return (
    <div className="relative flex flex-col gap-1" ref={ref}>
      {label && (
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500",
          "dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100",
          error
            ? "border-red-500 focus:ring-red-500"
            : "border-slate-300 dark:border-slate-700",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        {value.length === 0 ? (
          <span className="text-slate-400">{placeholder}</span>
        ) : (
          selectedLabels.map((lbl, i) => (
            <span
              key={value[i]}
              className="flex items-center gap-1 rounded-md bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300"
            >
              {lbl}
              <button
                type="button"
                onClick={(e) => remove(value[i], e)}
                className="rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 p-0.5 transition-colors"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
        <ChevronDownIcon
          className={cn(
            "ml-auto h-4 w-4 flex-shrink-0 text-slate-400 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg max-h-56 overflow-y-auto">
          <div className="p-1">
            {options.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-400">Sin opciones</p>
            ) : (
              options.map((opt) => {
                const selected = value.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      selected
                        ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border",
                        selected
                          ? "border-indigo-500 bg-indigo-500"
                          : "border-slate-300 dark:border-slate-600"
                      )}
                    >
                      {selected && <CheckIcon className="h-3 w-3 text-white" />}
                    </span>
                    {opt.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
