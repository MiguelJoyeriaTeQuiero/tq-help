import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "success" | "warning" | "info" | "danger" | "neutral";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  /** Muestra un punto de color a la izquierda (look moderno para estados neutros) */
  dot?: boolean;
}

const variantClasses: Record<Variant, string> = {
  default:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  outline:
    "border border-current bg-transparent",
  success:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  info:
    "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  danger:
    "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  neutral:
    "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200",
};

const dotClasses: Record<Variant, string> = {
  default: "bg-indigo-500",
  outline: "bg-current",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  info: "bg-sky-500",
  danger: "bg-red-500",
  neutral: "bg-slate-400",
};

export function Badge({ className, variant = "default", dot, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden
          className={cn("h-1.5 w-1.5 rounded-full", dotClasses[variant])}
        />
      )}
      {children}
    </span>
  );
}
