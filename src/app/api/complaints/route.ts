import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessComplaints, canViewResolvedComplaints } from "@/lib/permissions";
import { generateTrackingCode } from "@/lib/utils";
import { z } from "zod";

const createSchema = z.object({
  category: z.enum(["ACOSO_LABORAL", "FRAUDE", "DISCRIMINACION", "CONFLICTO_INTERESES", "OTRO"]),
  description: z.string().min(20).max(10000),
});

// GET — lista de denuncias (solo RRHH/Dirección admins)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const canFull = canAccessComplaints(session.user);
  const canResolved = canViewResolvedComplaints(session.user);

  if (!canFull && !canResolved) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: any = {};
  if (status) {
    where.status = status;
  } else if (!canFull && canResolved) {
    // VIEWER solo ve resueltas/archivadas
    where.status = { in: ["RESUELTA", "ARCHIVADA"] };
  }

  const complaints = await prisma.complaint.findMany({
    where,
    select: {
      id: true,
      trackingCode: true,
      category: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { internalNotes: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Registrar acceso en audit log
  await Promise.all(
    complaints.map((c) =>
      prisma.complaintAuditLog.create({
        data: { complaintId: c.id, userId: session.user.id, action: "VIEW_LIST" },
      })
    )
  );

  return NextResponse.json(complaints);
}

// POST — crear denuncia anónima (sin autenticación requerida)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Generar código único
  let trackingCode = generateTrackingCode();
  let attempts = 0;
  while (attempts < 10) {
    const exists = await prisma.complaint.findUnique({ where: { trackingCode } });
    if (!exists) break;
    trackingCode = generateTrackingCode();
    attempts++;
  }

  const complaint = await prisma.complaint.create({
    data: {
      trackingCode,
      category: parsed.data.category as any,
      description: parsed.data.description,
    },
  });

  await prisma.complaintStatusHistory.create({
    data: { complaintId: complaint.id, toStatus: "RECIBIDA" },
  });

  // Devolver SOLO el código de seguimiento, nunca el ID interno
  return NextResponse.json({ trackingCode: complaint.trackingCode }, { status: 201 });
}
