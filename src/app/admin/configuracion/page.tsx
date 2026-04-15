"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { TICKET_PRIORITY_LABELS } from "@/lib/utils";
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon, BuildingOfficeIcon } from "@heroicons/react/24/outline";

// ── Helpers ────────────────────────────────────────────────────────────────

function minutesToLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} horas`;
  return `${Math.round(minutes / 1440)} días`;
}

function labelToMinutes(value: string, unit: string): number {
  const n = parseInt(value);
  if (unit === "min") return n;
  if (unit === "horas") return n * 60;
  return n * 1440;
}

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#6366f1", "#8b5cf6", "#ec4899",
  "#64748b", "#0ea5e9",
];

const PRIORITIES: Array<{ key: string; label: string; defaultMinutes: number }> = [
  { key: "CRITICA", label: "Crítica",  defaultMinutes: 240  },
  { key: "ALTA",    label: "Alta",     defaultMinutes: 480  },
  { key: "MEDIA",   label: "Media",    defaultMinutes: 4320 },
  { key: "BAJA",    label: "Baja",     defaultMinutes: 7200 },
];

// ── Componente principal ───────────────────────────────────────────────────

export default function ConfiguracionPage() {
  const { data: session } = useSession();

  if (session?.user?.role !== "SUPERADMIN") {
    return (
      <AppLayout title="Configuración">
        <div className="text-center py-20 text-slate-400">Acceso solo para superadmin</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Configuración">
      <div className="max-w-5xl mx-auto space-y-6">
        <DepartmentsSection />
        <TagsSection />
        <SlaSection />
      </div>
    </AppLayout>
  );
}

// ── Sección de Etiquetas ───────────────────────────────────────────────────

function TagsSection() {
  const [tags, setTags] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTag, setEditTag] = useState<any>(null);   // null = crear nuevo
  const [form, setForm] = useState({ name: "", color: "#6366f1" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = () =>
    fetch("/api/tags").then((r) => r.json()).then((d) => setTags(Array.isArray(d) ? d : []));

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditTag(null);
    setForm({ name: "", color: "#6366f1" });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (tag: any) => {
    setEditTag(tag);
    setForm({ name: tag.name, color: tag.color });
    setError("");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true);
    setError("");

    const url = editTag ? `/api/tags/${editTag.id}` : "/api/tags";
    const method = editTag ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Error al guardar");
      return;
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
    await fetch(`/api/tags/${id}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Etiquetas</CardTitle>
            <p className="text-sm text-slate-500 mt-0.5">
              Organiza tickets y peticiones con etiquetas de color
            </p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <PlusIcon className="mr-1 h-4 w-4" /> Nueva etiqueta
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tags.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            No hay etiquetas. Crea la primera.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="group flex items-center gap-1.5 rounded-full border border-slate-200 bg-white pl-2 pr-1 py-1"
              >
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-sm font-medium text-slate-700">{tag.name}</span>
                <div className="flex items-center gap-0.5 ml-1">
                  <button
                    onClick={() => openEdit(tag)}
                    className="rounded-full p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  >
                    <PencilIcon className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(tag.id)}
                    disabled={deleteId === tag.id}
                    className="rounded-full p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTag ? "Editar etiqueta" : "Nueva etiqueta"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nombre"
            placeholder="ej: bug, urgente, facturación..."
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={error}
          />

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Color</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: form.color === c ? "#1e293b" : "transparent",
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-8 w-8 rounded cursor-pointer border border-slate-300"
              />
              <span className="text-sm text-slate-500">o elige un color personalizado</span>
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-sm text-slate-500">Vista previa:</span>
            <Badge className="text-white text-xs" style={{ backgroundColor: form.color }}>
              {form.name || "etiqueta"}
            </Badge>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" loading={saving}>
              <CheckIcon className="mr-1 h-4 w-4" />
              {editTag ? "Guardar cambios" : "Crear etiqueta"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              <XMarkIcon className="mr-1 h-4 w-4" />Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}

// ── Sección de SLA ─────────────────────────────────────────────────────────

