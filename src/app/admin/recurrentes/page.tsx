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
import { FREQUENCY_OPTIONS, FREQUENCY_LABELS } from "@/lib/recurring";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PlusIcon, PencilIcon, TrashIcon, PlayIcon, ClockIcon } from "@heroicons/react/24/outline";
import { Pagination } from "@/components/ui/pagination";

const PRIORITY_OPTIONS = [
  { value: "BAJA", label: "Baja" },
  { value: "MEDIA", label: "Media" },
  { value: "ALTA", label: "Alta" },
  { value: "CRITICA", label: "Crítica" },
];

const emptyForm = {
  name: "",
  titleTemplate: "",
  bodyTemplate: "",
  priority: "MEDIA",
  targetDept: [] as string[],
  frequency: "SEMANAL",
  nextRunAt: new Date().toISOString().split("T")[0],
  assigneeId: "",
  isActive: true,
};

export default function RecurrentesPage() {
  const { data: session } = useSession();
  const { departments, getDeptLabel } = useDepartments();
  const deptOptions = departments.map((d) => ({ value: d.key, label: d.label }));
  const [users, setUsers] = useState<any[]>([]);

  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [triggering, setTriggering] = useState<string | null>(null);

  if (!["SUPERADMIN","DEPT_ADMIN"].includes(session?.user?.role ?? "")) {
    return <AppLayout title="Tickets recurrentes"><div className="text-center py-12 text-slate-400">Sin acceso</div></AppLayout>;
  }

  const load = async () => {
    const [r, u] = await Promise.all([
      fetch("/api/recurring-tickets").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]);
    setItems(Array.isArray(r) ? r : []);
    setUsers(Array.isArray(u) ? u : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setOpen(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      name: item.name,
      titleTemplate: item.titleTemplate,
      bodyTemplate: item.bodyTemplate,
      priority: item.priority,
      targetDept: item.targetDept,
      frequency: item.frequency,
      nextRunAt: item.nextRunAt.split("T")[0],
      assigneeId: item.assigneeId ?? "",
      isActive: item.isActive,
    });
    setError("");
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body = { ...form, nextRunAt: new Date(form.nextRunAt).toISOString(), assigneeId: form.assigneeId || undefined };
    const method = editing ? "PATCH" : "POST";
    const url = editing ? `/api/recurring-tickets/${editing.id}` : "/api/recurring-tickets";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error"); return; }
    setOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este ticket recurrente?")) return;
    await fetch(`/api/recurring-tickets/${id}`, { method: "DELETE" });
    load();
  };

  const handleTrigger = async (id: string) => {
    setTriggering(id);
    const res = await fetch(`/api/recurring-tickets/${id}/trigger`, { method: "POST" });
    setTriggering(null);
    if (res.ok) {
      const d = await res.json();
      alert(`✅ Ticket creado: ${d.ticket?.id}\nPróxima ejecución: ${format(new Date(d.nextRunAt), "dd/MM/yyyy", { locale: es })}`);
      load();
    } else {
      alert("Error al ejecutar");
    }
  };

  const toggleActive = async (item: any) => {
    await fetch(`/api/recurring-tickets/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    load();
  };

  const setF = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <AppLayout title="Tickets recurrentes">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-500">
            Los tickets se crean automáticamente según la frecuencia configurada.
          </p>
          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4 mr-1" />Nuevo
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No hay tickets recurrentes</div>
        ) : (
          <Card>
            <div className="divide-y divide-slate-100">
              {items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((item) => (
                <div key={item.id} className={`flex items-start gap-4 px-4 py-4 ${!item.isActive ? "opacity-50" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <Badge className="bg-indigo-100 text-indigo-700">
                        {FREQUENCY_LABELS[item.frequency as keyof typeof FREQUENCY_LABELS]}
                      </Badge>
                      {!item.isActive && <Badge className="bg-slate-100 text-slate-500">Inactivo</Badge>}
                    </div>
                    <p className="text-sm text-slate-600 truncate mt-0.5">{item.titleTemplate}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-3.5 w-3.5" />
                        Próxima: {format(new Date(item.nextRunAt), "dd/MM/yyyy", { locale: es })}
                      </span>
                      {item.lastRunAt && (
                        <span>Última: {format(new Date(item.lastRunAt), "dd/MM/yyyy", { locale: es })}</span>
                      )}
                      <span>{item._count?.generatedTickets ?? 0} generados</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      loading={triggering === item.id}
                      onClick={() => handleTrigger(item.id)}
                      disabled={!item.isActive}
                    >
                      <PlayIcon className="h-3.5 w-3.5 mr-1" />
                      Ejecutar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(item)}>
                      {item.isActive ? "Pausar" : "Activar"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                      <PencilIcon className="h-3.5 w-3.5" />
                    </Button>
                    {session?.user?.role === "SUPERADMIN" && (
                      <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)}>
                        <TrashIcon className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={page} total={items.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </Card>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar recurrente" : "Nuevo ticket recurrente"}>
        <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <Input label="Nombre *" value={form.name} onChange={(e) => setF("name", e.target.value)} required />
          <Input label="Título del ticket *" value={form.titleTemplate} onChange={(e) => setF("titleTemplate", e.target.value)} required placeholder="Mantenimiento semanal servidores" />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción del ticket *</label>
            <textarea
              value={form.bodyTemplate}
              onChange={(e) => setF("bodyTemplate", e.target.value)}
              rows={4}
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Frecuencia *" options={FREQUENCY_OPTIONS} value={form.frequency} onChange={(e) => setF("frequency", e.target.value)} />
            <Select label="Prioridad" options={PRIORITY_OPTIONS} value={form.priority} onChange={(e) => setF("priority", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MultiSelect label="Departamentos destino *" options={deptOptions} value={form.targetDept} onChange={(v) => setF("targetDept", v)} placeholder="Seleccionar..." />
            <Input label="Primera ejecución *" type="date" value={form.nextRunAt} onChange={(e) => setF("nextRunAt", e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Asignado a (opcional)</label>
            <select
              value={form.assigneeId}
              onChange={(e) => setF("assigneeId", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Sin asignar</option>
              {users.filter((u) => u.isActive).map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="submit" loading={saving}>{editing ? "Guardar" : "Crear"}</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
