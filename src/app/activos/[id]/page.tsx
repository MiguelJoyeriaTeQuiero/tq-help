"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { AssetStatusBadge } from "@/components/assets/asset-status-badge";
import { AssetTypeBadge, ASSET_TYPE_OPTIONS, ASSET_TYPE_LABELS } from "@/components/assets/asset-type-badge";
import { AssetQrCard } from "@/components/assets/asset-qr-card";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketStatusBadge } from "@/components/tickets/status-badge";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useDepartments } from "@/hooks/use-departments";
import {
  PencilIcon,
  TrashIcon,
  UserIcon,
  CalendarIcon,
  CurrencyEuroIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

const STATUS_OPTIONS = [
  { value: "EN_STOCK",      label: "En stock" },
  { value: "ASIGNADO",      label: "Asignado" },
  { value: "EN_REPARACION", label: "En reparación" },
  { value: "DADO_DE_BAJA",  label: "Dado de baja" },
];

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
      <Icon className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: session } = useSession();
  const { getDeptLabel } = useDepartments();
  const canManage = session?.user?.role === "SUPERADMIN" || session?.user?.role === "DEPT_ADMIN";

  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Users for assignment
  const [users, setUsers] = useState<any[]>([]);

  const load = () => {
    fetch(`/api/assets/${id}`)
      .then((r) => r.json())
      .then((d) => { setAsset(d); setLoading(false); });
  };

  useEffect(() => { load(); }, [id]);

  const openEdit = async () => {
    const usersData = await fetch("/api/users").then((r) => r.json());
    setUsers(Array.isArray(usersData) ? usersData : []);
    setEditForm({
      name: asset.name,
      type: asset.type,
      status: asset.status,
      brand: asset.brand ?? "",
      model: asset.model ?? "",
      serialNumber: asset.serialNumber ?? "",
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.split("T")[0] : "",
      warrantyEnd: asset.warrantyEnd ? asset.warrantyEnd.split("T")[0] : "",
      supplier: asset.supplier ?? "",
      cost: asset.cost ?? "",
      notes: asset.notes ?? "",
      assignedToId: asset.assignedToId ?? "",
    });
    setSaveError("");
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    const body: any = { ...editForm };
    if (!body.brand) body.brand = null;
    if (!body.model) body.model = null;
    if (!body.serialNumber) body.serialNumber = null;
    if (!body.purchaseDate) body.purchaseDate = null;
    if (!body.warrantyEnd) body.warrantyEnd = null;
    if (!body.supplier) body.supplier = null;
    if (!body.notes) body.notes = null;
    if (!body.assignedToId) body.assignedToId = null;
    if (body.cost !== "" && body.cost !== null) body.cost = parseFloat(body.cost);
    else body.cost = null;

    const res = await fetch(`/api/assets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setSaveError(d.error ?? "Error al guardar");
      return;
    }
    setEditOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar el activo "${asset?.name}"? Esta acción es irreversible.`)) return;
    await fetch(`/api/assets/${id}`, { method: "DELETE" });
    router.push("/activos");
  };

  const setF = (k: string, v: string) => setEditForm((f: any) => ({ ...f, [k]: v }));

  if (loading) {
    return (
      <AppLayout title="Activo">
        <div className="max-w-7xl mx-auto grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-5 w-32 rounded-full" />
              <div className="space-y-2 mt-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-4 w-full" />)}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-48 w-48 mx-auto rounded-xl" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!asset || asset.error) {
    return (
      <AppLayout title="Activo">
        <div className="text-center py-12 text-slate-400">Activo no encontrado</div>
      </AppLayout>
    );
  }

  const warrantyExpired = asset.warrantyEnd && new Date(asset.warrantyEnd) < new Date();

  return (
    <AppLayout title={asset.name}>
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{asset.name}</h1>
              <AssetTypeBadge type={asset.type} />
              <AssetStatusBadge status={asset.status} />
            </div>
            {(asset.brand || asset.model) && (
              <p className="text-sm text-slate-500 mt-0.5">{[asset.brand, asset.model].filter(Boolean).join(" · ")}</p>
            )}
          </div>
          {canManage && (
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" variant="outline" onClick={openEdit}>
                <PencilIcon className="h-3.5 w-3.5 mr-1" />
                Editar
              </Button>
              {session?.user?.role === "SUPERADMIN" && (
                <Button size="sm" variant="danger" onClick={handleDelete}>
                  <TrashIcon className="h-3.5 w-3.5 mr-1" />
                  Eliminar
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader><CardTitle>Información del activo</CardTitle></CardHeader>
              <CardContent>
                <div className="divide-y divide-slate-100">
                  {asset.serialNumber && (
                    <InfoRow icon={DocumentTextIcon} label="Número de serie" value={<span className="font-mono">{asset.serialNumber}</span>} />
                  )}
                  {asset.purchaseDate && (
                    <InfoRow icon={CalendarIcon} label="Fecha de compra" value={format(new Date(asset.purchaseDate), "dd MMMM yyyy", { locale: es })} />
                  )}
                  {asset.warrantyEnd && (
                    <InfoRow
                      icon={ShieldCheckIcon}
                      label="Fin de garantía"
                      value={
                        <span className={warrantyExpired ? "text-red-600" : "text-green-700"}>
                          {format(new Date(asset.warrantyEnd), "dd MMMM yyyy", { locale: es })}
                          {warrantyExpired ? " · Garantía vencida" : " · En garantía"}
                        </span>
                      }
                    />
                  )}
                  {asset.supplier && (
                    <InfoRow icon={DocumentTextIcon} label="Proveedor" value={asset.supplier} />
                  )}
                  {asset.cost !== null && asset.cost !== undefined && (
                    <InfoRow icon={CurrencyEuroIcon} label="Coste" value={`${Number(asset.cost).toFixed(2)} €`} />
                  )}
                  {asset.assignedTo && (
                    <InfoRow
                      icon={UserIcon}
                      label="Asignado a"
                      value={
                        <span>
                          {asset.assignedTo.name}
                          <span className="text-slate-400 font-normal"> · {getDeptLabel(asset.assignedTo.department)}</span>
                        </span>
                      }
                    />
                  )}
                  {asset.notes && (
                    <InfoRow icon={DocumentTextIcon} label="Notas" value={<span className="whitespace-pre-wrap">{asset.notes}</span>} />
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-3">
                  Registrado por {asset.createdBy?.name} · {format(new Date(asset.createdAt), "dd/MM/yyyy", { locale: es })}
                </p>
              </CardContent>
            </Card>

            {/* Linked tickets */}
            {asset.ticketAssets?.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Incidencias vinculadas</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {asset.ticketAssets.map((ta: any) => (
                      <li key={ta.ticketId} className="flex items-center gap-3 text-sm">
                        <PriorityBadge priority={ta.ticket.priority} />
                        <Link href={`/tickets/${ta.ticketId}`} className="flex-1 truncate text-slate-700 hover:text-indigo-600">
                          {ta.ticket.title}
                        </Link>
                        <TicketStatusBadge status={ta.ticket.status} />
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* QR */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Código QR</CardTitle></CardHeader>
              <CardContent>
                <AssetQrCard assetId={asset.id} assetName={asset.name} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar activo">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input label="Nombre *" value={editForm.name ?? ""} onChange={(e) => setF("name", e.target.value)} required />
            </div>
            <Select label="Tipo" options={ASSET_TYPE_OPTIONS} value={editForm.type ?? ""} onChange={(e) => setF("type", e.target.value)} />
            <Select label="Estado" options={STATUS_OPTIONS} value={editForm.status ?? ""} onChange={(e) => setF("status", e.target.value)} />
            <Input label="Marca" value={editForm.brand ?? ""} onChange={(e) => setF("brand", e.target.value)} />
            <Input label="Modelo" value={editForm.model ?? ""} onChange={(e) => setF("model", e.target.value)} />
            <Input label="Número de serie" value={editForm.serialNumber ?? ""} onChange={(e) => setF("serialNumber", e.target.value)} />
            <Input label="Proveedor" value={editForm.supplier ?? ""} onChange={(e) => setF("supplier", e.target.value)} />
            <Input label="Fecha compra" type="date" value={editForm.purchaseDate ?? ""} onChange={(e) => setF("purchaseDate", e.target.value)} />
            <Input label="Fin garantía" type="date" value={editForm.warrantyEnd ?? ""} onChange={(e) => setF("warrantyEnd", e.target.value)} />
            <Input label="Coste (€)" type="number" step="0.01" value={editForm.cost ?? ""} onChange={(e) => setF("cost", e.target.value)} />
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Asignar a usuario</label>
              <select
                value={editForm.assignedToId ?? ""}
                onChange={(e) => setF("assignedToId", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Sin asignar</option>
                {users.filter((u) => u.isActive).map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({getDeptLabel(u.department)})</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
              <textarea
                value={editForm.notes ?? ""}
                onChange={(e) => setF("notes", e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
            </div>
          </div>
          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          <div className="flex gap-3 pt-1">
            <Button loading={saving} onClick={handleSave}>Guardar cambios</Button>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
