// app/(tabs)/economia.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import TabButton from "../../src/components/TabButton";

const TAB_BAR_HEIGHT = 72;

// ─── Datos de ejemplo ────────────────────────────────────────────────────────
const CUOTAS = [
  { piso: "1º A", vecino: "García", pagado: true,  importe: 120, fecha: "03/04/2025" },
  { piso: "1º B", vecino: "Martínez", pagado: true,  importe: 120, fecha: "01/04/2025" },
  { piso: "2º A", vecino: "López",    pagado: false, importe: 120, fecha: null },
  { piso: "2º B", vecino: "Sánchez",  pagado: true,  importe: 120, fecha: "02/04/2025" },
  { piso: "3º A", vecino: "Fernández",pagado: false, importe: 120, fecha: null },
  { piso: "3º B", vecino: "Jiménez",  pagado: true,  importe: 120, fecha: "05/04/2025" },
  { piso: "4º A", vecino: "Ruiz",     pagado: false, importe: 120, fecha: null },
  { piso: "4º B", vecino: "Moreno",   pagado: true,  importe: 120, fecha: "04/04/2025" },
];

const PRESUPUESTOS = [
  { nombre: "Ascensor nuevo",       total: 12000, gastado: 4800,  color: "#2F67E8" },
  { nombre: "Cambio de luces LED",  total: 1800,  gastado: 1800,  color: "#16A34A" },
  { nombre: "Puerta de Portal",     total: 3500,  gastado: 700,   color: "#D97706" },
  { nombre: "Telefonillo eléctrico",total: 2200,  gastado: 0,     color: "#7C3AED" },
];

const MOVIMIENTOS = [
  { concepto: "Cuota abril — 1º A",  tipo: "ingreso", importe: 120, fecha: "03 abr" },
  { concepto: "Cuota abril — 1º B",  tipo: "ingreso", importe: 120, fecha: "01 abr" },
  { concepto: "Reparación fontanería",tipo: "gasto",  importe: 340, fecha: "28 mar" },
  { concepto: "Cuota marzo — 2º B",  tipo: "ingreso", importe: 120, fecha: "02 mar" },
  { concepto: "Seguro comunitario",   tipo: "gasto",  importe: 890, fecha: "01 mar" },
  { concepto: "Cuota marzo — 3º B",  tipo: "ingreso", importe: 120, fecha: "01 mar" },
];

type Tab = "resumen" | "cuotas" | "presupuestos" | "movimientos";

