import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const { resolved, message } = await req.json();

  const incident = await prisma.statusIncident.update({
    where: { id },
    data: {
      resolvedAt: resolved ? new Date() : null,
      ...(message ? { message } : {}),
    },
  });

  // If resolved, check if service has other open incidents; if not, set OPERATIONAL
  if (resolved) {
    const openCount = await prisma.statusIncident.count({
      where: { serviceId: incident.serviceId, resolvedAt: null },
    });
    if (openCount === 0) {
      await prisma.serviceStatus.update({
        where: { id: incident.serviceId },
        data: { status: "OPERATIONAL" },
      });
    }
  }

  return NextResponse.json(incident);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.statusIncident.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
