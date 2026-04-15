"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { CheckIcon, XMarkIcon, ClockIcon } from "@heroicons/react/24/outline";

interface ApprovalBannerProps {
  ticketId: string;
  approvalStatus: string;
  approval?: {
    status: string;
    comment?: string | null;
    approver?: { name: string } | null;
    reviewedAt?: string | null;
  } | null;
  onUpdated: () => void;
}

export function ApprovalBanner({ ticketId, approvalStatus, approval, onUpdated }: ApprovalBannerProps) {
  const { data: session } = useSession();
  const canReview = session?.user?.role === "SUPERADMIN" || session?.user?.role === "DEPT_ADMIN";

  const [rejecting, setRejecting] = useState(false);
  const [rejectionComment, setRejectionComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDecision = async (status: "APROBADO" | "RECHAZADO", comment?: string) => {
    setLoading(true);
    await fetch(`/api/tickets/${ticketId}/approval`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, comment }),
    });
    setLoading(false);
    setRejecting(false);
    onUpdated();
  };

  if (approvalStatus === "PENDIENTE") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <ClockIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">Pendiente de aprobación</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Esta incidencia requiere validación antes de ser procesada.
            </p>

            {canReview && !rejecting && (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  loading={loading}
                  onClick={() => handleDecision("APROBADO")}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckIcon className="h-3.5 w-3.5 mr-1" />
                  Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejecting(true)}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <XMarkIcon className="h-3.5 w-3.5 mr-1" />
                  Rechazar
                </Button>
              </div>
            )}

            {canReview && rejecting && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={rejectionComment}
                  onChange={(e) => setRejectionComment(e.target.value)}
                  placeholder="Motivo del rechazo (opcional)"
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    loading={loading}
                    onClick={() => handleDecision("RECHAZADO", rejectionComment)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Confirmar rechazo
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRejecting(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (approvalStatus === "APROBADO") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-3 flex items-center gap-2">
        <CheckIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
        <p className="text-sm text-green-800">
          Aprobado por <strong>{approval?.approver?.name ?? "un admin"}</strong>
          {approval?.comment && <span className="text-green-700"> · {approval.comment}</span>}
        </p>
      </div>
    );
  }

  if (approvalStatus === "RECHAZADO") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex items-center gap-2">
        <XMarkIcon className="h-4 w-4 text-red-600 flex-shrink-0" />
        <p className="text-sm text-red-800">
          Rechazado por <strong>{approval?.approver?.name ?? "un admin"}</strong>
          {approval?.comment && <span className="text-red-700"> · {approval.comment}</span>}
        </p>
      </div>
    );
  }

  return null;
}
