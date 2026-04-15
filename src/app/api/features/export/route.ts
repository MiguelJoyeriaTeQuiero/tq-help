import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { getDeptLabel, FEATURE_STATUS_LABELS } from "@/lib/utils";
import { format } from "date-fns";

function csv(val: unknown): string {
  const s = String(val ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isAdmin(session.user)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const features = await prisma.featureRequest.findMany({
    include: {
      author:   { select: { name: true, email: true } },
      tags:     { include: { tag: true } },
      _count:   { select: { votes: true } },
    },
    orderBy: { voteCount: "desc" },
  });

  const headers = [
    "ID", "Título", "Estado", "Votos", "Departamento destino",
    "Autor", "Email autor", "Etiquetas", "Creado",
  ];

  const rows = features.map((f) =>
    [
      f.id.slice(-8).toUpperCase(),
      f.title,
      FEATURE_STATUS_LABELS[f.status] ?? f.status,
      f.voteCount,
      Array.isArray(f.targetDept) ? (f.targetDept as string[]).map(getDeptLabel).join("; ") : f.targetDept ? getDeptLabel(f.targetDept as string) : "",
      f.author?.name ?? "",
      f.author?.email ?? "",
      (f.tags as any[]).map((tt) => tt.tag.name).join("; "),
      format(f.createdAt, "dd/MM/yyyy HH:mm"),
    ]
      .map(csv)
      .join(",")
  );

  const content = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="peticiones-${format(new Date(), "yyyy-MM-dd")}.csv"`,
    },
  });
}
