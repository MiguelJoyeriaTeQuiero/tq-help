"use client";

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, total, pageSize, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  // Build the array of page numbers to display (max 5, with ellipsis)
  const getPages = (): (number | "...")[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    // Always show first and last page; fill 3 around current
    const pages: (number | "...")[] = [];
    const left = Math.max(2, page - 1);
    const right = Math.min(totalPages - 1, page + 1);

    pages.push(1);
    if (left > 2) pages.push("...");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  const pages = getPages();

  const btnBase =
    "inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1";
  const btnActive = "bg-indigo-600 text-white";
  const btnInactive =
    "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800";
  const btnDisabled = "opacity-40 cursor-not-allowed";

  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
      <p className="text-xs text-slate-500 order-2 sm:order-1">
        Mostrando <span className="font-medium text-slate-700 dark:text-slate-300">{from}–{to}</span> de <span className="font-medium text-slate-700 dark:text-slate-300">{total}</span>
      </p>
      <div className="flex items-center gap-1 order-1 sm:order-2">
      {/* Prev */}
      <button
        className={`${btnBase} ${page === 1 ? btnDisabled + " " + btnInactive : btnInactive}`}
        onClick={() => page > 1 && onChange(page - 1)}
        disabled={page === 1}
        aria-label="Página anterior"
      >
        ‹
      </button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-1 text-slate-400 select-none">
            …
          </span>
        ) : (
          <button
            key={p}
            className={`${btnBase} ${p === page ? btnActive : btnInactive}`}
            onClick={() => onChange(p as number)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        className={`${btnBase} ${page === totalPages ? btnDisabled + " " + btnInactive : btnInactive}`}
        onClick={() => page < totalPages && onChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Página siguiente"
      >
        ›
      </button>
    </div>
    </div>
  );
}
