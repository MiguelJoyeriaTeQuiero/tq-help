/**
 * Seed de PRODUCCIÓN — datos mínimos y reales para el lanzamiento.
 *
 * A diferencia de `seed.ts` (datos de demo para desarrollo), este script
 * solo crea configuración real y NO mete tickets, peticiones ni usuarios
 * ficticios. Es idempotente (usa upsert): se puede ejecutar varias veces
 * sin duplicar nada.
 *
 * Ejecutar:  npm run db:seed:prod
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── Configura aquí el administrador real ──────────────────────────────────
const ADMIN_EMAIL = "Miguelrodriguez@joyeriatequiero.com";
const ADMIN_NAME = "Miguel Rodríguez";
const ADMIN_DEPARTMENT = "IT";
// Contraseña temporal: se obliga a cambiarla en el primer login.
const ADMIN_TEMP_PASSWORD = "TQHelp-Cambiar-2026!";

async function main() {
  console.log("🌱 Seed de PRODUCCIÓN…");

  // ── Políticas SLA ─────────────────────────────────────────────────────────
  const slaPolicies = [
    { priority: "CRITICA", resolutionMinutes: 240, escalateTo: "SUPERADMIN" },
    { priority: "ALTA", resolutionMinutes: 480, escalateTo: "DEPT_ADMIN" },
    { priority: "MEDIA", resolutionMinutes: 4320, escalateTo: "DEPT_ADMIN" },
    { priority: "BAJA", resolutionMinutes: 7200, escalateTo: "DEPT_ADMIN" },
  ] as const;
  for (const p of slaPolicies) {
    await prisma.slaPolicy.upsert({
      where: { priority: p.priority },
      update: {},
      create: { priority: p.priority, resolutionMinutes: p.resolutionMinutes, escalateTo: p.escalateTo },
    });
  }
  console.log(`  ✓ ${slaPolicies.length} políticas SLA`);

  // ── Etiquetas ───────────────────────────────────────────────────────────────
  const tags = [
    { name: "bug", color: "#ef4444" },
    { name: "ux", color: "#8b5cf6" },
    { name: "rendimiento", color: "#f59e0b" },
    { name: "facturación", color: "#10b981" },
    { name: "seguridad", color: "#ef4444" },
    { name: "integración", color: "#6366f1" },
  ];
  for (const t of tags) {
    await prisma.tag.upsert({ where: { name: t.name }, update: {}, create: t });
  }
  console.log(`  ✓ ${tags.length} etiquetas`);

  // ── Administrador real ──────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_TEMP_PASSWORD, 12),
      role: "SUPERADMIN",
      department: ADMIN_DEPARTMENT,
      mustChangePassword: true,
    },
  });
  console.log(`  ✓ Admin: ${ADMIN_EMAIL} (contraseña temporal — se pedirá cambiarla)`);

  console.log("✅ Seed de producción completado.");
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed de producción:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
