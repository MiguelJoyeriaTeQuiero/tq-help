/**
 * TQ-HELP — Prueba de estrés con k6
 * ─────────────────────────────────────────────────────────────────────────────
 * Uso:
 *   .\k6.exe run tests\stress\stress-test.js
 *   .\k6.exe run tests\stress\stress-test.js -e BASE_URL=https://tu-app.vercel.app
 *   .\k6.exe run tests\stress\stress-test.js -e SCENARIO=smoke
 *   .\k6.exe run tests\stress\stress-test.js -e SCENARIO=load
 *   .\k6.exe run tests\stress\stress-test.js -e SCENARIO=stress
 *   .\k6.exe run tests\stress\stress-test.js -e SCENARIO=spike
 *
 * Variables de entorno:
 *   BASE_URL     URL base de la app  (por defecto: http://localhost:3000)
 *   TEST_EMAIL   Email de usuario de prueba (necesita existir en la BD)
 *   TEST_PASSWORD Contraseña
 *   SCENARIO     smoke | load | stress | spike  (por defecto: load)
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL     = __ENV.BASE_URL     || "http://localhost:3000";
const TEST_EMAIL   = __ENV.TEST_EMAIL   || "";
const TEST_PASS    = __ENV.TEST_PASSWORD || "";
const SCENARIO     = __ENV.SCENARIO     || "load";

// ── Métricas personalizadas ───────────────────────────────────────────────────
const authErrors   = new Counter("auth_errors");
const apiErrors    = new Counter("api_errors");
const errorRate    = new Rate("error_rate");
const ticketsTrend = new Trend("tickets_list_duration", true);
const healthTrend  = new Trend("health_duration", true);
const notifTrend   = new Trend("notifications_duration", true);

// ── Escenarios ────────────────────────────────────────────────────────────────
const SCENARIOS = {
  /**
   * Smoke — 1 VU, 1 min
   * ¿Arranca todo? ¿Hay errores básicos?
   */
  smoke: {
    stages: [
      { duration: "30s", target: 1 },
      { duration: "30s", target: 1 },
      { duration: "10s", target: 0 },
    ],
  },

  /**
   * Load — carga normal esperada
   * Simula ~10 usuarios concurrentes navegando a la vez
   */
  load: {
    stages: [
      { duration: "30s", target: 5  },   // calentamiento
      { duration: "2m",  target: 10 },   // carga sostenida
      { duration: "30s", target: 15 },   // pico moderado
      { duration: "1m",  target: 10 },   // vuelta a normal
      { duration: "20s", target: 0  },   // enfriamiento
    ],
  },

  /**
   * Stress — busca el punto de ruptura
   * Sube hasta 50 VUs para ver cuándo aparecen errores / latencias altas
   */
  stress: {
    stages: [
      { duration: "30s", target: 10 },
      { duration: "1m",  target: 20 },
      { duration: "1m",  target: 35 },
      { duration: "1m",  target: 50 },
      { duration: "30s", target: 0  },
    ],
  },

  /**
   * Spike — tráfico repentino (lunes por la mañana, proveedor...)
   * 0 → 80 VUs en 10 s, luego vuelve a calma
   */
  spike: {
    stages: [
      { duration: "10s", target: 3  },   // base tranquila
      { duration: "10s", target: 80 },   // spike brusco
      { duration: "1m",  target: 80 },   // aguanta la carga
      { duration: "10s", target: 3  },   // bajada
      { duration: "20s", target: 0  },
    ],
  },
};

