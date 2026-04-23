import { cn } from "@/lib/utils";

interface SectionDividerProps {
  label?: string;
  className?: string;
}

export function SectionDivider({ label, className }: SectionDividerProps) {
  return (
    <div
      role="separator"
      aria-label={label}
      className={cn("flex items-center gap-3 my-6 text-slate-400 dark:text-slate-500", className)}
    >
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-slate-200 dark:via-slate-700 dark:to-slate-700" />
      {label ? (
        <span className="text-[11px] font-medium uppercase tracking-[0.14em]">{label}</span>
      ) : (
        <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
      )}
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-200 to-slate-200 dark:via-slate-700 dark:to-slate-700" />
    </div>
  );
}
