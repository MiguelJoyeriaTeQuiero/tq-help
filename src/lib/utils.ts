import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { TicketPriority, TicketStatus, FeatureStatus, ComplaintStatus, Role } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateTrackingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Static fallback labels; UI forms should use useDepartments() hook for live list
export const DEPARTMENT_LABELS: Record<string, string> = {
  MARKETING: "Marketing",
  LOGISTICA: "Logística",
  IT: "IT",
  RRHH: "RRHH",
  CONTABILIDAD: "Contabilidad",
  PRODUCTO: "Producto",
  DIRECCION: "Dirección",
};

export function getDeptLabel(key: string): string {
  return DEPARTMENT_LABELS[key] ?? key;
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: "Superadmin",
  DEPT_ADMIN: "Admin de departamento",
  EMPLOYEE: "Empleado",
  VIEWER: "Viewer",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  ABIERTO: "Abierto",
  EN_PROGRESO: "En progreso",
  RESUELTO: "Resuelto",
  CERRADO: "Cerrado",
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Crítica",
};

export const FEATURE_STATUS_LABELS: Record<FeatureStatus, string> = {
  PENDIENTE: "Pendiente",
  EN_REVISION: "En revisión",
  EN_DESARROLLO: "En desarrollo",
  COMPLETADO: "Completado",
  DESCARTADO: "Descartado",
};

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  RECIBIDA: "Recibida",
  EN_INVESTIGACION: "En investigación",
  RESUELTA: "Resuelta",
  ARCHIVADA: "Archivada",
};

export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  BAJA: "bg-slate-100 text-slate-700",
  MEDIA: "bg-blue-100 text-blue-700",
  ALTA: "bg-orange-100 text-orange-700",
  CRITICA: "bg-red-100 text-red-700",
};

export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  ABIERTO: "bg-yellow-100 text-yellow-700",
  EN_PROGRESO: "bg-blue-100 text-blue-700",
  RESUELTO: "bg-green-100 text-green-700",
  CERRADO: "bg-slate-100 text-slate-700",
};

export const FEATURE_STATUS_COLORS: Record<FeatureStatus, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-700",
  EN_REVISION: "bg-purple-100 text-purple-700",
  EN_DESARROLLO: "bg-blue-100 text-blue-700",
  COMPLETADO: "bg-green-100 text-green-700",
  DESCARTADO: "bg-slate-100 text-slate-700",
};
