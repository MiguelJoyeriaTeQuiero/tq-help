import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  type: z.enum(["LAPTOP","DESKTOP","MONITOR","PHONE","TABLET","PRINTER","NETWORK_DEVICE","SOFTWARE_LICENSE","PERIPHERAL","OTHER"]),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
  warrantyEnd: z.string().optional(),
  supplier: z.string().optional(),
  cost: z.number().optional(),
  notes: z.string().optional(),
  assignedToId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";

  const assets = await prisma.asset.findMany({
    where: {
      ...(type ? { type: type as any } : {}),
      ...(status ? { status: status as any } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { brand: { contains: search, mode: "insensitive" } },
          { model: { contains: search, mode: "insensitive" } },
          { serialNumber: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    },
    include: {
      assignedTo: { select: { id: true, name: true, department: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { ticketAssets: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assets);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPERADMIN", "DEPT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { purchaseDate, warrantyEnd, cost, assignedToId, ...rest } = parsed.data;

  const asset = await prisma.asset.create({
    data: {
      ...rest,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      warrantyEnd: warrantyEnd ? new Date(warrantyEnd) : undefined,
      cost: cost !== undefined ? cost : undefined,
      assignedToId: assignedToId || undefined,
      assignedAt: assignedToId ? new Date() : undefined,
      status: assignedToId ? "ASIGNADO" : "EN_STOCK",
      createdById: session.user.id,
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(asset, { status: 201 });
}
