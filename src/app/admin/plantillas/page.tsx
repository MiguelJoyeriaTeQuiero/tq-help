"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MultiSelect } from "@/components/ui/multi-select";
import { useDepartments } from "@/hooks/use-departments";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Pagination } from "@/components/ui/pagination";

const PRIORITY_OPTIONS = [
  { value: "BAJA", label: "Baja" },
  { value: "MEDIA", label: "Media" },
  { value: "ALTA", label: "Alta" },
  { value: "CRITICA", label: "Crítica" },
];

const PRIORITY_COLORS: Record<string, string> = {
  BAJA: "bg-slate-100 text-slate-600",
  MEDIA: "bg-blue-100 text-blue-700",
  ALTA: "bg-orange-100 text-orange-700",
  CRITICA: "bg-red-100 text-red-700",
};

const emptyForm = { name: "", description: "", titlePreset: "", bodyPreset: "", priority: "MEDIA", targetDept: [] as string[], isActive: true };

export default function PlantillasPage() {
  const { data: session } = useSession();
  const { departments, getDeptLabel } = useDepartments();
  const deptOptions = departments.map((d) => ({ value: d.key, label: d.label }));

  const [templates, setTemplates] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canManage = session?.user?.role === "SUPERADMIN" || session?.user?.role === "DEPT_ADMIN";

  const load = () => {
    fetch("/api/ticket-templates?all=1")
      .then((r) => r.json())
      .then((d) => { setTemplates(Array.isArray(d) ? d : []); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setOpen(true);
  };

  const openEdit = (t: any) => {
    setEditing(t);
    setForm({
      name: t.name,
      description: t.description ?? "",
      titlePreset: t.titlePreset,
      bodyPreset: t.bodyPreset,
      priority: t.priority,
      targetDept: t.targetDept,
      isActive: t.isActive,
    });
    setError("");
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const method = editing ? "PATCH" : "POST";
    const url = editing ? `/api/ticket-templates/${editing.id}` : "/api/ticket-templates";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error"); return; }
    setOpen(false);
    load();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la plantilla "${name}"?`)) return;
    await fetch(`/api/ticket-templates/${id}`, { method: "DELETE" });
    load();
  };

  const toggleActive = async (t: any) => {
    await fetch(`/api/ticket-templates/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !t.isActive }),
    });
    load();
  };

  if (!canManage) {
    return <AppLayout title="Plantillas"><div className="text-center py-12 text-slate-400">Sin acceso</div></AppLayout>;
  }

  const setF = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <AppLayout title="Plantillas de ticket">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4 mr-1" />Nueva plantilla
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p>No hay plantillas</p>
            <button onClick={openCreate} className="mt-1 text-sm text-indigo-600 hover:underline">Crear la primera →</button>
          </div>
        ) : (
          <Card>
            <div className="divide-y divide-slate-100">
              {templates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((t) => (
                <div key={t.id} className={`flex items-start gap-4 px-4 py-4 ${!t.isActive ? "opacity-50" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">{t.name}</p>
                      <Badge className={PRIORITY_COLORS[t.priority]}>{t.priority}</Badge>
                      {!t.isActive && <Badge className="bg-slate-100 text-slate-500">Inactiva</Badge>}
                    </div>
                    {t.description && <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>}
                    <p className="text-sm text-slate-600 mt-1 truncate">
                      <span className="text-slate-400">Título:</span> {t.titlePreset}
                    </p>
                    {t.targetDept?.length > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {t.targetDept.map((k: string) => getDeptLabel(k)).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" onClick={() => toggleActive(t)}>
                      {t.isActive ? "Desactivar" : "Activar"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                      <PencilIcon className="h-3.5 w-3.5" />
                    </Button>
                    {session?.user?.role === "SUPERADMIN" && (
                      <Button size="sm" variant="danger" onClick={() => handleDelete(t.id, t.name)}>
                        <TrashIcon className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={page} total={templates.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </Card>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar plantilla" : "Nueva plantilla"}>
        <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <Input label="Nombre *" value={form.name} onChange={(e) => setF("name", e.target.value)} required />
          <Input label="Descripción (uso interno)" value={form.description} onChange={(e) => setF("description", e.target.value)} />
          <Input label="Título predefinido *" value={form.titlePreset} onChange={(e) => setF("titlePreset", e.target.value)} required placeholder="Ej: Alta de usuario nuevo — {nombre}" />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cuerpo predefinido *</label>
            <textarea
              value={form.bodyPreset}
              onChange={(e) => setF("bodyPreset", e.target.value)}
              rows={5}
              required
              placeholder="Describe los pasos o información necesaria para esta incidencia..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Prioridad" options={PRIORITY_OPTIONS} value={form.priority} onChange={(e) => setF("priority", e.target.value)} />
            <MultiSelect label="Departamentos destino" options={deptOptions} value={form.targetDept} onChange={(v) => setF("targetDept", v)} placeholder="Seleccionar..." />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="submit" loading={saving}>{editing ? "Guardar" : "Crear plantilla"}</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
