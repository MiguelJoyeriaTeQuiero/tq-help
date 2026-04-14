import { Role } from "@prisma/client";

type SessionUser = {
  id: string;
  role: Role;
  department: string;
};

export function canManageTickets(user: SessionUser, targetDept?: string): boolean {
  if (user.role === "SUPERADMIN") return true;
  if (user.role === "DEPT_ADMIN" && targetDept && user.department === targetDept) return true;
  return false;
}

export function canSeeInternalComments(user: SessionUser, targetDept?: string): boolean {
  if (user.role === "SUPERADMIN") return true;
  if (user.role === "DEPT_ADMIN" && targetDept && user.department === targetDept) return true;
  return false;
}

export function canAccessComplaints(user: SessionUser): boolean {
  if (user.role === "SUPERADMIN") return true;
  if (
    user.role === "DEPT_ADMIN" &&
    (user.department === "RRHH" || user.department === "DIRECCION")
  ) return true;
  return false;
}

// VIEWER de Dirección puede ver denuncias RESUELTA/ARCHIVADA
export function canViewResolvedComplaints(user: SessionUser): boolean {
  if (canAccessComplaints(user)) return true;
  if (user.role === "VIEWER" && user.department === "DIRECCION") return true;
  return false;
}

export function isAdmin(user: SessionUser): boolean {
  return user.role === "SUPERADMIN" || user.role === "DEPT_ADMIN";
}

export function isSuperAdmin(user: SessionUser): boolean {
  return user.role === "SUPERADMIN";
}
