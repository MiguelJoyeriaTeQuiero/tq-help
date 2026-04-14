import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando seed...");

  // ── SLA policies ──────────────────────────────────────────────────────────
  await prisma.slaPolicy.upsert({
    where: { priority: "CRITICA" },
    update: {},
    create: { priority: "CRITICA", resolutionMinutes: 240, escalateTo: "SUPERADMIN" },
  });
  await prisma.slaPolicy.upsert({
    where: { priority: "ALTA" },
    update: {},
    create: { priority: "ALTA", resolutionMinutes: 480, escalateTo: "DEPT_ADMIN" },
  });
  await prisma.slaPolicy.upsert({
    where: { priority: "MEDIA" },
    update: {},
    create: { priority: "MEDIA", resolutionMinutes: 4320, escalateTo: "DEPT_ADMIN" },
  });
  await prisma.slaPolicy.upsert({
    where: { priority: "BAJA" },
    update: {},
    create: { priority: "BAJA", resolutionMinutes: 7200, escalateTo: "DEPT_ADMIN" },
  });

  // ── Etiquetas ─────────────────────────────────────────────────────────────
  const tags = await Promise.all([
    prisma.tag.upsert({ where: { name: "bug" }, update: {}, create: { name: "bug", color: "#ef4444" } }),
    prisma.tag.upsert({ where: { name: "ux" }, update: {}, create: { name: "ux", color: "#8b5cf6" } }),
    prisma.tag.upsert({ where: { name: "rendimiento" }, update: {}, create: { name: "rendimiento", color: "#f59e0b" } }),
    prisma.tag.upsert({ where: { name: "facturación" }, update: {}, create: { name: "facturación", color: "#10b981" } }),
    prisma.tag.upsert({ where: { name: "seguridad" }, update: {}, create: { name: "seguridad", color: "#ef4444" } }),
    prisma.tag.upsert({ where: { name: "integración" }, update: {}, create: { name: "integración", color: "#6366f1" } }),
  ]);

  const tagMap = Object.fromEntries(tags.map((t) => [t.name, t]));

  // ── Usuarios ──────────────────────────────────────────────────────────────
  const hash = (pw: string) => bcrypt.hash(pw, 12);

  const superadmin = await prisma.user.upsert({
    where: { email: "admin@empresa.com" },
    update: {},
    create: {
      name: "Admin Sistema",
      email: "admin@empresa.com",
      passwordHash: await hash("Admin123!"),
      role: "SUPERADMIN",
      department: "IT",
      mustChangePassword: false,
    },
  });

  const itAdmin = await prisma.user.upsert({
    where: { email: "it.admin@empresa.com" },
    update: {},
    create: {
      name: "Carlos IT Admin",
      email: "it.admin@empresa.com",
      passwordHash: await hash("Admin123!"),
      role: "DEPT_ADMIN",
      department: "IT",
      mustChangePassword: false,
    },
  });

  const rrhhAdmin = await prisma.user.upsert({
    where: { email: "rrhh@empresa.com" },
    update: {},
    create: {
      name: "Ana García (RRHH)",
      email: "rrhh@empresa.com",
      passwordHash: await hash("Admin123!"),
      role: "DEPT_ADMIN",
      department: "RRHH",
      mustChangePassword: false,
    },
  });

  const direccion = await prisma.user.upsert({
    where: { email: "ceo@empresa.com" },
    update: {},
    create: {
      name: "María Directora",
      email: "ceo@empresa.com",
      passwordHash: await hash("Admin123!"),
      role: "VIEWER",
      department: "DIRECCION",
      mustChangePassword: false,
    },
  });

  const marketing = await prisma.user.upsert({
    where: { email: "marketing@empresa.com" },
    update: {},
    create: {
      name: "Lucía López",
      email: "marketing@empresa.com",
      passwordHash: await hash("User123!"),
      role: "EMPLOYEE",
      department: "MARKETING",
      mustChangePassword: false,
    },
  });

  const logistica = await prisma.user.upsert({
    where: { email: "logistica@empresa.com" },
    update: {},
    create: {
      name: "Pedro Fernández",
      email: "logistica@empresa.com",
      passwordHash: await hash("User123!"),
      role: "EMPLOYEE",
      department: "LOGISTICA",
      mustChangePassword: false,
    },
  });

  const contabilidad = await prisma.user.upsert({
    where: { email: "contabilidad@empresa.com" },
    update: {},
    create: {
      name: "Rosa Martínez",
      email: "contabilidad@empresa.com",
      passwordHash: await hash("User123!"),
      role: "EMPLOYEE",
      department: "CONTABILIDAD",
      mustChangePassword: false,
    },
  });

  const producto = await prisma.user.upsert({
    where: { email: "producto@empresa.com" },
    update: {},
    create: {
      name: "Javier Ruiz",
      email: "producto@empresa.com",
      passwordHash: await hash("User123!"),
      role: "EMPLOYEE",
      department: "PRODUCTO",
      mustChangePassword: false,
    },
  });

  console.log("✅ Usuarios creados");

  // ── Tickets de ejemplo ────────────────────────────────────────────────────
  const now = new Date();

  const t1 = await prisma.ticket.create({
    data: {
      title: "El ERP no carga en Chrome para Mac",
      description: "Desde la última actualización, el módulo de facturación no carga en Chrome versión 120 en macOS. En Windows funciona correctamente. El error en consola es: TypeError: Cannot read property 'render' of undefined.",
      priority: "ALTA",
      status: "EN_PROGRESO",
      originDept: "MARKETING",
      targetDept: "IT",
      authorId: marketing.id,
      assigneeId: itAdmin.id,
      slaDeadline: new Date(now.getTime() + 8 * 60 * 60 * 1000),
      tags: { create: [{ tagId: tagMap["bug"].id }] },
    },
  });
  await prisma.ticketStatusHistory.createMany({
    data: [
      { ticketId: t1.id, toStatus: "ABIERTO" },
      { ticketId: t1.id, fromStatus: "ABIERTO", toStatus: "EN_PROGRESO" },
    ],
  });
  await prisma.comment.create({
    data: {
      ticketId: t1.id,
      authorId: itAdmin.id,
      content: "He reproducido el error. Parece ser un problema con el polyfill de ES2022. Estoy investigando.",
      isInternal: false,
    },
  });
  await prisma.comment.create({
    data: {
      ticketId: t1.id,
      authorId: itAdmin.id,
      content: "Nota interna: revisar la versión de Babel en el build. Posible conflicto con la dependencia @erp/core v3.2.1",
      isInternal: true,
    },
  });

  const t2 = await prisma.ticket.create({
    data: {
      title: "Nóminas de diciembre no se han generado",
      description: "El proceso automático de generación de nóminas que corre cada día 25 no se ejecutó en diciembre. Los empleados no han recibido su nómina. URGENTE.",
      priority: "CRITICA",
      status: "ABIERTO",
      originDept: "RRHH",
      targetDept: "IT",
      authorId: rrhhAdmin.id,
      slaDeadline: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      slaBreached: false,
      tags: { create: [{ tagId: tagMap["bug"].id }, { tagId: tagMap["facturación"].id }] },
    },
  });
  await prisma.ticketStatusHistory.create({ data: { ticketId: t2.id, toStatus: "ABIERTO" } });

  const t3 = await prisma.ticket.create({
    data: {
      title: "Informe de ventas tarda más de 5 minutos en cargar",
      description: "El informe de ventas mensual ha empezado a tardar más de 5 minutos desde que se añadieron las nuevas columnas de margen. Antes tardaba menos de 30 segundos.",
      priority: "MEDIA",
      status: "ABIERTO",
      originDept: "CONTABILIDAD",
      targetDept: "IT",
      authorId: contabilidad.id,
      slaDeadline: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      tags: { create: [{ tagId: tagMap["rendimiento"].id }] },
    },
  });
  await prisma.ticketStatusHistory.create({ data: { ticketId: t3.id, toStatus: "ABIERTO" } });

  const t4 = await prisma.ticket.create({
    data: {
      title: "Los albaranes de logística no se sincronizan con el ERP",
      description: "Desde el miércoles, los albaranes que se crean en el sistema de almacén no aparecen en el ERP. Tenemos que introducirlos a mano y eso genera el doble de trabajo.",
      priority: "ALTA",
      status: "RESUELTO",
      originDept: "LOGISTICA",
      targetDept: "IT",
      authorId: logistica.id,
      slaDeadline: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      resolvedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      tags: { create: [{ tagId: tagMap["integración"].id }] },
    },
  });
  await prisma.ticketStatusHistory.createMany({
    data: [
      { ticketId: t4.id, toStatus: "ABIERTO" },
      { ticketId: t4.id, fromStatus: "ABIERTO", toStatus: "EN_PROGRESO" },
      { ticketId: t4.id, fromStatus: "EN_PROGRESO", toStatus: "RESUELTO" },
    ],
  });
  await prisma.comment.create({
    data: { ticketId: t4.id, authorId: itAdmin.id, content: "Resuelto. El webhook del almacén tenía una URL incorrecta tras el despliegue del jueves. Corregida y verificada la sincronización.", isInternal: false },
  });

  console.log("✅ Tickets creados");

  // ── Peticiones de funcionalidad ───────────────────────────────────────────
  const f1 = await prisma.featureRequest.create({
    data: {
      title: "Dashboard personalizable por departamento",
      description: "Cada departamento debería poder configurar qué métricas y KPIs quiere ver en su pantalla de inicio del ERP. Ahora todos vemos lo mismo y la mayoría de widgets no son relevantes.",
      status: "EN_REVISION",
      originDept: "MARKETING",
      targetDept: "IT",
      authorId: marketing.id,
      voteCount: 14,
      tags: { create: [{ tagId: tagMap["ux"].id }] },
    },
  });
  await prisma.featureStatusHistory.createMany({
    data: [
      { featureId: f1.id, toStatus: "PENDIENTE" },
      { featureId: f1.id, fromStatus: "PENDIENTE", toStatus: "EN_REVISION" },
    ],
  });

  const f2 = await prisma.featureRequest.create({
    data: {
      title: "Exportación de informes en formato Excel",
      description: "Necesitamos poder exportar todos los informes del ERP en formato .xlsx. Actualmente solo tenemos PDF y eso dificulta trabajar con los datos.",
      status: "EN_DESARROLLO",
      originDept: "CONTABILIDAD",
      targetDept: "IT",
      authorId: contabilidad.id,
      voteCount: 22,
      tags: { create: [{ tagId: tagMap["facturación"].id }] },
    },
  });
  await prisma.featureStatusHistory.createMany({
    data: [
      { featureId: f2.id, toStatus: "PENDIENTE" },
      { featureId: f2.id, fromStatus: "PENDIENTE", toStatus: "EN_REVISION" },
      { featureId: f2.id, fromStatus: "EN_REVISION", toStatus: "EN_DESARROLLO" },
    ],
  });

  const f3 = await prisma.featureRequest.create({
    data: {
      title: "App móvil para gestión de almacén",
      description: "Los operarios de logística trabajan en la nave con tablets/móviles y necesitan una versión responsive o app nativa para registrar entradas y salidas de stock sin volver a la oficina.",
      status: "PENDIENTE",
      originDept: "LOGISTICA",
      targetDept: "IT",
      authorId: logistica.id,
      voteCount: 18,
    },
  });
  await prisma.featureStatusHistory.create({ data: { featureId: f3.id, toStatus: "PENDIENTE" } });

  const f4 = await prisma.featureRequest.create({
    data: {
      title: "Módulo de vacaciones y ausencias integrado",
      description: "Ahora gestionamos las vacaciones en una hoja de Excel aparte. Necesitamos que el ERP tenga un módulo de RRHH donde los empleados puedan solicitar días, y los managers aprobarlos.",
      status: "PENDIENTE",
      originDept: "RRHH",
      targetDept: "IT",
      authorId: rrhhAdmin.id,
      voteCount: 31,
      tags: { create: [{ tagId: tagMap["ux"].id }] },
    },
  });
  await prisma.featureStatusHistory.create({ data: { featureId: f4.id, toStatus: "PENDIENTE" } });

  const f5 = await prisma.featureRequest.create({
    data: {
      title: "Notificaciones por WhatsApp para pedidos urgentes",
      description: "Cuando un pedido se marca como urgente, además del email queremos recibir una notificación por WhatsApp. Hay APIs disponibles (Twilio, etc.).",
      status: "DESCARTADO",
      originDept: "LOGISTICA",
      targetDept: "IT",
      authorId: logistica.id,
      voteCount: 5,
    },
  });

  // Votos de ejemplo
  await prisma.vote.createMany({
    data: [
      { userId: contabilidad.id, featureId: f1.id },
      { userId: logistica.id, featureId: f1.id },
      { userId: rrhhAdmin.id, featureId: f1.id },
      { userId: producto.id, featureId: f2.id },
      { userId: marketing.id, featureId: f4.id },
      { userId: logistica.id, featureId: f4.id },
      { userId: contabilidad.id, featureId: f4.id },
    ],
    skipDuplicates: true,
  });

  await prisma.featureComment.create({
    data: {
      featureId: f2.id,
      authorId: itAdmin.id,
      content: "Vamos a usar la librería ExcelJS. Estimamos tenerlo listo en 2 semanas.",
      isInternal: false,
    },
  });

  console.log("✅ Peticiones de funcionalidad creadas");

  // ── Denuncia de ejemplo ───────────────────────────────────────────────────
  const existingComplaint = await prisma.complaint.findUnique({ where: { trackingCode: "ABCD-1234" } });
  if (!existingComplaint) {
    const complaint = await prisma.complaint.create({
      data: {
        trackingCode: "ABCD-1234",
        category: "CONFLICTO_INTERESES",
        description: "He observado que un proveedor de material de oficina con el que tenemos contrato parece tener vínculos familiares con la persona que gestiona las compras en nuestro departamento. Los precios que pagamos parecen superiores a los del mercado.",
        status: "EN_INVESTIGACION",
      },
    });
    await prisma.complaintStatusHistory.createMany({
      data: [
        { complaintId: complaint.id, toStatus: "RECIBIDA" },
        { complaintId: complaint.id, fromStatus: "RECIBIDA", toStatus: "EN_INVESTIGACION" },
      ],
    });
    await prisma.complaintNote.create({
      data: { complaintId: complaint.id, content: "Iniciada revisión de contratos de los últimos 2 años con este proveedor." },
    });
  }

  console.log("✅ Denuncia de ejemplo creada");

  console.log("\n🎉 Seed completado!\n");
  console.log("Usuarios de prueba:");
  console.log("  admin@empresa.com     / Admin123!  (Superadmin)");
  console.log("  it.admin@empresa.com  / Admin123!  (Admin IT)");
  console.log("  rrhh@empresa.com      / Admin123!  (Admin RRHH)");
  console.log("  ceo@empresa.com       / Admin123!  (Viewer Dirección)");
  console.log("  marketing@empresa.com / User123!   (Empleado Marketing)");
  console.log("  logistica@empresa.com / User123!   (Empleado Logística)");
  console.log("  contabilidad@empresa.com / User123! (Empleado Contabilidad)");
  console.log("  producto@empresa.com  / User123!   (Empleado Producto)");
  console.log("\nDenuncia de prueba — código: ABCD-1234");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
