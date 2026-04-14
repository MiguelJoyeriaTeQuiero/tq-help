"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppLayout } from "@/components/layout/app-layout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDepartments } from "@/hooks/use-departments";
import { MultiSelect } from "@/components/ui/multi-select";

const PRIORITY_OPTIONS = [
  { value: "BAJA", label: "Baja — 5 días laborables" },
  { value: "MEDIA", label: "Media — 3 días laborables" },
  { value: "ALTA", label: "Alta — 1 día laborable" },
  { value: "CRITICA", label: "Crítica — 4 horas" },
];

export default function NuevoTicketPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { departments } = useDepartments();
  const deptOptions = departments.map((d) => ({ value: d.key, label: d.label }));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIA");
  const [targetDept, setTargetDept] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (title.trim().length < 5) errs.title = "El título debe tener al menos 5 caracteres";
    if (description.trim().length < 10) errs.description = "La descripción debe tener al menos 10 caracteres";
    if (targetDept.length === 0) errs.targetDept = "Selecciona al menos un departamento destino";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, priority, targetDept }),
    });

    if (!res.ok) {
      setLoading(false);
      const d = await res.json();
      setErrors({ general: d.error?.formErrors?.[0] ?? "Error al crear la incidencia" });
      return;
    }

    const ticket = await res.json();

    // Guardar adjuntos si hay
    if (attachments.length > 0) {
      await Promise.all(
        attachments.map((a) =>
          fetch(`/api/tickets/${ticket.id}/attachments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: a.filename,
              storageKey: a.storageKey,
              mimeType: a.mimeType,
              size: a.size,
            }),
          })
        )
      );
    }

    router.push(`/tickets/${ticket.id}`);
  };

  return (
    <AppLayout title="Nueva incidencia">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Crear nueva incidencia</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Título *"
                placeholder="Describe el problema brevemente"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={errors.title}
              />
              <Textarea
                label="Descripción *"
                placeholder="Explica el problema con detalle: qué ocurre, cuándo, cómo reproducirlo..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                error={errors.description}
                className="min-h-[150px]"
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Prioridad *"
                  options={PRIORITY_OPTIONS}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                />
                <MultiSelect
                  label="Departamento(s) destino *"
                  options={deptOptions}
                  value={targetDept}
                  onChange={setTargetDept}
                  placeholder="Seleccionar departamentos..."
                  error={errors.targetDept}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Adjuntos (opcional)</p>
                <FileUpload onUpload={setAttachments} />
              </div>
              {errors.general && (
                <p className="text-sm text-red-600">{errors.general}</p>
              )}
              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={loading}>
                  Crear incidencia
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
