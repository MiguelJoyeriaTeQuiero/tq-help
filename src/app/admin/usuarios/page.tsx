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
import { ROLE_LABELS } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useDepartments } from "@/hooks/use-departments";
import { PlusIcon, KeyIcon, ClipboardDocumentIcon, CheckIcon } from "@heroicons/react/24/outline";

const ROLE_OPTIONS = [
  { value: "EMPLOYEE", label: "Empleado" }, { value: "DEPT_ADMIN", label: "Admin de departamento" },
  { value: "VIEWER", label: "Viewer" }, { value: "SUPERADMIN", label: "Superadmin" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy} className="ml-2 p-1 rounded text-slate-400 hover:text-indigo-600 transition-colors" title="Copiar">
      {copied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
    </button>
  );
}

export default function UsuariosPage() {
  const { data: session } = useSession();
  const { departments, getDeptLabel } = useDepartments();
  const deptOptions = departments.map((d) => ({ value: d.key, label: d.label }));
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal crear usuario
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "EMPLOYEE", department: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Modal contraseña generada (tras crear o resetear)
  const [passwordModal, setPasswordModal] = useState<{ name: string; password: string } | null>(null);

  // Modal resetear contraseña
  const [resetModal, setResetModal] = useState<{ id: string; name: string } | null>(null);
  const [customPassword, setCustomPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");

  const load = () => {
    fetch("/api/users").then((r) => r.json()).then((d) => { setUsers(Array.isArray(d) ? d : []); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setCreating(false);
    if (!res.ok) {
      const d = await res.json();
      setCreateError(d.error ?? "Error al crear usuario");
      return;
    }
    const data = await res.json();
    setCreateOpen(false);
    setForm({ name: "", email: "", role: "EMPLOYEE", department: "IT" });
    load();
    // Mostrar contraseña generada
    setPasswordModal({ name: data.name, password: data.generatedPassword });
  };

  const handleReset = async () => {
    if (!resetModal) return;
    setResetting(true);
    setResetError("");
    const body: any = { resetPassword: true };
    if (customPassword.trim()) body.newPassword = customPassword.trim();
    const res = await fetch(`/api/users/${resetModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setResetting(false);
    if (!res.ok) {
      const d = await res.json();
      setResetError(d.error ?? "Error al resetear");
      return;
    }
    const data = await res.json();
    setResetModal(null);
    setCustomPassword("");
    load();
    setPasswordModal({ name: resetModal.name, password: data.generatedPassword });
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
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="mr-1 h-4 w-4" />Nuevo usuario
          </Button>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <div className="flex gap-2 ml-auto">
                    <Skeleton className="h-8 w-20 rounded-lg" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-4 py-3 font-medium text-slate-500">Nombre</th>
                    <th className="px-4 py-3 font-medium text-slate-500 hidden md:table-cell">Departamento</th>
                    <th className="px-4 py-3 font-medium text-slate-500 hidden md:table-cell">Rol</th>
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
                        {u.mustChangePassword && (
                          <span className="text-[10px] text-amber-600 font-medium">⚠ Pendiente cambio contraseña</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                        {getDeptLabel(u.department)}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge className="bg-slate-100 text-slate-700">{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={u.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}>
                          {u.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {u.id !== session.user.id && (
                            <>
                              <Button
                                size="sm"
                                variant={u.isActive ? "danger" : "secondary"}
                                onClick={() => toggleActive(u.id, u.isActive)}
                              >
                                {u.isActive ? "Desactivar" : "Activar"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setResetModal({ id: u.id, name: u.name }); setCustomPassword(""); setResetError(""); }}
                              >
                                <KeyIcon className="h-3.5 w-3.5 mr-1" />
                                Contraseña
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Modal: Crear usuario */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo usuario">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Nombre completo *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Email corporativo *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Departamento *" options={deptOptions} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            <Select label="Rol *" options={ROLE_OPTIONS} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          </div>
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <p className="text-xs text-slate-500">
            La contraseña se generará automáticamente con las iniciales del nombre + números.
          </p>
          <div className="flex gap-3">
            <Button type="submit" loading={creating}>Crear usuario</Button>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Resetear contraseña */}
      <Modal open={!!resetModal} onClose={() => setResetModal(null)} title={`Contraseña — ${resetModal?.name}`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Deja el campo vacío para generar una contraseña automática con las iniciales del usuario, o escribe una contraseña personalizada.
          </p>
          <Input
            label="Nueva contraseña (opcional)"
            placeholder="Dejar vacío para generar automáticamente"
            value={customPassword}
            onChange={(e) => setCustomPassword(e.target.value)}
          />
          {resetError && <p className="text-sm text-red-600">{resetError}</p>}
          <div className="flex gap-3">
            <Button loading={resetting} onClick={handleReset}>
              <KeyIcon className="h-4 w-4 mr-1" />
              {customPassword.trim() ? "Establecer contraseña" : "Generar automáticamente"}
            </Button>
            <Button variant="outline" onClick={() => setResetModal(null)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Mostrar contraseña generada */}
      <Modal open={!!passwordModal} onClose={() => setPasswordModal(null)} title="Contraseña generada">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Copia esta contraseña y comunícasela a <strong>{passwordModal?.name}</strong>. El usuario deberá cambiarla en su primer acceso.
          </p>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="font-mono text-lg font-bold text-slate-900 tracking-widest">
              {passwordModal?.password}
            </span>
            {passwordModal && <CopyButton text={passwordModal.password} />}
          </div>
          <Button onClick={() => setPasswordModal(null)}>Entendido</Button>
        </div>
      </Modal>
    </AppLayout>
  );
}
