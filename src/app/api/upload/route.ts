import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { captureError } from "@/lib/observability";

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "video/mp4", "video/quicktime", "video/webm",
  "application/pdf",
];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "El almacenamiento de archivos no está configurado (falta BLOB_READ_WRITE_TOKEN)" },
      { status: 503 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Archivo demasiado grande (máx 50 MB)" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
  }

  const ext = file.name.split(".").pop();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    const blob = await put(filename, file, { access: "public" });
    return NextResponse.json({
      url: blob.url,
      storageKey: blob.url,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
    });
  } catch (err) {
    await captureError(err, { scope: "POST /api/upload" });
    const message = err instanceof Error ? err.message : "Error al subir el archivo";
    return NextResponse.json({ error: `No se pudo subir el archivo: ${message}` }, { status: 502 });
  }
}