// ── Umbrales de calidad ───────────────────────────────────────────────────────
export const options = {
  stages: SCENARIOS[SCENARIO]?.stages ?? SCENARIOS.load.stages,

  thresholds: {
    // 95% de peticiones < 2 s, 99% < 5 s
    http_req_duration:        ["p(95)<2000", "p(99)<5000"],
    // Tasa de fallos HTTP < 5 %
    http_req_failed:          ["rate<0.05"],
    // Métricas propias por ruta
    health_duration:          ["p(95)<500"],   // salud debe ser rápida siempre
    tickets_list_duration:    ["p(95)<2500"],
    notifications_duration:   ["p(95)<2000"],
    // Errores de negocio tolerables
    error_rate:               ["rate<0.05"],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function tag(name) {
  return { tags: { name } };
}

function jsonOrNull(res) {
  try   { return JSON.parse(res.body); }
  catch { return null; }
}

// ── Setup: autenticación (una sola vez por test, compartida) ──────────────────
export function setup() {
  if (!TEST_EMAIL || !TEST_PASS) {
    console.warn(
      "[WARN] TEST_EMAIL / TEST_PASSWORD no definidos. " +
      "Solo se probarán endpoints públicos (health). " +
      "Pasa -e TEST_EMAIL=... -e TEST_PASSWORD=... para pruebas autenticadas."
    );
    return { cookies: null };
  }

  // 1. Obtener CSRF token (NextAuth lo exige)
  const csrfRes = http.get(`${BASE_URL}/api/auth/csrf`, { tags: { name: "auth_csrf" } });
  if (csrfRes.status !== 200) {
    console.error(`[ERROR] No se pudo obtener CSRF token: ${csrfRes.status}`);
    authErrors.add(1);
    return { cookies: null };
  }

  const csrf = jsonOrNull(csrfRes);
  if (!csrf?.csrfToken) {
    console.error("[ERROR] Respuesta CSRF sin token");
    authErrors.add(1);
    return { cookies: null };
  }

  // 2. Login con credentials provider
  const loginBody = `csrfToken=${encodeURIComponent(csrf.csrfToken)}&email=${encodeURIComponent(TEST_EMAIL)}&password=${encodeURIComponent(TEST_PASS)}&redirect=false&callbackUrl=${encodeURIComponent(BASE_URL)}&json=true`;

  const loginRes = http.post(
    `${BASE_URL}/api/auth/callback/credentials`,
    loginBody,
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      redirects: 5,
      tags: { name: "auth_login" },
    }
  );

  // NextAuth devuelve 200 o redirige al callback con la cookie de sesión
  const sessionCookie =
    loginRes.cookies["next-auth.session-token"]?.[0]?.value ||
    loginRes.cookies["__Secure-next-auth.session-token"]?.[0]?.value;

  if (!sessionCookie) {
    console.error(`[ERROR] Login fallido (status ${loginRes.status}). Verifica credenciales.`);
    authErrors.add(1);
    return { cookies: null };
  }

  console.log("[OK] Login correcto, sesión obtenida");
  return { sessionCookie };
}

// ── Función principal (ejecutada por cada VU en cada iteración) ───────────────
export default function (data) {
  const headers = {};
  if (data?.sessionCookie) {
    // Probamos tanto la cookie segura como la no segura (dev vs prod)
    headers["Cookie"] = `next-auth.session-token=${data.sessionCookie}; __Secure-next-auth.session-token=${data.sessionCookie}`;
  }

  // ── 1. Health (público — siempre se ejecuta) ─────────────────────────────
  group("health", () => {
    const res = http.get(`${BASE_URL}/api/health`, tag("health"));
    const ok  = check(res, {
      "health → 200":       (r) => r.status === 200,
      "health → status ok": (r) => jsonOrNull(r)?.status === "ok",
      "health → db ok":     (r) => jsonOrNull(r)?.db === "ok",
    });
    healthTrend.add(res.timings.duration);
    if (!ok) errorRate.add(1); else errorRate.add(0);
  });

  // Si no hay sesión, los bloques autenticados no tienen sentido
  if (!data?.sessionCookie) {
    sleep(1);
    return;
  }

  // ── 2. Lista de incidencias activas ──────────────────────────────────────
  group("tickets_list", () => {
    const res = http.get(
      `${BASE_URL}/api/tickets?status=ABIERTO,EN_PROGRESO&page=1&limit=10`,
      { headers, ...tag("tickets_list") }
    );
    const ok = check(res, {
      "tickets → 200":        (r) => r.status === 200,
      "tickets → tiene data": (r) => Array.isArray(jsonOrNull(r)?.tickets),
    });
    ticketsTrend.add(res.timings.duration);
    if (!ok) { errorRate.add(1); apiErrors.add(1); } else errorRate.add(0);
  });

  sleep(0.5);

  // ── 3. Histórico ─────────────────────────────────────────────────────────
  group("tickets_historico", () => {
    const res = http.get(
      `${BASE_URL}/api/tickets?status=RESUELTO,CERRADO&page=1&limit=10`,
      { headers, ...tag("tickets_historico") }
    );
    check(res, {
      "historico → 200": (r) => r.status === 200,
    });
    if (res.status !== 200) { errorRate.add(1); apiErrors.add(1); } else errorRate.add(0);
  });

  sleep(0.5);

  // ── 4. Notificaciones ─────────────────────────────────────────────────────
  group("notifications", () => {
    const res = http.get(
      `${BASE_URL}/api/notifications`,
      { headers, ...tag("notifications") }
    );
    const ok = check(res, {
      "notif → 200":        (r) => r.status === 200,
      "notif → es array":   (r) => Array.isArray(jsonOrNull(r)),
    });
    notifTrend.add(res.timings.duration);
    if (!ok) { errorRate.add(1); apiErrors.add(1); } else errorRate.add(0);
  });

  sleep(0.5);

  // ── 5. Pedidos de material ────────────────────────────────────────────────
  group("metal_orders", () => {
    const res = http.get(
      `${BASE_URL}/api/metal-orders?page=1&limit=10`,
      { headers, ...tag("metal_orders") }
    );
    check(res, {
      "metal-orders → 200": (r) => r.status === 200,
    });
    if (res.status !== 200) { errorRate.add(1); apiErrors.add(1); } else errorRate.add(0);
  });

  sleep(0.5);

  // ── 6. Métricas admin (solo en 20% de las iteraciones — petición pesada) ──
  if (Math.random() < 0.2) {
    group("admin_metrics", () => {
      const res = http.get(
        `${BASE_URL}/api/admin/metrics`,
        { headers, ...tag("admin_metrics") }
      );
      check(res, {
        "admin metrics → 200 o 403": (r) => r.status === 200 || r.status === 403,
      });
    });
  }

  // Pausa realista entre acciones de usuario (1-3 s)
  sleep(1 + Math.random() * 2);
}

// ── Teardown: resumen final ───────────────────────────────────────────────────
export function teardown(data) {
  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`  Prueba completada — Escenario: ${SCENARIO.toUpperCase()}`);
  console.log(`  URL: ${BASE_URL}`);
  console.log("  Revisa el resumen de métricas de k6 arriba ↑");
  console.log("═══════════════════════════════════════════════════════\n");
}
