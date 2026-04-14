"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureStatusBadge } from "@/components/features/feature-status-badge";
import { Badge } from "@/components/ui/badge";
import { getDeptLabel } from "@/lib/utils";
import { HandThumbUpIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

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
        <div className="text-center py-12 text-slate-400">Cargando...</div>
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
                        <span className="text-xs text-slate-400">{getDeptLabel(f.targetDept)}</span>
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
