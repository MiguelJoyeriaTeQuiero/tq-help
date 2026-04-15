import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  setStatus: z.enum(["OPERATIONAL", "DEGRADED", "INCIDENT", "MAINTENANCE"]).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: serviceId } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { setStatus, ...rest } = parsed.data;
  const incident = await prisma.statusIncident.create({ data: { ...rest, serviceId } });

  // Optionally update service status
  if (setStatus) {
    await prisma.serviceStatus.update({ where: { id: serviceId }, data: { status: setStatus } });
  }

  return NextResponse.json(incident, { status: 201 });
}
