import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // En producción (Vercel): apunta al Transaction Pooler de Supabase (puerto 6543)
    // En local: puede apuntar a la URL directa o al pooler
    url: process.env.DATABASE_URL!,
    // Conexión directa (sin pooler) — solo para migraciones: prisma db push / migrate deploy
    directUrl: process.env.DIRECT_URL,
  },
});
