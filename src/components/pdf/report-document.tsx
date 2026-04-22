import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Path,
  Font,
} from "@react-pdf/renderer";

// ── Colores de marca ──────────────────────────────────────────────────────
const COLORS = {
  primary: "#0099f2",
  secondary: "#00557f",
  accent: "#c8a164",
  white: "#ffffff",
  black: "#111111",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate500: "#64748b",
  slate700: "#334155",
  red: "#ef4444",
  green: "#22c55e",
  orange: "#f97316",
  blue: "#3b82f6",
};

// ── Estilos ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { backgroundColor: COLORS.white, fontFamily: "Helvetica", paddingBottom: 50 },

  // Header
  header: {
    backgroundColor: COLORS.primary,
    padding: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "column" },
  headerTitle: { color: COLORS.white, fontSize: 22, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  headerSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 10, marginTop: 4 },
  headerRight: { alignItems: "flex-end" },
  headerPeriod: { color: COLORS.white, fontSize: 9, opacity: 0.9 },
  headerDate: { color: COLORS.white, fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 2 },

  // Accent bar
  accentBar: { height: 4, backgroundColor: COLORS.accent },

  // Body
  body: { padding: "20 28" },

  // Section title
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.secondary,
    borderBottom: `2 solid ${COLORS.primary}`,
    paddingBottom: 4,
    marginBottom: 12,
    marginTop: 20,
  },

  // KPI grid
  kpiGrid: { flexDirection: "row", gap: 10, marginBottom: 4 },
  kpiCard: {
    flex: 1,
    borderRadius: 8,
    padding: "12 14",
    border: `1 solid ${COLORS.slate200}`,
  },
  kpiLabel: { fontSize: 8, color: COLORS.slate500, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  kpiValue: { fontSize: 28, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  kpiSub: { fontSize: 8, color: COLORS.slate500 },

  // Table
  table: { width: "100%" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.secondary,
    padding: "6 10",
    borderRadius: "4 4 0 0",
  },
  tableHeaderCell: { color: COLORS.white, fontSize: 8, fontFamily: "Helvetica-Bold", flex: 1 },
  tableRow: { flexDirection: "row", padding: "7 10", borderBottom: `1 solid ${COLORS.slate100}` },
  tableRowAlt: { flexDirection: "row", padding: "7 10", backgroundColor: COLORS.slate100, borderBottom: `1 solid ${COLORS.slate200}` },
  tableCell: { fontSize: 9, color: COLORS.slate700, flex: 1 },
  tableCellBold: { fontSize: 9, color: COLORS.black, fontFamily: "Helvetica-Bold", flex: 1 },

  // Bar chart
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  barLabel: { fontSize: 9, color: COLORS.slate700, width: 80 },
  barTrack: { flex: 1, height: 14, backgroundColor: COLORS.slate100, borderRadius: 4, marginHorizontal: 8, overflow: "hidden" },
  barFill: { height: 14, borderRadius: 4, backgroundColor: COLORS.primary },
  barValue: { fontSize: 9, color: COLORS.slate700, width: 24, textAlign: "right" },

  // Badge
  badgeGreen: { backgroundColor: "#dcfce7", color: "#166534", borderRadius: 4, padding: "2 6", fontSize: 8 },
  badgeRed: { backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: 4, padding: "2 6", fontSize: 8 },
  badgeBlue: { backgroundColor: "#dbeafe", color: "#1e40af", borderRadius: 4, padding: "2 6", fontSize: 8 },
  badgeOrange: { backgroundColor: "#ffedd5", color: "#9a3412", borderRadius: 4, padding: "2 6", fontSize: 8 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: COLORS.slate100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    borderTop: `2 solid ${COLORS.primary}`,
  },
  footerText: { fontSize: 8, color: COLORS.slate500 },
  footerBrand: { fontSize: 8, color: COLORS.primary, fontFamily: "Helvetica-Bold" },
});

