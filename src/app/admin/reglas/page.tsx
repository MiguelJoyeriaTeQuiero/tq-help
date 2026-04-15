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
import { PlusIcon, PencilIcon, TrashIcon, BoltIcon } from "@heroicons/react/24/outline";

// ─── Config de campos/operadores/acciones ────────────────────────────────────

const FIELD_OPTIONS = [
  { value: "priority",   label: "Prioridad" },
  { value: "originDept", label: "Departamento origen" },
  { value: "targetDept", label: "Departamento destino" },
  { value: "assigneeId", label: "Asignado a" },
];

const OPERATOR_OPTIONS = [
  { value: "equals",       label: "es igual a" },
  { value: "not_equals",   label: "no es igual a" },
  { value: "includes",     label: "contiene" },
  { value: "is_empty",     label: "está vacío" },
  { value: "is_not_empty", label: "no está vacío" },
];

const ACTION_TYPE_OPTIONS = [
  { value: "ASSIGN_TO_USER", label: "Asignar a usuario" },
  { value: "SET_PRIORITY",   label: "Cambiar prioridad" },
  { value: "ADD_TAG",        label: "Añadir etiqueta" },
  { value: "SET_TARGET_DEPT",label: "Cambiar departamento destino" },
];

const EVENT_OPTIONS = [
  { value: "TICKET_CREATED", label: "Al crear ticket" },
  { value: "TICKET_UPDATED", label: "Al actualizar ticket" },
];

const PRIORITY_VALUES = [
  { value: "BAJA", label: "Baja" },
  { value: "MEDIA", label: "Media" },
  { value: "ALTA", label: "Alta" },
  { value: "CRITICA", label: "Crítica" },
];

const emptyCondition = { field: "priority", operator: "equals", value: "" };
const emptyForm = {
  name: "",
  isActive: true,
  event: "TICKET_CREATED",
  conditions: [{ ...emptyCondition }],
  action: { type: "ASSIGN_TO_USER", value: "" },
  order: 0,
};

function conditionLabel(c: any) {
  const field = FIELD_OPTIONS.find((f) => f.value === c.field)?.label ?? c.field;
  const op = OPERATOR_OPTIONS.find((o) => o.value === c.operator)?.label ?? c.operator;
  const val = c.value ? `"${c.value}"` : "";
  return `${field} ${op}${val ? " " + val : ""}`;
}

function actionLabel(a: any) {
  const type = ACTION_TYPE_OPTIONS.find((t) => t.value === a.type)?.label ?? a.type;
  return `${type}: ${a.value}`;
}

