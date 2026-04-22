import {
  Document, Page, Text, View, StyleSheet, Svg, Path,
} from "@react-pdf/renderer";
import { METAL_FAMILY_LABELS } from "@/lib/metal-families";
import type { MetalFamily } from "@prisma/client";

const COLORS = {
  primary:  "#6366f1",   // indigo
  red:      "#ef4444",
  slate700: "#334155",
  slate500: "#64748b",
  slate200: "#e2e8f0",
  slate100: "#f1f5f9",
  white:    "#ffffff",
  black:    "#111111",
};

const s = StyleSheet.create({
  page: { backgroundColor: COLORS.white, fontFamily: "Helvetica", paddingBottom: 50 },

  header: {
    backgroundColor: COLORS.primary,
    padding: "20 28",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle:    { color: COLORS.white, fontSize: 18, fontFamily: "Helvetica-Bold" },
  headerSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 9, marginTop: 3 },
  headerRight:    { alignItems: "flex-end" },
  headerMeta:     { color: COLORS.white, fontSize: 9, opacity: 0.9 },
  headerDate:     { color: COLORS.white, fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 2 },

  accentBar: { height: 3, backgroundColor: COLORS.red },

  body:  { padding: "18 28" },

  // Info del pedido
  infoBox: {
    flexDirection: "row",
    gap: 16,
    backgroundColor: COLORS.slate100,
    borderRadius: 6,
    padding: "10 14",
    marginBottom: 16,
  },
  infoItem:  { flex: 1 },
  infoLabel: { fontSize: 7, color: COLORS.slate500, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  infoValue: { fontSize: 10, color: COLORS.slate700, fontFamily: "Helvetica-Bold" },

  // Aviso
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    border: `1 solid #fecaca`,
    borderRadius: 6,
    padding: "8 12",
    marginBottom: 14,
    gap: 8,
  },
  alertText: { fontSize: 9, color: COLORS.red, flex: 1, lineHeight: 1.5 },

  // Tabla
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.slate700,
    borderBottom: `2 solid ${COLORS.primary}`,
    paddingBottom: 4,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.slate700,
    padding: "5 10",
    borderRadius: "3 3 0 0",
  },
  tableHeaderCell: { color: COLORS.white, fontSize: 8, fontFamily: "Helvetica-Bold" },
  tableRow:    { flexDirection: "row", padding: "7 10", borderBottom: `1 solid ${COLORS.slate100}` },
  tableRowAlt: { flexDirection: "row", padding: "7 10", backgroundColor: COLORS.slate100, borderBottom: `1 solid ${COLORS.slate200}` },
  tableCell:     { fontSize: 9, color: COLORS.slate700 },
  tableCellBold: { fontSize: 9, color: COLORS.black, fontFamily: "Helvetica-Bold" },

  // Summary
  summaryBox: {
    marginTop: 14,
    padding: "10 14",
    backgroundColor: "#fef2f2",
    borderRadius: 6,
    border: `1 solid #fecaca`,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: { fontSize: 9, color: COLORS.slate500 },
  summaryValue: { fontSize: 20, fontFamily: "Helvetica-Bold", color: COLORS.red },

  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: 36,
    backgroundColor: COLORS.slate100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    borderTop: `2 solid ${COLORS.primary}`,
  },
  footerText:  { fontSize: 8, color: COLORS.slate500 },
  footerBrand: { fontSize: 8, color: COLORS.primary, fontFamily: "Helvetica-Bold" },
});

export interface MetalOrderReportData {
  orderId:          string;
  department:       string;
  createdBy:        string;
  notes:            string | null;
  generatedAt:      string;
  unavailableItems: { family: MetalFamily; description: string | null; originalQuantity: number }[];
  totalUnavailable: number;
  totalItems:       number;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-ES", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function MetalOrderReportDocument({ data }: { data: MetalOrderReportData }) {
  return (
    <Document title="Artículos no disponibles" author="TQ-HELP">
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Artículos no disponibles</Text>
            <Text style={s.headerSubtitle}>Informe de pedido de material · TQ-HELP</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerMeta}>GENERADO EL</Text>
            <Text style={s.headerDate}>{fmt(data.generatedAt)}</Text>
          </View>
        </View>
        <View style={s.accentBar} />

        <View style={s.body}>

          {/* Info del pedido */}
          <View style={s.infoBox}>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Departamento</Text>
              <Text style={s.infoValue}>{data.department}</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Solicitado por</Text>
              <Text style={s.infoValue}>{data.createdBy}</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Referencia pedido</Text>
              <Text style={s.infoValue}>{data.orderId.slice(-8).toUpperCase()}</Text>
            </View>
          </View>

          {data.notes && (
            <View style={{ marginBottom: 14, padding: "8 12", backgroundColor: COLORS.slate100, borderRadius: 6, border: `1 solid ${COLORS.slate200}` }}>
              <Text style={{ fontSize: 8, color: COLORS.slate500, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>Observaciones del pedido</Text>
              <Text style={{ fontSize: 9, color: COLORS.slate700 }}>{data.notes}</Text>
            </View>
          )}

          {/* Aviso */}
          <View style={s.alertBox}>
            <Text style={s.alertText}>
              Los artículos listados a continuación no han podido ser suministrados.
              Cantidades solicitadas indicadas como referencia.
            </Text>
          </View>

          {/* Tabla de no disponibles */}
          <Text style={s.sectionTitle}>Artículos no disponibles</Text>
          <View>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, { flex: 2 }]}>Familia</Text>
              <Text style={[s.tableHeaderCell, { flex: 3 }]}>Descripción</Text>
              <Text style={[s.tableHeaderCell, { width: 70, textAlign: "right" }]}>Cant. pedida</Text>
            </View>
            {data.unavailableItems.map((item, i) => (
              <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={[s.tableCellBold, { flex: 2 }]}>
                  {METAL_FAMILY_LABELS[item.family]}
                </Text>
                <Text style={[s.tableCell, { flex: 3 }]}>
                  {item.description || "—"}
                </Text>
                <Text style={[s.tableCell, { width: 70, textAlign: "right", color: COLORS.red }]}>
                  {item.originalQuantity}
                </Text>
              </View>
            ))}
          </View>

          {/* Resumen */}
          <View style={s.summaryBox}>
            <View>
              <Text style={s.summaryLabel}>Artículos no disponibles</Text>
              <Text style={[s.summaryLabel, { marginTop: 2 }]}>
                sobre {data.totalItems} {data.totalItems === 1 ? "línea" : "líneas"} del pedido
              </Text>
            </View>
            <Text style={s.summaryValue}>{data.totalUnavailable}</Text>
          </View>

        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Ref: {data.orderId.slice(-8).toUpperCase()}</Text>
          <Text style={s.footerBrand}>TQ-HELP — Pedidos de material</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
