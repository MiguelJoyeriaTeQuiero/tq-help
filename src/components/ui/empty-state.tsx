import { cn } from "@/lib/utils";

type EmptyKind = "inbox" | "search" | "chart" | "folder" | "bell" | "sparkles";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: EmptyKind;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

/**
 * Empty state ilustrado. SVG lineal monocromo heredando currentColor
 * para respetar paleta sin forzar colores. Usar `color-slate-300` por defecto.
 */
export function EmptyState({
  title,
  description,
  icon = "inbox",
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8" : "py-14",
        className
      )}
    >
      <div className="text-slate-300 dark:text-slate-600">
        <EmptyIllustration kind={icon} />
      </div>
      <h3 className="mt-5 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function EmptyIllustration({ kind }: { kind: EmptyKind }) {
  const base = "h-20 w-20";
  switch (kind) {
    case "search":
      return (
        <svg className={base} viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <circle cx="34" cy="34" r="18" />
          <path d="M48 48l14 14" strokeLinecap="round" />
          <path d="M26 34h16M34 26v16" strokeLinecap="round" opacity="0.35" />
        </svg>
      );
    case "chart":
      return (
        <svg className={base} viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M12 62h56" strokeLinecap="round" />
          <path d="M12 14v48" strokeLinecap="round" />
          <rect x="22" y="42" width="8" height="20" rx="1.5" />
          <rect x="36" y="30" width="8" height="32" rx="1.5" />
          <rect x="50" y="22" width="8" height="40" rx="1.5" opacity="0.55" />
        </svg>
      );
    case "folder":
      return (
        <svg className={base} viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M10 22c0-2.2 1.8-4 4-4h18l6 6h28c2.2 0 4 1.8 4 4v32c0 2.2-1.8 4-4 4H14c-2.2 0-4-1.8-4-4V22z" />
          <path d="M10 32h60" opacity="0.4" />
        </svg>
      );
    case "bell":
      return (
        <svg className={base} viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M24 52V38a16 16 0 0 1 32 0v14l4 6H20l4-6z" strokeLinejoin="round" />
          <path d="M34 62a6 6 0 0 0 12 0" />
          <circle cx="40" cy="16" r="2" fill="currentColor" />
        </svg>
      );
    case "sparkles":
      return (
        <svg className={base} viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M40 18v12M40 50v12M24 40h12M44 40h12" strokeLinecap="round" />
          <path d="M28 28l6 6M46 46l6 6M52 28l-6 6M34 46l-6 6" strokeLinecap="round" opacity="0.5" />
          <circle cx="40" cy="40" r="5" />
        </svg>
      );
    case "inbox":
    default:
      return (
        <svg className={base} viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M14 18h52v34H52l-4 6H32l-4-6H14V18z" strokeLinejoin="round" />
          <path d="M14 40h14M52 40h14" strokeLinecap="round" opacity="0.5" />
          <path d="M22 28h36" strokeLinecap="round" opacity="0.35" />
        </svg>
      );
  }
}
