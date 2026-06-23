/**
 * Seed de PRODUCTOS — vuelca el catálogo histórico (hardcodeado en
 * src/lib/metal-families.ts) al nuevo modelo Product.
 *
 * Idempotente: usa el índice único (family, name). Se puede ejecutar varias
 * veces; no duplica productos ni pisa el stock/foto ya gestionados por
 * logística (solo crea los que falten).
 *
 * Ejecutar:  npm run db:seed:products
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { MATERIAL_CATALOG } from "../src/lib/metal-families";
import type { MetalFamily } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seed de productos (catálogo de material)…");

  let created = 0;
  let skipped = 0;

  for (const family of Object.keys(MATERIAL_CATALOG) as MetalFamily[]) {
    for (const name of MATERIAL_CATALOG[family]) {
      const existing = await prisma.product.findUnique({
        where: { family_name: { family, name } },
      });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.product.create({
        data: { name, family, stock: 0, active: true },
      });
      created++;
    }
  }

  console.log(`  ✓ ${created} productos creados, ${skipped} ya existentes`);
  console.log("✅ Seed de productos completado.");
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed de productos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