// ── Logo inline ───────────────────────────────────────────────────────────
function LogoPdf({ size = 32 }: { size?: number }) {
  const scale = size / 294.78;
  return (
    <Svg viewBox="0 0 1544.78 294.78" width={1544.78 * scale} height={size}>
      <Path fill={COLORS.white} d="M209.12,66.5v50.2h47.62c6.32,0,11.44,5.12,11.44,11.44h0c0,6.32-5.12,11.44-11.44,11.44h-47.62v52.41h55c6.32,0,11.44,5.12,11.44,11.44h0c0,6.32-5.12,11.44-11.44,11.44h-83.05V43.62h83.05c6.32,0,11.44,5.12,11.44,11.44h0c0,6.32-5.12,11.44-11.44,11.44h-55Z"/>
      <Path fill={COLORS.white} d="M770.05,43.86c7.75,0,14.03,6.28,14.03,14.03v94.99c0,12.96,3.4,22.72,10.21,29.28,6.8,6.56,16.28,9.84,28.42,9.84s21.86-3.28,28.67-9.84c6.8-6.56,10.21-16.32,10.21-29.28V57.89c0-7.75,6.28-14.03,14.03-14.03h0c7.75,0,14.03,6.28,14.03,14.03v94.5c0,13.95-3.04,25.76-9.1,35.43-6.07,9.69-14.19,16.9-24.36,21.66-10.17,4.76-21.41,7.14-33.71,7.14s-23.5-2.38-33.59-7.14c-10.09-4.75-18.09-11.97-23.99-21.66-5.91-9.68-8.86-21.49-8.86-35.43V57.89c0-7.75,6.28-14.03,14.03-14.03h0Z"/>
      <Path fill={COLORS.white} d="M1068.3,66.5v50.2h47.62c6.32,0,11.44,5.12,11.44,11.44h0c0,6.32-5.12,11.45-11.44,11.45h-47.62v52.41h55c6.32,0,11.44,5.12,11.44,11.44h0c0,6.32-5.12,11.44-11.44,11.44h-83.05V43.62h83.05c6.32,0,11.44,5.12,11.44,11.44h0c0,6.32-5.12,11.44-11.44,11.44h-55Z"/>
      <Path fill={COLORS.white} d="M1413.49,205.42c-13.37-7.47-23.96-17.88-31.75-31.25-7.79-13.38-11.69-28.43-11.69-45.16s3.9-31.74,11.69-45.03c7.79-13.29,18.37-23.66,31.75-31.13,13.37-7.47,28.01-11.2,43.92-11.2s30.8,3.73,44.17,11.2c13.37,7.46,23.91,17.84,31.63,31.13,7.7,13.29,11.57,28.3,11.57,45.03s-3.86,31.78-11.57,45.16c-7.72,13.37-18.25,23.79-31.63,31.25-13.37,7.46-28.1,11.2-44.17,11.2s-30.56-3.73-43.92-11.2M1487.68,184.5c8.86-5.17,15.79-12.55,20.79-22.15,5-9.6,7.5-20.71,7.5-33.35s-2.5-23.71-7.5-33.22c-5.01-9.51-11.94-16.82-20.79-21.9-8.86-5.08-18.95-7.63-30.27-7.63s-21.41,2.55-30.27,7.63c-8.86,5.09-15.79,12.39-20.79,21.9-5.01,9.51-7.5,20.59-7.5,33.22s2.5,23.75,7.5,33.35c5.01,9.6,11.94,16.98,20.79,22.15,8.86,5.16,18.95,7.75,30.27,7.75s21.41-2.59,30.27-7.75"/>
      <Path fill={COLORS.white} d="M950.67,71.73v129.14c0,7.75,6.28,14.03,14.03,14.03h0c7.75,0,14.03-6.28,14.03-14.03V43.86h-.19l-27.86,27.86Z"/>
      <Path fill={COLORS.white} d="M119.35,55.18h0c0,6.32-5.12,11.44-11.44,11.44h-34.08v134.12c0,7.75-6.28,14.03-14.03,14.03h0c-7.75,0-14.03-6.28-14.03-14.03V66.62H11.44c-6.32,0-11.44-5.12-11.44-11.44h0c0-6.32,5.12-11.44,11.44-11.44h96.47c6.32,0,11.44,5.12,11.44,11.44Z"/>
      <Path fill={COLORS.white} d="M1229.93,215.85l27.56-27.56,23.5,23.5c2.6,2.6,6.13,4.06,9.8,4.06h0c12.35,0,18.54-14.93,9.8-23.67l-23.5-23.5,22.54-22.54c17.71-17.71,22.76-43.08,13.17-66.22-9.58-23.13-31.09-37.5-56.12-37.5h-60.23v173.42h33.47ZM1224.19,70.16h32.48s0,0,0,0c16.27,0,26.43,10.53,30.51,20.39,4.09,9.85,4.35,24.49-7.15,35.99l-55.84,55.84v-112.21Z"/>
      <Path fill={COLORS.white} d="M665.5,209.76l-12.23-12.23-19.61,19.61,12.23,12.23c34.42,34.42,78.2,55.57,125.6,61.14,3.72.44,9.72.77,15.36,1.01,7.81.33,14.32-5.93,14.32-13.75h0c0-7.4-5.85-13.39-13.24-13.75-4.45-.22-8.86-.59-13.24-1.11-41.21-4.91-79.27-23.23-109.19-53.14"/>
      <Path fill={COLORS.white} d="M671.26,24.02c-32.02-32.03-84.13-32.03-116.15,0l-96.54,96.54c-21.22,21.2-55.73,21.2-76.93,0-21.21-21.21-21.21-55.72,0-76.94,21.2-21.21,55.72-21.21,76.93,0l8.87,8.87c5.41,5.41,14.19,5.42,19.61,0h0c5.42-5.41,5.42-14.19,0-19.61l-8.87-8.87c-32.02-32.03-84.12-32.02-116.15,0-32.02,32.02-32.02,84.13,0,116.15,16.01,16.01,37.04,24.02,58.08,24.02s42.07-8.01,58.08-24.02l52.72-52.72,43.82-43.82c21.21-21.21,55.72-21.21,76.93,0,21.21,21.21,21.21,55.72,0,76.94l-37.68,37.68-8.85-8.85c-5.41-5.41-14.19-5.41-19.61,0h0c-5.41,5.41-5.41,14.19,0,19.61l8.85,8.85-77.73,77.72-67.9-67.9c-9.28,2.51-18.85,3.88-28.64,3.88-2.31,0-4.61-.08-6.91-.22l103.45,103.45,154.62-154.61c32.03-32.02,32.03-84.13,0-116.15"/>
    </Svg>
  );
}

