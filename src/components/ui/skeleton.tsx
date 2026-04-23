import { cn } from "@/lib/utils";

/** Bloque individual con efecto shimmer */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-token-sm bg-slate-200 dark:bg-slate-700",
        className
      )}
    >
      {/* Shimmer sweep */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent" />
    </div>
  );
}

/** Línea de texto skeleton */
export function SkeletonText({ className }: { className?: string }) {
  return <Skeleton className={cn("h-4 rounded", className)} />;
}

/** Card skeleton genérico: título + N líneas */
export function SkeletonCard({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-token-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-3 shadow-token-xs",
        className
      )}
    >
      <Skeleton className="h-5 w-36" />
      <div className="space-y-2 pt-1">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-4", i === lines - 1 ? "w-3/5" : "w-full")}
          />
        ))}
      </div>
    </div>
  );
}

/** Fila skeleton para listas (ticket, petición, pedido). Imita: icono + título + meta + badge. */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-token-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3",
        className
      )}
    >
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  );
}

/** Lista vertical de SkeletonRow — pensado para feeds/listados. */
export function SkeletonList({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

/** Stat card skeleton — ideal para dashboards con KPIs. */
export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-token-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-3 shadow-token-xs",
        className
      )}
    >
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

/** Grid de SkeletonStat — para bloques KPI del dashboard. */
export function SkeletonStats({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStat key={i} />
      ))}
    </div>
  );
}

/** Tabla skeleton con cabecera + filas. Respeta la estructura de columnas indicada. */
export function SkeletonTable({
  rows = 6,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-token-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-token-xs",
        className
      )}
    >
      {/* Header */}
      <div
        className="grid gap-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 px-4 py-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-2/3" />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid gap-4 px-4 py-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn("h-4", c === 0 ? "w-full" : c === columns - 1 ? "w-12 rounded-full" : "w-3/4")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
