import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

// Public GET — add ?all=1 to include resolved incidents (admin use)
export async function GET(req: NextRequest) {
  const all = new URL(req.url).searchParams.get("all") === "1";
  const services = await prisma.serviceStatus.findMany({
    include: {
      incidents: {
        where: all ? {} : { resolvedAt: null },
        orderBy: { createdAt: "desc" },
        take: all ? 20 : undefined,
      },
    },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(services);
}

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["OPERATIONAL", "DEGRADED", "INCIDENT", "MAINTENANCE"]).default("OPERATIONAL"),
  order: z.number().int().default(0),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const service = await prisma.serviceStatus.create({ data: parsed.data });
  return NextResponse.json(service, { status: 201 });
}