export default function ReglasPage() {
  const { data: session } = useSession();

  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);

  if (session?.user?.role !== "SUPERADMIN") {
    return <AppLayout title="Reglas de negocio"><div className="text-center py-12 text-slate-400">Solo superadmin</div></AppLayout>;
  }

  const load = async () => {
    const [r, u, t] = await Promise.all([
      fetch("/api/business-rules").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/tags").then((r) => r.json()),
    ]);
    setRules(Array.isArray(r) ? r : []);
    setUsers(Array.isArray(u) ? u : []);
    setTags(Array.isArray(t) ? t : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, conditions: [{ ...emptyCondition }] });
    setError("");
    setOpen(true);
  };

  const openEdit = (r: any) => {
    setEditing(r);
    setForm({
      name: r.name,
      isActive: r.isActive,
      event: r.event,
      conditions: r.conditions,
      action: r.action,
      order: r.order,
    });
    setError("");
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const method = editing ? "PATCH" : "POST";
    const url = editing ? `/api/business-rules/${editing.id}` : "/api/business-rules";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error"); return; }
    setOpen(false);
    load();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la regla "${name}"?`)) return;
    await fetch(`/api/business-rules/${id}`, { method: "DELETE" });
    load();
  };

  const toggleActive = async (r: any) => {
    await fetch(`/api/business-rules/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !r.isActive }),
    });
    load();
  };

  const setCondition = (i: number, key: string, value: string) =>
    setForm((f: any) => {
      const conditions = [...f.conditions];
      conditions[i] = { ...conditions[i], [key]: value };
      return { ...f, conditions };
    });

  const addCondition = () =>
    setForm((f: any) => ({ ...f, conditions: [...f.conditions, { ...emptyCondition }] }));

  const removeCondition = (i: number) =>
    setForm((f: any) => ({ ...f, conditions: f.conditions.filter((_: any, idx: number) => idx !== i) }));

  const setAction = (key: string, value: string) =>
    setForm((f: any) => ({ ...f, action: { ...f.action, [key]: value } }));

  // Dynamic value options based on action type
  const getActionValueInput = () => {
    const type = form.action?.type;
    if (type === "ASSIGN_TO_USER") {
      return (
        <select
          value={form.action.value}
          onChange={(e) => setAction("value", e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Seleccionar usuario</option>
          {users.filter(u => u.isActive).map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      );
    }
    if (type === "SET_PRIORITY") {
      return (
        <select
          value={form.action.value}
          onChange={(e) => setAction("value", e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Seleccionar prioridad</option>
          {PRIORITY_VALUES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      );
    }
    if (type === "ADD_TAG") {
      return (
        <select
          value={form.action.value}
          onChange={(e) => setAction("value", e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Seleccionar etiqueta</option>
          {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      );
    }
    return (
      <input
        type="text"
        value={form.action.value}
        onChange={(e) => setAction("value", e.target.value)}
        placeholder="Valor…"
        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    );
  };

  return (
    <AppLayout title="Reglas de negocio">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex justify-between items-start">
          <p className="text-sm text-slate-500 max-w-md">
            Las reglas se evalúan automáticamente al crear o actualizar tickets. Las reglas activas se ejecutan en orden de prioridad.
          </p>
          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4 mr-1" />Nueva regla
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No hay reglas configuradas</div>
        ) : (
          <Card>
            <div className="divide-y divide-slate-100">
              {rules.map((rule) => (
                <div key={rule.id} className={`flex items-start gap-4 px-4 py-4 ${!rule.isActive ? "opacity-50" : ""}`}>
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-50 flex-shrink-0 mt-0.5">
                    <BoltIcon className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">{rule.name}</p>
                      <Badge className={rule.event === "TICKET_CREATED" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                        {EVENT_OPTIONS.find(e => e.value === rule.event)?.label}
                      </Badge>
                      {!rule.isActive && <Badge className="bg-slate-100 text-slate-500">Inactiva</Badge>}
                      {rule.order > 0 && <span className="text-xs text-slate-400">#{rule.order}</span>}
                    </div>
                    <div className="mt-1 text-xs text-slate-600 space-y-0.5">
                      <p>
                        <span className="text-slate-400">Si: </span>
                        {rule.conditions?.map((c: any, i: number) => (
                          <span key={i}>{i > 0 ? " Y " : ""}<code className="bg-slate-100 rounded px-1">{conditionLabel(c)}</code></span>
                        ))}
                      </p>
                      <p>
                        <span className="text-slate-400">Entonces: </span>
                        <code className="bg-indigo-50 text-indigo-700 rounded px-1">{actionLabel(rule.action)}</code>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" onClick={() => toggleActive(rule)}>
                      {rule.isActive ? "Pausar" : "Activar"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(rule)}>
                      <PencilIcon className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(rule.id, rule.name)}>
                      <TrashIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar regla" : "Nueva regla de negocio"}>
        <form onSubmit={handleSave} className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          {/* Nombre + evento */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nombre *" value={form.name} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} required />
            <Select label="Evento *" options={EVENT_OPTIONS} value={form.event} onChange={(e) => setForm((f: any) => ({ ...f, event: e.target.value }))} />
          </div>

          {/* Condiciones */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Condiciones (SI todo es cierto…)</p>
            <div className="space-y-2">
              {form.conditions?.map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={c.field}
                    onChange={(e) => setCondition(i, "field", e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-40"
                  >
                    {FIELD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <select
                    value={c.operator}
                    onChange={(e) => setCondition(i, "operator", e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-36"
                  >
                    {OPERATOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {!["is_empty","is_not_empty"].includes(c.operator) && (
                    <input
                      type="text"
                      value={c.value}
                      onChange={(e) => setCondition(i, "value", e.target.value)}
                      placeholder="Valor…"
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  )}
                  {form.conditions.length > 1 && (
                    <button type="button" onClick={() => removeCondition(i)} className="text-slate-400 hover:text-red-500 px-1">✕</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addCondition} className="text-sm text-indigo-600 hover:underline">
                + Añadir condición
              </button>
            </div>
          </div>

          {/* Acción */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Acción (ENTONCES…)</p>
            <div className="flex items-center gap-2">
              <select
                value={form.action?.type}
                onChange={(e) => setAction("type", e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-48"
              >
                {ACTION_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {getActionValueInput()}
            </div>
          </div>

          {/* Orden */}
          <Input
            label="Orden de ejecución (0 = primero)"
            type="number"
            min={0}
            value={form.order}
            onChange={(e) => setForm((f: any) => ({ ...f, order: parseInt(e.target.value) || 0 }))}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="submit" loading={saving}>{editing ? "Guardar" : "Crear regla"}</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
