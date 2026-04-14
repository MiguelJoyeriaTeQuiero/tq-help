import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/permissions";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const policies = await prisma.slaPolicy.findMany({ orderBy: { priority: "asc" } });
  return NextResponse.json(policies);
}

const updateSchema = z.object({
  priority: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]),
  resolutionMinutes: z.number().int().min(1),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isSuperAdmin(session.user)) return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const policy = await prisma.slaPolicy.upsert({
    where: { priority: parsed.data.priority as any },
    update: { resolutionMinutes: parsed.data.resolutionMinutes },
    create: {
      priority: parsed.data.priority as any,
      resolutionMinutes: parsed.data.resolutionMinutes,
      escalateTo: "DEPT_ADMIN",
    },
  });

  return NextResponse.json(policy);
}
