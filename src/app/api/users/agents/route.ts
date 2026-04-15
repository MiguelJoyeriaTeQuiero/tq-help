import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/users/agents
 * Returns all active SUPERADMIN and DEPT_ADMIN users for agent assignment.
 * Accessible to any authenticated admin (SUPERADMIN or DEPT_ADMIN).
 */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!["SUPERADMIN", "DEPT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const agents = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["SUPERADMIN", "DEPT_ADMIN"] },
    },
    select: { id: true, name: true, email: true, department: true, role: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(agents);
}
