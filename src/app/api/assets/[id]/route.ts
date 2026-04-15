import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["LAPTOP","DESKTOP","MONITOR","PHONE","TABLET","PRINTER","NETWORK_DEVICE","SOFTWARE_LICENSE","PERIPHERAL","OTHER"]).optional(),
  status: z.enum(["EN_STOCK","ASIGNADO","EN_REPARACION","DADO_DE_BAJA"]).optional(),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  warrantyEnd: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  cost: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, department: true } },
      createdBy: { select: { id: true, name: true } },
      ticketAssets: {
        include: {
          ticket: {
            select: { id: true, title: true, status: true, priority: true, createdAt: true },
          },
        },
        orderBy: { linkedAt: "desc" },
      },
    },
  });

  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(asset);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPERADMIN", "DEPT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { purchaseDate, warrantyEnd, cost, assignedToId, ...rest } = parsed.data;

  // Determine status based on assignedToId change
  const updateData: any = { ...rest };
  if (purchaseDate !== undefined) updateData.purchaseDate = purchaseDate ? new Date(purchaseDate) : null;
  if (warrantyEnd !== undefined) updateData.warrantyEnd = warrantyEnd ? new Date(warrantyEnd) : null;
  if (cost !== undefined) updateData.cost = cost;
  if (assignedToId !== undefined) {
    updateData.assignedToId = assignedToId || null;
    updateData.assignedAt = assignedToId ? new Date() : null;
    if (!rest.status) {
      updateData.status = assignedToId ? "ASIGNADO" : "EN_STOCK";
    }
  }

  const asset = await prisma.asset.update({
    where: { id },
    data: updateData,
    include: {
      assignedTo: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(asset);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.asset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
