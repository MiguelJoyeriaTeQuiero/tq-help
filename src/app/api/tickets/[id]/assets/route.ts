import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const links = await prisma.ticketAsset.findMany({
    where: { ticketId: id },
    include: {
      asset: {
        include: { assignedTo: { select: { id: true, name: true } } },
      },
    },
    orderBy: { linkedAt: "desc" },
  });

  return NextResponse.json(links);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPERADMIN", "DEPT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: ticketId } = await params;
  const { assetId } = await req.json();
  if (!assetId) return NextResponse.json({ error: "assetId required" }, { status: 400 });

  // Check ticket exists
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  // Upsert (ignore if already linked)
  const link = await prisma.ticketAsset.upsert({
    where: { ticketId_assetId: { ticketId, assetId } },
    update: {},
    create: { ticketId, assetId, linkedById: session.user.id },
    include: {
      asset: { include: { assignedTo: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json(link, { status: 201 });
}
