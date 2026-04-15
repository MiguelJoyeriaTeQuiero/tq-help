"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ASSET_TYPE_OPTIONS } from "@/components/assets/asset-type-badge";

const TYPE_OPTIONS = ASSET_TYPE_OPTIONS;

export default function NuevoActivoPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    type: "LAPTOP",
    brand: "",
    model: "",
    serialNumber: "",
    purchaseDate: "",
    warrantyEnd: "",
    supplier: "",
    cost: "",
    notes: "",
    assignedToId: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (session && !["SUPERADMIN", "DEPT_ADMIN"].includes(session.user.role)) {
    return (
      <AppLayout title="Nuevo activo">
        <div className="text-center py-12 text-slate-400">Sin permisos para esta acción</div>
      </AppLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    const body: any = { ...form };
    if (!body.brand) delete body.brand;
    if (!body.model) delete body.model;
    if (!body.serialNumber) delete body.serialNumber;
    if (!body.purchaseDate) delete body.purchaseDate;
    if (!body.warrantyEnd) delete body.warrantyEnd;
    if (!body.supplier) delete body.supplier;
    if (!body.notes) delete body.notes;
    if (!body.assignedToId) delete body.assignedToId;
    if (body.cost) body.cost = parseFloat(body.cost);
    else delete body.cost;

    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Error al crear activo");
      return;
    }
    const data = await res.json();
    router.push(`/activos/${data.id}`);
  };

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <AppLayout title="Nuevo activo">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader><CardTitle>Registrar nuevo activo</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Básico */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input label="Nombre del activo *" value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="Ej: MacBook Pro 14 - M1" />
                </div>
                <Select label="Tipo *" options={TYPE_OPTIONS} value={form.type} onChange={(e) => set("type", e.target.value)} />
                <Input label="Marca" value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Apple, Dell, HP…" />
                <Input label="Modelo" value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="MacBook Pro 14" />
                <Input label="Número de serie" value={form.serialNumber} onChange={(e) => set("serialNumber", e.target.value)} placeholder="SN-XXXXXX" />
              </div>

              {/* Ciclo de vida */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Ciclo de vida</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="Fecha de compra" type="date" value={form.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)} />
                  <Input label="Fin de garantía" type="date" value={form.warrantyEnd} onChange={(e) => set("warrantyEnd", e.target.value)} />
                  <Input label="Proveedor" value={form.supplier} onChange={(e) => set("supplier", e.target.value)} placeholder="Amazon, PCComponentes…" />
                  <Input label="Coste (€)" type="number" step="0.01" min="0" value={form.cost} onChange={(e) => set("cost", e.target.value)} placeholder="0.00" />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={3}
                  placeholder="Información adicional, accesorios incluidos…"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={saving}>Crear activo</Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
