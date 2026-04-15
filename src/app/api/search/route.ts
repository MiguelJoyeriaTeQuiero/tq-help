import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const contains = { contains: q, mode: "insensitive" as const };

  // Parallel queries
  const [tickets, features, faqs, users] = await Promise.all([
    // Tickets — respeta permisos
    prisma.ticket.findMany({
      where: {
        AND: [
          session.user.role === "EMPLOYEE"
            ? { authorId: session.user.id }
            : session.user.role === "DEPT_ADMIN"
            ? { OR: [{ targetDept: { has: session.user.department } }, { authorId: session.user.id }] }
            : {},
          { OR: [{ title: contains }, { description: contains }] },
        ],
      },
      select: { id: true, title: true, status: true, priority: true },
      take: 5,
    }),

    // Feature requests
    prisma.featureRequest.findMany({
      where: { OR: [{ title: contains }, { description: contains }] },
      select: { id: true, title: true, status: true, voteCount: true },
      take: 5,
    }),

    // FAQ — public
    prisma.faqItem.findMany({
      where: {
        isActive: true,
        OR: [{ question: contains }, { answer: contains }],
      },
      select: { id: true, question: true, category: true },
      take: 4,
    }),

    // Users — solo admins
    ["SUPERADMIN"].includes(session.user.role)
      ? prisma.user.findMany({
          where: {
            isActive: true,
            OR: [{ name: contains }, { email: contains }],
          },
          select: { id: true, name: true, email: true, department: true, role: true },
          take: 4,
        })
      : Promise.resolve([]),
  ]);

  const results = [
    ...tickets.map((t) => ({
      type: "ticket" as const,
      id: t.id,
      title: t.title,
      subtitle: `${t.status} · ${t.priority}`,
      url: `/tickets/${t.id}`,
    })),
    ...features.map((f) => ({
      type: "peticion" as const,
      id: f.id,
      title: f.title,
      subtitle: `${f.status} · ${f.voteCount} votos`,
      url: `/peticiones/${f.id}`,
    })),
    ...faqs.map((f) => ({
      type: "faq" as const,
      id: f.id,
      title: f.question,
      subtitle: f.category ?? "FAQ",
      url: `/faq#${f.id}`,
    })),
    ...(users as any[]).map((u) => ({
      type: "usuario" as const,
      id: u.id,
      title: u.name,
      subtitle: u.email,
      url: `/admin/usuarios`,
    })),
  ];

  return NextResponse.json({ results });
}