export default function EconomiaScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("resumen");
  const [filtroCuotas, setFiltroCuotas] = useState<"todos" | "pagados" | "pendientes">("todos");

  const totalCuotas   = CUOTAS.length * 120;
  const cobrado       = CUOTAS.filter((c) => c.pagado).length * 120;
  const pendiente     = totalCuotas - cobrado;
  const pctCobrado    = Math.round((cobrado / totalCuotas) * 100);

  const cuotasFiltradas =
    filtroCuotas === "todos"
      ? CUOTAS
      : filtroCuotas === "pagados"
      ? CUOTAS.filter((c) => c.pagado)
      : CUOTAS.filter((c) => !c.pagado);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>Economía</Text>
        <View style={{ flex: 1 }} />
        <Pressable style={styles.headerAction}>
          <Ionicons name="download-outline" size={20} color="white" />
        </Pressable>
      </View>

      {/* TABS INTERNOS */}
      <View style={styles.tabsRow}>
        {(["resumen", "cuotas", "presupuestos", "movimientos"] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.tabChip, tab === t && styles.tabChipActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabChipText, tab === t && styles.tabChipTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* CONTENIDO */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_HEIGHT + 18 }]}
      >
        {/* ── RESUMEN ── */}
        {tab === "resumen" && (
          <>
            {/* Tarjeta saldo */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Saldo en cuenta</Text>
              <Text style={styles.balanceAmount}>€ 8.340,00</Text>
              <Text style={styles.balanceSubtitle}>Actualizado hoy, 09 abr 2025</Text>

              <View style={styles.balanceDivider} />

              <View style={styles.balanceRow}>
                <View style={styles.balanceStat}>
                  <Ionicons name="arrow-down-circle" size={18} color="#86EFAC" />
                  <Text style={styles.balanceStatLabel}>Ingresos mes</Text>
                  <Text style={styles.balanceStatValue}>€ 720</Text>
                </View>
                <View style={styles.balanceStat}>
                  <Ionicons name="arrow-up-circle" size={18} color="#FCA5A5" />
                  <Text style={styles.balanceStatLabel}>Gastos mes</Text>
                  <Text style={styles.balanceStatValue}>€ 340</Text>
                </View>
                <View style={styles.balanceStat}>
                  <Ionicons name="time-outline" size={18} color="#FDE68A" />
                  <Text style={styles.balanceStatLabel}>Pendiente</Text>
                  <Text style={styles.balanceStatValue}>€ {pendiente}</Text>
                </View>
              </View>
            </View>

            {/* Cobro cuotas */}
            <Text style={styles.sectionTitle}>Cobro cuotas — Abril</Text>
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  {CUOTAS.filter((c) => c.pagado).length} de {CUOTAS.length} pagados
                </Text>
                <Text style={styles.progressPct}>{pctCobrado}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${pctCobrado}%` as any }]} />
              </View>
              <View style={styles.progressFooter}>
                <Text style={styles.progressMini}>Cobrado: <Text style={{ color: "#16A34A", fontWeight: "700" }}>€ {cobrado}</Text></Text>
                <Text style={styles.progressMini}>Total: € {totalCuotas}</Text>
              </View>
            </View>

            {/* Alertas pendientes */}
            {CUOTAS.filter((c) => !c.pagado).length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 4 }]}>Pendientes de cobro</Text>
                {CUOTAS.filter((c) => !c.pagado).map((c) => (
                  <View key={c.piso} style={styles.alertRow}>
                    <Ionicons name="alert-circle" size={18} color="#DC2626" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.alertRowTitle}>{c.piso} — {c.vecino}</Text>
                      <Text style={styles.alertRowSub}>Sin pagar</Text>
                    </View>
                    <Text style={styles.alertRowAmount}>€ {c.importe}</Text>
                    <Pressable style={styles.alertRowBtn}>
                      <Ionicons name="send" size={14} color="#2F67E8" />
                    </Pressable>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {/* ── CUOTAS ── */}
        {tab === "cuotas" && (
          <>
            <View style={styles.filterRow}>
              {(["todos", "pagados", "pendientes"] as const).map((f) => (
                <Pressable
                  key={f}
                  style={[styles.filterChip, filtroCuotas === f && styles.filterChipActive]}
                  onPress={() => setFiltroCuotas(f)}
                >
                  <Text style={[styles.filterChipText, filtroCuotas === f && styles.filterChipTextActive]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Piso</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>Vecino</Text>
              <Text style={[styles.tableCell, { flex: 1.2, textAlign: "right" }]}>Importe</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: "center" }]}>Estado</Text>
            </View>

            {cuotasFiltradas.map((c) => (
              <View key={c.piso} style={styles.tableRow}>
                <Text style={[styles.tableData, { flex: 1, fontWeight: "600" }]}>{c.piso}</Text>
                <View style={{ flex: 2 }}>
                  <Text style={styles.tableData}>{c.vecino}</Text>
                  {c.fecha && <Text style={styles.tableDataSub}>{c.fecha}</Text>}
                </View>
                <Text style={[styles.tableData, { flex: 1.2, textAlign: "right" }]}>€ {c.importe}</Text>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <View style={[styles.badge, c.pagado ? styles.badgeGreen : styles.badgeRed]}>
                    <Text style={[styles.badgeText, { color: c.pagado ? "#15803D" : "#B91C1C" }]}>
                      {c.pagado ? "Pagado" : "Pte."}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            <View style={styles.tableTotal}>
              <Text style={styles.tableTotalLabel}>Total cobrado</Text>
              <Text style={styles.tableTotalValue}>€ {cobrado} / € {totalCuotas}</Text>
            </View>
          </>
        )}

        {/* ── PRESUPUESTOS ── */}
        {tab === "presupuestos" && (
          <>
            {PRESUPUESTOS.map((p) => {
              const pct = Math.round((p.gastado / p.total) * 100);
              const restante = p.total - p.gastado;
              return (
                <View key={p.nombre} style={styles.budgetCard}>
                  <View style={styles.budgetHeader}>
                    <View style={[styles.budgetDot, { backgroundColor: p.color }]} />
                    <Text style={styles.budgetName}>{p.nombre}</Text>
                    <Text style={styles.budgetPct}>{pct}%</Text>
                  </View>

                  <View style={styles.budgetBar}>
                    <View
                      style={[
                        styles.budgetFill,
                        { width: `${pct}%` as any, backgroundColor: p.color },
                      ]}
                    />
                  </View>

                  <View style={styles.budgetFooter}>
                    <Text style={styles.budgetMini}>
                      Gastado: <Text style={{ fontWeight: "700" }}>€ {p.gastado.toLocaleString()}</Text>
                    </Text>
                    <Text style={styles.budgetMini}>
                      Restante: <Text style={{ fontWeight: "700" }}>€ {restante.toLocaleString()}</Text>
                    </Text>
                    <Text style={styles.budgetMini}>
                      Total: € {p.total.toLocaleString()}
                    </Text>
                  </View>
                </View>
              );
            })}

            <Pressable style={styles.addBtn}>
              <Ionicons name="add-circle-outline" size={18} color="#2F67E8" />
              <Text style={styles.addBtnText}>Nuevo presupuesto</Text>
            </Pressable>
          </>
        )}

        {/* ── MOVIMIENTOS ── */}
        {tab === "movimientos" && (
          <>
            <View style={styles.movSummaryRow}>
              <View style={[styles.movSummary, { borderColor: "#BBF7D0" }]}>
                <Text style={styles.movSummaryLabel}>Ingresos</Text>
                <Text style={[styles.movSummaryValue, { color: "#15803D" }]}>
                  + € {MOVIMIENTOS.filter((m) => m.tipo === "ingreso").reduce((a, m) => a + m.importe, 0)}
                </Text>
              </View>
              <View style={[styles.movSummary, { borderColor: "#FECACA" }]}>
                <Text style={styles.movSummaryLabel}>Gastos</Text>
                <Text style={[styles.movSummaryValue, { color: "#B91C1C" }]}>
                  - € {MOVIMIENTOS.filter((m) => m.tipo === "gasto").reduce((a, m) => a + m.importe, 0)}
                </Text>
              </View>
            </View>

            {MOVIMIENTOS.map((m, i) => (
              <View key={i} style={styles.movRow}>
                <View
                  style={[
                    styles.movIcon,
                    { backgroundColor: m.tipo === "ingreso" ? "#DCFCE7" : "#FEE2E2" },
                  ]}
                >
                  <Ionicons
                    name={m.tipo === "ingreso" ? "arrow-down" : "arrow-up"}
                    size={16}
                    color={m.tipo === "ingreso" ? "#16A34A" : "#DC2626"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.movConcepto}>{m.concepto}</Text>
                  <Text style={styles.movFecha}>{m.fecha}</Text>
                </View>
                <Text
                  style={[
                    styles.movImporte,
                    { color: m.tipo === "ingreso" ? "#16A34A" : "#DC2626" },
                  ]}
                >
                  {m.tipo === "ingreso" ? "+" : "-"}€ {m.importe}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* TAB BAR */}
      <View style={[styles.bottomTabBar, { height: TAB_BAR_HEIGHT }]}>
        <TabButton icon="home-outline" label="Inicio" onPress={() => router.push("/(tabs)")} />
        <TabButton icon="chatbubble-ellipses-outline" label="Chats" onPress={() => {}} />
        <TabButton icon="bar-chart-outline" label="Economía" onPress={() => router.push("/(tabs)/economia")} active />
        <TabButton icon="call-outline" label="Contactos" onPress={() => {}} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4FB" },

  // Header
  header: {
    height: 64,
    backgroundColor: "#2F67E8",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  backButton: { width: 32, justifyContent: "center", alignItems: "center", marginRight: 4 },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "700" },
  headerAction: { width: 36, alignItems: "center" },

  // Tabs internos
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  tabChipActive: { backgroundColor: "#2F67E8" },
  tabChipText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  tabChipTextActive: { color: "white" },

  // Content
  content: { padding: 14 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#1F2937", marginBottom: 10, marginTop: 16 },

  // Balance card
  balanceCard: {
    backgroundColor: "#1E3A8A",
    borderRadius: 16,
    padding: 20,
    marginBottom: 4,
  },
  balanceLabel: { color: "#93C5FD", fontSize: 12, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  balanceAmount: { color: "white", fontSize: 34, fontWeight: "800", marginTop: 4 },
  balanceSubtitle: { color: "#6B96D6", fontSize: 11, marginTop: 2 },
  balanceDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: 16 },
  balanceRow: { flexDirection: "row", justifyContent: "space-between" },
  balanceStat: { alignItems: "center", gap: 4 },
  balanceStatLabel: { color: "#93C5FD", fontSize: 10, fontWeight: "600" },
  balanceStatValue: { color: "white", fontSize: 14, fontWeight: "700" },

  // Progress card
  progressCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  progressLabel: { fontSize: 13, fontWeight: "600", color: "#374151" },
  progressPct: { fontSize: 13, fontWeight: "800", color: "#2F67E8" },
  progressBar: { height: 10, backgroundColor: "#E5E7EB", borderRadius: 10, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#2F67E8", borderRadius: 10 },
  progressFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  progressMini: { fontSize: 11, color: "#6B7280" },

  // Alert rows
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#DC2626",
  },
  alertRowTitle: { fontSize: 13, fontWeight: "600", color: "#1F2937" },
  alertRowSub: { fontSize: 11, color: "#DC2626", marginTop: 1 },
  alertRowAmount: { fontSize: 13, fontWeight: "700", color: "#1F2937", marginRight: 8 },
  alertRowBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },

  // Filter row (cuotas)
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#E5E7EB" },
  filterChipActive: { backgroundColor: "#1E3A8A" },
  filterChipText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  filterChipTextActive: { color: "white" },

  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#E8EDF8",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  tableCell: { fontSize: 11, fontWeight: "700", color: "#6B7280", textTransform: "uppercase" },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  tableData: { fontSize: 13, color: "#1F2937" },
  tableDataSub: { fontSize: 10, color: "#9CA3AF", marginTop: 1 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  badgeGreen: { backgroundColor: "#DCFCE7" },
  badgeRed: { backgroundColor: "#FEE2E2" },
  badgeText: { fontSize: 10, fontWeight: "700" },
  tableTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  tableTotalLabel: { fontSize: 13, fontWeight: "700", color: "#374151" },
  tableTotalValue: { fontSize: 13, fontWeight: "800", color: "#2F67E8" },

  // Presupuestos
  budgetCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  budgetHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  budgetDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  budgetName: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1F2937" },
  budgetPct: { fontSize: 13, fontWeight: "800", color: "#374151" },
  budgetBar: { height: 8, backgroundColor: "#F3F4F6", borderRadius: 10, overflow: "hidden" },
  budgetFill: { height: "100%", borderRadius: 10 },
  budgetFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  budgetMini: { fontSize: 11, color: "#6B7280" },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#2F67E8",
    marginTop: 4,
  },
  addBtnText: { fontSize: 14, fontWeight: "600", color: "#2F67E8" },

  // Movimientos
  movSummaryRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  movSummary: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
  },
  movSummaryLabel: { fontSize: 11, fontWeight: "600", color: "#6B7280", marginBottom: 4 },
  movSummaryValue: { fontSize: 16, fontWeight: "800" },
  movRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  movIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  movConcepto: { fontSize: 13, fontWeight: "600", color: "#1F2937" },
  movFecha: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  movImporte: { fontSize: 14, fontWeight: "800" },

  // Bottom tab bar
  bottomTabBar: {
    borderTopWidth: 1,
    borderTopColor: "#D1D5DB",
    flexDirection: "row",
    backgroundColor: "white",
  },
});