// ── Tipos ─────────────────────────────────────────────────────────────────
interface ReportData {
  from: string;
  to: string;
  totalTickets: number;
  resolvedTickets: number;
  openTickets: number;
  avgResolutionHours: number;
  slaBreaches: number;
  ticketsByDept: { targetDept: string; _count: { id: number } }[];
  ticketsByPriority: { priority: string; _count: { id: number } }[];
  topFeatures: { title: string; voteCount: number; status: string }[];
  generatedAt: string;
}

const DEPT_LABELS: Record<string, string> = {
  IT: "IT", MARKETING: "Marketing", LOGISTICA: "Logística",
  RRHH: "RRHH", CONTABILIDAD: "Contabilidad", PRODUCTO: "Producto", DIRECCION: "Dirección",
};

const PRIORITY_LABELS: Record<string, string> = {
  CRITICA: "Crítica", ALTA: "Alta", MEDIA: "Media", BAJA: "Baja",
};

const FEATURE_STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente", EN_REVISION: "En revisión",
  EN_DESARROLLO: "En desarrollo", COMPLETADO: "Completado", DESCARTADO: "Descartado",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

// ── Documento PDF ─────────────────────────────────────────────────────────
export function ReportDocument({ data }: { data: ReportData }) {
  const maxDept = Math.max(...data.ticketsByDept.map((d) => d._count.id), 1);
  const resolutionRate = data.totalTickets > 0
    ? Math.round((data.resolvedTickets / data.totalTickets) * 100)
    : 0;

  return (
    <Document title={`Informe KPIs — ${data.from} a ${data.to}`} author="TQ-HELP">
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <LogoPdf size={28} />
            <Text style={[s.headerTitle, { marginTop: 8 }]}>Informe de KPIs</Text>
            <Text style={s.headerSubtitle}>Sistema de gestión interna</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerPeriod}>PERÍODO ANALIZADO</Text>
            <Text style={s.headerDate}>{formatDate(data.from)}</Text>
            <Text style={[s.headerPeriod, { marginTop: 2 }]}>al</Text>
            <Text style={s.headerDate}>{formatDate(data.to)}</Text>
          </View>
        </View>
        <View style={s.accentBar} />

        <View style={s.body}>

          {/* ── KPIs principales ── */}
          <Text style={s.sectionTitle}>Resumen del período</Text>
          <View style={s.kpiGrid}>
            <View style={[s.kpiCard, { borderTop: `3 solid ${COLORS.primary}` }]}>
              <Text style={s.kpiLabel}>Incidencias creadas</Text>
              <Text style={[s.kpiValue, { color: COLORS.primary }]}>{data.totalTickets}</Text>
              <Text style={s.kpiSub}>en el período</Text>
            </View>
            <View style={[s.kpiCard, { borderTop: `3 solid ${COLORS.green}` }]}>
              <Text style={s.kpiLabel}>Resueltas</Text>
              <Text style={[s.kpiValue, { color: COLORS.green }]}>{data.resolvedTickets}</Text>
              <Text style={s.kpiSub}>{resolutionRate}% tasa resolución</Text>
            </View>
            <View style={[s.kpiCard, { borderTop: `3 solid ${COLORS.orange}` }]}>
              <Text style={s.kpiLabel}>Abiertas actualmente</Text>
              <Text style={[s.kpiValue, { color: COLORS.orange }]}>{data.openTickets}</Text>
              <Text style={s.kpiSub}>pendientes de resolver</Text>
            </View>
            <View style={[s.kpiCard, { borderTop: `3 solid ${COLORS.accent}` }]}>
              <Text style={s.kpiLabel}>Tiempo medio resolución</Text>
              <Text style={[s.kpiValue, { color: COLORS.accent }]}>{data.avgResolutionHours}h</Text>
              <Text style={s.kpiSub}>últimos 30 días</Text>
            </View>
          </View>

          <View style={[s.kpiGrid, { marginTop: 10 }]}>
            <View style={[s.kpiCard, { borderTop: `3 solid ${COLORS.red}`, flex: 0.5 }]}>
              <Text style={s.kpiLabel}>Incumplimientos SLA</Text>
              <Text style={[s.kpiValue, { color: COLORS.red }]}>{data.slaBreaches}</Text>
              <Text style={s.kpiSub}>tickets vencidos</Text>
            </View>
            <View style={{ flex: 0.5 }} />
            <View style={{ flex: 1 }} />
            <View style={{ flex: 1 }} />
          </View>

          {/* ── Tickets por departamento ── */}
          {data.ticketsByDept.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Incidencias por departamento</Text>
              {data.ticketsByDept
                .sort((a, b) => b._count.id - a._count.id)
                .map((d, i) => (
                  <View key={i} style={s.barRow}>
                    <Text style={s.barLabel}>{DEPT_LABELS[d.targetDept] ?? d.targetDept}</Text>
                    <View style={s.barTrack}>
                      <View style={[s.barFill, { width: `${(d._count.id / maxDept) * 100}%` }]} />
                    </View>
                    <Text style={s.barValue}>{d._count.id}</Text>
                  </View>
                ))}
            </>
          )}

          {/* ── Tickets por prioridad ── */}
          {data.ticketsByPriority.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Distribución por prioridad</Text>
              <View style={s.table}>
                <View style={s.tableHeader}>
                  <Text style={s.tableHeaderCell}>Prioridad</Text>
                  <Text style={s.tableHeaderCell}>Incidencias</Text>
                  <Text style={s.tableHeaderCell}>% del total</Text>
                </View>
                {data.ticketsByPriority
                  .sort((a, b) => {
                    const order = ["CRITICA", "ALTA", "MEDIA", "BAJA"];
                    return order.indexOf(a.priority) - order.indexOf(b.priority);
                  })
                  .map((p, i) => (
                    <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                      <Text style={s.tableCellBold}>{PRIORITY_LABELS[p.priority] ?? p.priority}</Text>
                      <Text style={s.tableCell}>{p._count.id}</Text>
                      <Text style={s.tableCell}>
                        {data.totalTickets > 0 ? Math.round((p._count.id / data.totalTickets) * 100) : 0}%
                      </Text>
                    </View>
                  ))}
              </View>
            </>
          )}

        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Generado el {formatDate(data.generatedAt)}</Text>
          <Text style={s.footerBrand}>TQ-HELP — Sistema de gestión interna</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>

      {/* ── Página 2: Peticiones ── */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <LogoPdf size={28} />
            <Text style={[s.headerTitle, { marginTop: 8 }]}>Peticiones</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerPeriod}>{formatDate(data.from)} — {formatDate(data.to)}</Text>
          </View>
        </View>
        <View style={s.accentBar} />

        <View style={s.body}>

          {/* ── Top peticiones ── */}
          {data.topFeatures.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Peticiones más votadas</Text>
              <View style={s.table}>
                <View style={s.tableHeader}>
                  <Text style={[s.tableHeaderCell, { flex: 3 }]}>Petición</Text>
                  <Text style={s.tableHeaderCell}>Votos</Text>
                  <Text style={s.tableHeaderCell}>Estado</Text>
                </View>
                {data.topFeatures.slice(0, 10).map((f, i) => (
                  <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                    <Text style={[s.tableCellBold, { flex: 3 }]}>{f.title}</Text>
                    <Text style={[s.tableCell, { color: COLORS.primary }]}>{f.voteCount}</Text>
                    <Text style={s.tableCell}>{FEATURE_STATUS_LABELS[f.status] ?? f.status}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ── Nota legal ── */}
          <View style={{ marginTop: 30, padding: 14, backgroundColor: COLORS.slate100, borderRadius: 6, borderLeft: `3 solid ${COLORS.accent}` }}>
            <Text style={{ fontSize: 8, color: COLORS.slate500, lineHeight: 1.6 }}>
              Este informe es confidencial y de uso interno exclusivo. TQ-HELP — {new Date().getFullYear()}.
            </Text>
          </View>

        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Generado el {formatDate(data.generatedAt)}</Text>
          <Text style={s.footerBrand}>TQ-HELP — Sistema de gestión interna</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