function SlaSection() {
  const [policies, setPolicies] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<Record<string, { value: string; unit: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = () =>
    fetch("/api/sla")
      .then((r) => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;
        const map: Record<string, number> = {};
        data.forEach((p) => { map[p.priority] = p.resolutionMinutes; });
        // Rellenar defaults si faltan
        PRIORITIES.forEach((p) => {
          if (!map[p.key]) map[p.key] = p.defaultMinutes;
        });
        setPolicies(map);

        const edMap: Record<string, { value: string; unit: string }> = {};
        PRIORITIES.forEach((p) => {
          const min = map[p.key] ?? p.defaultMinutes;
          if (min < 60) edMap[p.key] = { value: String(min), unit: "min" };
          else if (min < 1440) edMap[p.key] = { value: String(min / 60), unit: "horas" };
          else edMap[p.key] = { value: String(min / 1440), unit: "días" };
        });
        setEditing(edMap);
      });

  useEffect(() => { load(); }, []);

  const handleSave = async (priorityKey: string) => {
    const ed = editing[priorityKey];
    if (!ed) return;
    const minutes = labelToMinutes(ed.value, ed.unit);
    if (isNaN(minutes) || minutes < 1) return;

    setSaving(priorityKey);
    await fetch("/api/sla", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority: priorityKey, resolutionMinutes: minutes }),
    });
    setSaving(null);
    setSaved(priorityKey);
    setTimeout(() => setSaved(null), 2000);
    load();
  };

  const PRIORITY_COLORS: Record<string, string> = {
    CRITICA: "bg-red-100 text-red-700 border-red-200",
    ALTA:    "bg-orange-100 text-orange-700 border-orange-200",
    MEDIA:   "bg-blue-100 text-blue-700 border-blue-200",
    BAJA:    "bg-slate-100 text-slate-600 border-slate-200",
  };

  const UNIT_OPTIONS = ["min", "horas", "días"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Políticas de SLA</CardTitle>
        <p className="text-sm text-slate-500 mt-0.5">
          Tiempo máximo de resolución por prioridad. Al crear un ticket se calcula automáticamente la fecha límite.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {PRIORITIES.map((p) => (
            <div key={p.key} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2 sm:w-32">
                <Badge className={`border ${PRIORITY_COLORS[p.key]}`}>{p.label}</Badge>
              </div>

              <div className="flex flex-1 items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={editing[p.key]?.value ?? ""}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev,
                      [p.key]: { ...prev[p.key], value: e.target.value },
                    }))
                  }
                  className="w-20 h-9 rounded-lg border border-slate-300 px-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={editing[p.key]?.unit ?? "horas"}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev,
                      [p.key]: { ...prev[p.key], unit: e.target.value },
                    }))
                  }
                  className="h-9 rounded-lg border border-slate-300 px-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>

                <span className="text-xs text-slate-400">
                  = {minutesToLabel(labelToMinutes(editing[p.key]?.value ?? "0", editing[p.key]?.unit ?? "horas"))}
                </span>
              </div>

              <Button
                size="sm"
                variant={saved === p.key ? "secondary" : "outline"}
                onClick={() => handleSave(p.key)}
                loading={saving === p.key}
                className="sm:w-24"
              >
                {saved === p.key ? (
                  <><CheckIcon className="mr-1 h-3.5 w-3.5 text-green-600" />Guardado</>
                ) : "Guardar"}
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3">
          * Los cambios de SLA se aplican a los nuevos tickets. Los existentes mantienen su fecha límite original.
        </p>
      </CardContent>
    </Card>
  );
}

// ── Sección de Departamentos ───────────────────────────────────────────────

interface Dept {
  id: string;
  key: string;
  label: string;
  active: boolean;
  order: number;
}

function DepartmentsSection() {
  const [depts, setDepts] = useState<Dept[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editDept, setEditDept] = useState<Dept | null>(null);
  const [form, setForm] = useState({ key: "", label: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = () =>
    fetch("/api/departments?all=1")
      .then((r) => r.json())
      .then((d) => setDepts(Array.isArray(d) ? d : []));

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditDept(null);
    setForm({ key: "", label: "" });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (dept: Dept) => {
    setEditDept(dept);
    setForm({ key: dept.key, label: dept.label });
    setError("");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim()) { setError("El nombre es obligatorio"); return; }
    if (!editDept && !form.key.trim()) { setError("La clave es obligatoria"); return; }
    setSaving(true);
    setError("");

    const url = editDept ? `/api/departments/${editDept.id}` : "/api/departments";
    const method = editDept ? "PATCH" : "POST";
    const body = editDept ? { label: form.label } : { key: form.key.toUpperCase().replace(/\s+/g, "_"), label: form.label };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Error al guardar");
      return;
    }
    setModalOpen(false);
    load();
  };

  const handleToggle = async (dept: Dept) => {
    setTogglingId(dept.id);
    await fetch(`/api/departments/${dept.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !dept.active }),
    });
    setTogglingId(null);
    load();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BuildingOfficeIcon className="h-5 w-5 text-indigo-500" />
              Departamentos
            </CardTitle>
            <p className="text-sm text-slate-500 mt-0.5">
              Gestiona los departamentos disponibles en toda la aplicación
            </p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <PlusIcon className="mr-1 h-4 w-4" /> Nuevo departamento
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {depts.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No hay departamentos configurados.</p>
        ) : (
          <div className="space-y-2">
            {depts
              .sort((a, b) => a.order - b.order)
              .map((dept) => (
                <div
                  key={dept.id}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-opacity ${
                    dept.active ? "border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700" : "border-slate-100 bg-slate-50 opacity-50 dark:bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                      <BuildingOfficeIcon className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{dept.label}</p>
                      <p className="text-xs text-slate-400 font-mono">{dept.key}</p>
                    </div>
                    {!dept.active && (
                      <Badge className="bg-slate-100 text-slate-500 text-xs border border-slate-200 ml-1">Inactivo</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(dept)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 transition-colors"
                      title="Editar nombre"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleToggle(dept)}
                      disabled={togglingId === dept.id}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                        dept.active
                          ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          : "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                      }`}
                    >
                      {dept.active ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
        <p className="text-xs text-slate-400 mt-3">
          * Los departamentos inactivos no aparecen en los formularios. Los datos históricos se conservan.
        </p>
      </CardContent>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editDept ? "Editar departamento" : "Nuevo departamento"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {!editDept && (
            <div>
              <Input
                label="Clave interna"
                placeholder="ej: VENTAS, ALMACEN, COMPRAS"
                value={form.key}
                onChange={(e) =>
                  setForm({ ...form, key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })
                }
              />
              <p className="text-xs text-slate-400 mt-1">Solo mayúsculas, números y guiones bajos. No se puede cambiar después.</p>
            </div>
          )}
          <Input
            label="Nombre visible"
            placeholder="ej: Ventas, Almacén, Compras..."
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            error={error}
          />

          <div className="flex gap-3 pt-1">
            <Button type="submit" loading={saving}>
              <CheckIcon className="mr-1 h-4 w-4" />
              {editDept ? "Guardar cambios" : "Crear departamento"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              <XMarkIcon className="mr-1 h-4 w-4" />Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
