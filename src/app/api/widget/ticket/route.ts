import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSlaDeadline } from "@/lib/sla";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  email: z.string().email("Email inválido"),
  subject: z.string().min(5, "Asunto mínimo 5 caracteres"),
  description: z.string().min(10, "Descripción mínimo 10 caracteres"),
  dept: z.string().min(1, "Departamento requerido"),
});

// Public endpoint — no auth required (anonymous widget submissions)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name, email, subject, description, dept } = parsed.data;

  // Find or create a guest user for this email
  let user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user) {
    // Create a minimal guest account (they'll get an invite notification)
    const { hashSync } = await import("bcryptjs");
    user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash: hashSync(Math.random().toString(36).slice(-12), 10),
        role: "EMPLOYEE",
        department: dept,
        mustChangePassword: true,
        isActive: true,
      },
    });
  }

  const slaDeadline = calculateSlaDeadline("MEDIA");
  const ticket = await prisma.ticket.create({
    data: {
      title: subject,
      description: `**Enviado vía widget web**\n\n${description}\n\n---\n_Nombre: ${name} · Email: ${email}_`,
      priority: "MEDIA",
      targetDept: [dept],
      originDept: dept,
      authorId: user.id,
      slaDeadline,
    },
  });

  await prisma.ticketStatusHistory.create({
    data: { ticketId: ticket.id, toStatus: "ABIERTO" },
  });

  return NextResponse.json({ id: ticket.id, message: "Solicitud enviada correctamente" }, { status: 201 });
}
