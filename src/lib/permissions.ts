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
