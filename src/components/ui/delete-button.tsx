"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { TrashIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

interface DeleteButtonProps {
  /** Endpoint DELETE, p.ej. `/api/tickets/abc123` */
  endpoint: string;
  /** Texto descriptivo del elemento, p.ej. `esta incidencia`. Se usa en el diálogo. */
  resourceLabel?: string;
  /** Título del diálogo de confirmación. */
  confirmTitle?: string;
  /** Si se indica, navega aquí tras borrar (p.ej. páginas de detalle). */
  redirectTo?: string;
  /** Alternativa a redirectTo: refrescar en sitio (p.ej. listas, comentarios). */
  onDeleted?: () => void;
  /** Mensaje de éxito del toast. */
  successMessage?: string;
  /** Texto del botón. Si se omite, solo se muestra el icono de papelera. */
  label?: string;
  size?: "sm" | "md" | "lg";
  /** Clases extra para el botón disparador. */
  className?: string;
}

/**
 * Botón de borrado reutilizable, visible SOLO para admins (DEPT_ADMIN y SUPERADMIN).
 * Abre un diálogo de confirmación y avisa de que la acción es irreversible.
 */
export function DeleteButton({
  endpoint,
  resourceLabel = "este elemento",
  confirmTitle = "Confirmar eliminación",
  redirectTo,
  onDeleted,
  successMessage = "Eliminado correctamente",
  label,
  size = "sm",
  className,
}: DeleteButtonProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const role = session?.user?.role;
  const canDelete = role === "SUPERADMIN" || role === "DEPT_ADMIN";
  if (!canDelete) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error ? String(data.error) : "No se pudo eliminar");
        setLoading(false);
        return;
      }
      toast.success(successMessage);
      setOpen(false);
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
      } else {
        onDeleted?.();
      }
    } catch {
      toast.error("No se pudo eliminar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="danger"
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        title="Eliminar"
        aria-label="Eliminar"
      >
        <TrashIcon className={label ? "h-4 w-4 mr-1.5" : "h-4 w-4"} />
        {label}
      </Button>

      <Modal open={open} onClose={() => !loading && setOpen(false)} title={confirmTitle}>
        <div className="space-y-4">
          <div className="flex gap-3 rounded-token-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
            <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
            <div className="text-sm text-red-900 dark:text-red-200">
              <p className="font-semibold mb-1">Esta acción es irreversible</p>
              <p>
                Vas a eliminar {resourceLabel} de forma permanente. No se podrá recuperar.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="md" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="danger" size="md" onClick={handleDelete} loading={loading}>
              <TrashIcon className="h-4 w-4 mr-1.5" />
              Eliminar definitivamente
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
