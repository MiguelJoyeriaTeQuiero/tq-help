import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/permissions";
import { getReplenishmentSettings, REPLENISHMENT_DEFAULTS } from "@/lib/replenishment";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const cfg = await getReplenishmentSettings();
  return NextResponse.json(cfg);
}

const schema = z.object({
  safetyFactor: z.number().min(0).max(5).optional(),
  cycleDays: z.number().int().min(1).max(365).optional(),
  windowMonths: z.number().int().min(1).max(36).optional(),
  minCycles: z.number().int().min(1).max(24).optional(),
  defaultLeadDays: z.number().int().min(0).max(365).optional(),
  campaignMultiplier: z.number().min(1).max(10).optional(),
  campaignMonths: z.array(z.number().int().min(1).max(12)).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isSuperAdmin(session.user)) return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const cfg = await prisma.replenishmentConfig.upsert({
    where: { id: "singleton" },
    update: parsed.data,
    create: { id: "singleton", ...REPLENISHMENT_DEFAULTS, ...parsed.data },
  });

  return NextResponse.json(cfg);
}
