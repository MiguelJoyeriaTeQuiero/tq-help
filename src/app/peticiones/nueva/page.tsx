"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/ui/file-upload";
import { useDepartments } from "@/hooks/use-departments";

export default function NuevaPeticionPage() {
  const router = useRouter();
  const { departments } = useDepartments();
  const deptOptions = departments.map((d) => ({ value: d.key, label: d.label }));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDept, setTargetDept] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (title.trim().length < 5) errs.title = "Mínimo 5 caracteres";
    if (description.trim().length < 10) errs.description = "Mínimo 10 caracteres";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    const res = await fetch("/api/features", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, targetDept }),
    });

    if (!res.ok) { setLoading(false); return; }
    const f = await res.json();
    router.push(`/peticiones/${f.id}`);
  };

  return (
    <AppLayout title="Nueva petición">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Solicitar nueva funcionalidad</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Título *"
                placeholder="¿Qué funcionalidad necesitas?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={errors.title}
              />
              <Textarea
                label="Descripción *"
                placeholder="Explica qué necesitas, para qué y qué problema resuelve..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                error={errors.description}
                className="min-h-[150px]"
              />
              <Select
                label="Departamento responsable *"
                options={deptOptions}
                value={targetDept}
                onChange={(e) => setTargetDept(e.target.value)}
              />
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Adjuntos (opcional)</p>
                <FileUpload onUpload={setAttachments} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={loading}>Crear petición</Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
