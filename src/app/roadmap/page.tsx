"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureStatusBadge } from "@/components/features/feature-status-badge";
import { Badge } from "@/components/ui/badge";
import { getDeptLabel } from "@/lib/utils";
import { HandThumbUpIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

const COLUMNS = [
  { status: "PENDIENTE", label: "Pendiente", color: "border-yellow-400" },
  { status: "EN_REVISION", label: "En revisión", color: "border-purple-400" },
  { status: "EN_DESARROLLO", label: "En desarrollo", color: "border-blue-400" },
  { status: "COMPLETADO", label: "Completado", color: "border-green-400" },
];

export default function RoadmapPage() {
  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/features?limit=100")
      .then((r) => r.json())
      .then((d) => { setFeatures(d.features ?? []); setLoading(false); });
  }, []);

  const byStatus = (status: string) =>
    features.filter((f) => f.status === status).sort((a, b) => b.voteCount - a.voteCount);

  return (
    <AppLayout title="Roadmap">
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-xl border-t-4 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <Skeleton className="h-5 w-28" />
              {[1,2,3].map(j => (
                <div key={j} className="rounded-lg border border-slate-100 dark:border-slate-700 p-3 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-2 pt-1">
                    <Skeleton className="h-3 w-12 rounded-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.status}>
              <div className={`mb-3 flex items-center gap-2 border-l-4 pl-2 ${col.color}`}>
                <h2 className="font-semibold text-slate-700">{col.label}</h2>
                <span className="text-sm text-slate-400">({byStatus(col.status).length})</span>
              </div>
              <div className="space-y-2">
                {byStatus(col.status).map((f) => (
                  <Link key={f.id} href={`/peticiones/${f.id}`}>
                    <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer">
                      <p className="text-sm font-medium text-slate-900 line-clamp-2">{f.title}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-400">{f.targetDept.map((k: string) => getDeptLabel(k)).join(", ")}</span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <HandThumbUpIcon className="h-3 w-3" />{f.voteCount}
                        </span>
                      </div>
                    </Card>
                  </Link>
                ))}
                {byStatus(col.status).length === 0 && (
                  <p className="text-sm text-slate-300 py-4 text-center">Sin elementos</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
