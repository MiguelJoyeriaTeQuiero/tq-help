"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { DEPARTMENT_LABELS, ROLE_LABELS } from "@/lib/utils";
import { PlusIcon } from "@heroicons/react/24/outline";

const DEPT_OPTIONS = [
  { value: "IT", label: "IT" }, { value: "MARKETING", label: "Marketing" },
  { value: "LOGISTICA", label: "Logística" }, { value: "RRHH", label: "RRHH" },
  { value: "CONTABILIDAD", label: "Contabilidad" }, { value: "PRODUCTO", label: "Producto" },
  { value: "DIRECCION", label: "Dirección" },
];
const ROLE_OPTIONS = [
  { value: "EMPLOYEE", label: "Empleado" }, { value: "DEPT_ADMIN", label: "Admin de departamento" },
  { value: "VIEWER", label: "Viewer" }, { value: "SUPERADMIN", label: "Superadmin" },
];

export default function UsuariosPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "EMPLOYEE", department: "IT" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    fetch("/api/users").then((r) => r.json()).then((d) => { setUsers(Array.isArray(d) ? d : []); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreating(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setCreating(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Error al crear usuario");
      return;
    }
    setModalOpen(false);
    setForm({ name: "", email: "", role: "EMPLOYEE", department: "IT" });
    load();
  };

  const toggleActive = async (userId: string, current: boolean) => {
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    load();
  };

  if (session?.user.role !== "SUPERADMIN") {
    return <AppLayout title="Usuarios"><div className="text-center py-12 text-slate-400">Acceso solo para superadmin</div></AppLayout>;
  }

  return (
    <AppLayout title="Gestión de usuarios">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setModalOpen(true)}>
            <PlusIcon className="mr-1 h-4 w-4" />Nuevo usuario
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Cargando...</div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-4 py-3 font-medium text-slate-500">Nombre</th>
                    <th className="px-4 py-3 font-medium text-slate-500">Departamento</th>
                    <th className="px-4 py-3 font-medium text-slate-500">Rol</th>
                    <th className="px-4 py-3 font-medium text-slate-500">Estado</th>
                    <th className="px-4 py-3 font-medium text-slate-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                        {u.mustChangePassword && <span className="text-[10px] text-yellow-600">Pendiente cambio contraseña</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {DEPARTMENT_LABELS[u.department as keyof typeof DEPARTMENT_LABELS]}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-slate-100 text-slate-700">{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={u.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}>
                          {u.isActive ? "Activo" : "Desactivado"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {u.id !== session.user.id && (
                          <Button
                            size="sm"
                            variant={u.isActive ? "danger" : "secondary"}
                            onClick={() => toggleActive(u.id, u.isActive)}
                          >
                            {u.isActive ? "Desactivar" : "Activar"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo usuario">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Nombre completo *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Email corporativo *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Departamento *" options={DEPT_OPTIONS} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            <Select label="Rol *" options={ROLE_OPTIONS} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <p className="text-xs text-slate-500">Se enviará un email con las credenciales de acceso.</p>
          <div className="flex gap-3">
            <Button type="submit" loading={creating}>Crear usuario</Button>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
