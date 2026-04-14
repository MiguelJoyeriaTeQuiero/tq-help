import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? "TQ-HELP <noreply@example.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ── Bienvenida / credenciales ──────────────────────────────────────────────

export async function sendWelcomeEmail(
  email: string,
  name: string,
  tempPassword: string
) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Bienvenido/a a TQ-HELP — Tus credenciales de acceso",
    html: `
      <h2>Hola, ${name}</h2>
      <p>Tu cuenta en <strong>TQ-HELP</strong> ha sido creada.</p>
      <p><strong>Email:</strong> ${email}<br/>
         <strong>Contraseña temporal:</strong> ${tempPassword}</p>
      <p>Deberás cambiar tu contraseña al iniciar sesión por primera vez.</p>
      <p><a href="${APP_URL}/login">Acceder a TQ-HELP →</a></p>
    `,
  });
}

// ── Ticket actualizado ─────────────────────────────────────────────────────

export async function sendTicketUpdateEmail(
  email: string,
  name: string,
  ticketId: string,
  ticketTitle: string,
  newStatus: string,
  message?: string
) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Tu incidencia ha sido actualizada — ${ticketTitle}`,
    html: `
      <h2>Hola, ${name}</h2>
      <p>Tu incidencia <strong>"${ticketTitle}"</strong> ha cambiado de estado a <strong>${newStatus}</strong>.</p>
      ${message ? `<p>${message}</p>` : ""}
      <p><a href="${APP_URL}/tickets/${ticketId}">Ver incidencia →</a></p>
    `,
  });
}

// ── Petición de funcionalidad actualizada ──────────────────────────────────

export async function sendFeatureUpdateEmail(
  email: string,
  name: string,
  featureId: string,
  featureTitle: string,
  newStatus: string
) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Petición actualizada — ${featureTitle}`,
    html: `
      <h2>Hola, ${name}</h2>
      <p>La petición <strong>"${featureTitle}"</strong> que sigues ha cambiado de estado a <strong>${newStatus}</strong>.</p>
      <p><a href="${APP_URL}/roadmap/${featureId}">Ver petición →</a></p>
    `,
  });
}

// ── Nueva incidencia en departamento ──────────────────────────────────────

export async function sendNewTicketAlertEmail(
  email: string,
  name: string,
  ticketId: string,
  ticketTitle: string,
  priority: string,
  originDept: string
) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `[${priority}] Nueva incidencia asignada a tu departamento`,
    html: `
      <h2>Nueva incidencia recibida</h2>
      <p><strong>${ticketTitle}</strong></p>
      <p>Prioridad: <strong>${priority}</strong> | Origen: ${originDept}</p>
      <p><a href="${APP_URL}/admin/tickets/${ticketId}">Gestionar incidencia →</a></p>
    `,
  });
}

// ── SLA en riesgo ─────────────────────────────────────────────────────────

export async function sendSlaWarningEmail(
  email: string,
  name: string,
  ticketId: string,
  ticketTitle: string,
  deadline: Date
) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `⚠️ SLA en riesgo — ${ticketTitle}`,
    html: `
      <h2>Hola, ${name}</h2>
      <p>La incidencia <strong>"${ticketTitle}"</strong> debe resolverse antes de las <strong>${deadline.toLocaleString("es-ES")}</strong>.</p>
      <p><a href="${APP_URL}/admin/tickets/${ticketId}">Ver incidencia →</a></p>
    `,
  });
}
