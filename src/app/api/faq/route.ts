import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  category: z.string().optional(),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

// Public GET
export async function GET(req: NextRequest) {
  const all = new URL(req.url).searchParams.get("all") === "1";

  const items = await prisma.faqItem.findMany({
    where: all ? {} : { isActive: true },
    orderBy: [{ category: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["SUPERADMIN", "DEPT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const item = await prisma.faqItem.create({
    data: { ...parsed.data, createdById: session.user.id },
  });
  return NextResponse.json(item, { status: 201 });
}
