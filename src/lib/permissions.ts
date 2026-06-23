import { Role } from "@prisma/client";

type SessionUser = {
  id: string;
  role: Role;
  department: string;
};

export function canManageTickets(user: SessionUser, targetDept?: string | string[]): boolean {
  if (user.role === "SUPERADMIN") return true;
  if (user.role === "DEPT_ADMIN" && targetDept) {
    const depts = Array.isArray(targetDept) ? targetDept : [targetDept];
    return depts.includes(user.department);
  }
  return false;
}

export function canSeeInternalComments(user: SessionUser, targetDept?: string | string[]): boolean {
  if (user.role === "SUPERADMIN") return true;
  if (user.role === "DEPT_ADMIN" && targetDept) {
    const depts = Array.isArray(targetDept) ? targetDept : [targetDept];
    return depts.includes(user.department);
  }
  return false;
}

export function isAdmin(user: SessionUser): boolean {
  return user.role === "SUPERADMIN" || user.role === "DEPT_ADMIN";
}

export function isSuperAdmin(user: SessionUser): boolean {
  return user.role === "SUPERADMIN";
}

// Claves del departamento de logística que dan acceso al almacén.
// Incluye la clave real de la BD ("LOGSTICA", con errata histórica) y la variante correcta.
export const WAREHOUSE_DEPARTMENTS = ["LOGSTICA", "LOGISTICA"];

// Gestión de almacén: superadmins y cualquier usuario del departamento de logística
export function canManageWarehouse(user: SessionUser): boolean {
  return user.role === "SUPERADMIN" || WAREHOUSE_DEPARTMENTS.includes(user.department);
}
