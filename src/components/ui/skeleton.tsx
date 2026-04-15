import { cn } from "@/lib/utils";

/** Bloque individual con efecto shimmer */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-slate-200 dark:bg-slate-700",
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
        "rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3",
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
