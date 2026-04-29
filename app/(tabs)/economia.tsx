// app/(tabs)/economia.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TabButton from "../../src/components/TabButton";
import { supabase } from "../../src/lib/supabase";

const TAB_BAR_HEIGHT = 72;
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Cuota = {
  id: string; usuario_id: string; nombre: string;
  mes: number; anio: number; importe: number;
  estado: "PAGADO" | "PENDIENTE" | "FALLIDO"; fecha_pago: string | null;
};
type Presupuesto = { id: string; nombre: string; total: number; gastado: number; color: string; };
type Movimiento = {
  id: string; concepto: string; tipo: "ingreso" | "gasto";
  importe: number; fecha: string; tipo_gasto: "comunidad" | "repartido";
};
type GastoReparto = {
  id: string; movimiento_id: string; usuario_id: string;
  nombre: string; importe: number; estado: "PENDIENTE" | "PAGADO";
};
type Vecino = { id: string; nombre: string; apellidos: string | null; };
type UsuarioSesion = { id: string; rol: string; comunidad_id: string; };
type Tab = "resumen" | "cuotas" | "presupuestos" | "movimientos";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEur(n: number) {
  return `${n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}
function formatFecha(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Modal Crear Gasto ────────────────────────────────────────────────────────

function ModalCrearGasto({
  visible, onClose, usuario, onGastoCreado,
}: {
  visible: boolean;
  onClose: () => void;
  usuario: UsuarioSesion;
  onGastoCreado: () => void;
}) {
  const [tipoGasto, setTipoGasto] = useState<"comunidad" | "repartido">("comunidad");
  const [concepto, setConcepto] = useState("");
  const [importe, setImporte] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [vecinos, setVecinos] = useState<Vecino[]>([]);
  const [vecinosSeleccionados, setVecinosSeleccionados] = useState<string[]>([]);
  const [cargandoVecinos, setCargandoVecinos] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Cargar vecinos al abrir
  useEffect(() => {
    if (!visible) return;
    setConcepto("");
    setImporte("");
    setFecha(new Date().toISOString().split("T")[0]);
    setTipoGasto("comunidad");
    setVecinosSeleccionados([]);

    const cargar = async () => {
      setCargandoVecinos(true);
      const { data } = await supabase
        .from("usuario")
        .select("id, nombre, apellidos")
        .eq("comunidad_id", usuario.comunidad_id)
        .order("nombre");
      setVecinos(data ?? []);
      // Seleccionar todos por defecto para reparto
      setVecinosSeleccionados((data ?? []).map((v: Vecino) => v.id));
      setCargandoVecinos(false);
    };
    cargar();
  }, [visible]);

  const toggleVecino = (id: string) => {
    setVecinosSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const importeNum = parseFloat(importe.replace(",", ".")) || 0;
  const importePorVecino =
    tipoGasto === "repartido" && vecinosSeleccionados.length > 0
      ? importeNum / vecinosSeleccionados.length
      : 0;

  const guardar = async () => {
    if (!concepto.trim()) { Alert.alert("Falta el concepto"); return; }
    if (importeNum <= 0) { Alert.alert("Importe invalido", "Introduce un importe mayor que 0."); return; }
    if (tipoGasto === "repartido" && vecinosSeleccionados.length === 0) {
      Alert.alert("Sin vecinos", "Selecciona al menos un vecino para repartir el gasto.");
      return;
    }

    setGuardando(true);

    // 1. Crear el movimiento
    const { data: mov, error: errMov } = await supabase
      .from("movimiento")
      .insert({
        comunidad_id: usuario.comunidad_id,
        concepto: concepto.trim(),
        tipo: "gasto",
        tipo_gasto: tipoGasto,
        importe: importeNum,
        fecha,
        creado_por: usuario.id,
      })
      .select("id")
      .single();

    if (errMov || !mov) {
      Alert.alert("Error", "No se pudo registrar el gasto.");
      setGuardando(false);
      return;
    }

    // 2. Si es repartido → crear filas en gasto_reparto
    if (tipoGasto === "repartido") {
      const importeIndividual = parseFloat((importeNum / vecinosSeleccionados.length).toFixed(2));
      const repartos = vecinosSeleccionados.map((uid) => ({
        movimiento_id: mov.id,
        usuario_id: uid,
        importe: importeIndividual,
        estado: "PENDIENTE",
      }));

      const { error: errReparto } = await supabase.from("gasto_reparto").insert(repartos);
      if (errReparto) {
        Alert.alert("Aviso", "Gasto creado pero no se pudo registrar el reparto.");
      }
    }

    setGuardando(false);
    onClose();
    onGastoCreado();
    Alert.alert(
      "Gasto registrado",
      tipoGasto === "repartido"
        ? `${formatEur(importeNum)} repartido entre ${vecinosSeleccionados.length} vecinos (${formatEur(importePorVecino)} cada uno).`
        : `${formatEur(importeNum)} descontado de la cuenta de la comunidad.`
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={mStyles.safe} edges={["top"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>

          {/* Cabecera */}
          <View style={mStyles.header}>
            <Pressable onPress={onClose}>
              <Text style={mStyles.cancelar}>Cancelar</Text>
            </Pressable>
            <Text style={mStyles.titulo}>Nuevo gasto</Text>
            <Pressable onPress={guardar} disabled={guardando} style={[mStyles.guardarBtn, guardando && { opacity: 0.5 }]}>
              {guardando
                ? <ActivityIndicator size="small" color="white" />
                : <Text style={mStyles.guardarBtnText}>Guardar</Text>}
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

            {/* Tipo de gasto */}
            <View style={mStyles.section}>
              <Text style={mStyles.label}>Tipo de gasto</Text>
              <View style={mStyles.tipoRow}>
                <Pressable
                  style={[mStyles.tipoBtn, tipoGasto === "comunidad" && mStyles.tipoBtnActive]}
                  onPress={() => setTipoGasto("comunidad")}
                >
                  <Ionicons
                    name="business-outline" size={20}
                    color={tipoGasto === "comunidad" ? "white" : "#6B7280"}
                  />
                  <Text style={[mStyles.tipoBtnText, tipoGasto === "comunidad" && mStyles.tipoBtnTextActive]}>
                    Gasto comunidad
                  </Text>
                  <Text style={[mStyles.tipoBtnSub, tipoGasto === "comunidad" && { color: "rgba(255,255,255,0.75)" }]}>
                    Se descuenta de la{"\n"}cuenta comun
                  </Text>
                </Pressable>

                <Pressable
                  style={[mStyles.tipoBtn, tipoGasto === "repartido" && mStyles.tipoBtnActiveReparto]}
                  onPress={() => setTipoGasto("repartido")}
                >
                  <Ionicons
                    name="people-outline" size={20}
                    color={tipoGasto === "repartido" ? "white" : "#6B7280"}
                  />
                  <Text style={[mStyles.tipoBtnText, tipoGasto === "repartido" && mStyles.tipoBtnTextActive]}>
                    Repartir entre vecinos
                  </Text>
                  <Text style={[mStyles.tipoBtnSub, tipoGasto === "repartido" && { color: "rgba(255,255,255,0.75)" }]}>
                    Cada vecino paga{"\n"}su parte proporcional
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Concepto */}
            <View style={mStyles.section}>
              <Text style={mStyles.label}>Concepto</Text>
              <TextInput
                style={mStyles.input}
                placeholder="Ej. Reparacion ascensor, Seguro..."
                placeholderTextColor="#9CA3AF"
                value={concepto}
                onChangeText={setConcepto}
                maxLength={100}
              />
            </View>

            {/* Importe + Fecha */}
            <View style={[mStyles.section, { flexDirection: "row", gap: 12 }]}>
              <View style={{ flex: 1 }}>
                <Text style={mStyles.label}>Importe (€)</Text>
                <TextInput
                  style={mStyles.input}
                  placeholder="0,00"
                  placeholderTextColor="#9CA3AF"
                  value={importe}
                  onChangeText={setImporte}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={mStyles.label}>Fecha</Text>
                <TextInput
                  style={mStyles.input}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor="#9CA3AF"
                  value={fecha}
                  onChangeText={setFecha}
                />
              </View>
            </View>

            {/* Preview reparto */}
            {tipoGasto === "repartido" && importeNum > 0 && vecinosSeleccionados.length > 0 && (
              <View style={mStyles.previewBox}>
                <Ionicons name="calculator-outline" size={16} color="#7C3AED" />
                <Text style={mStyles.previewText}>
                  {formatEur(importeNum)} ÷ {vecinosSeleccionados.length} vecinos ={" "}
                  <Text style={{ fontWeight: "800", color: "#7C3AED" }}>
                    {formatEur(importePorVecino)} / vecino
                  </Text>
                </Text>
              </View>
            )}

            {/* Lista vecinos (solo si repartido) */}
            {tipoGasto === "repartido" && (
              <View style={mStyles.section}>
                <View style={mStyles.vecinosHeader}>
                  <Text style={mStyles.label}>
                    Vecinos ({vecinosSeleccionados.length}/{vecinos.length} seleccionados)
                  </Text>
                  <Pressable onPress={() =>
                    setVecinosSeleccionados(
                      vecinosSeleccionados.length === vecinos.length ? [] : vecinos.map((v) => v.id)
                    )
                  }>
                    <Text style={mStyles.selTodosText}>
                      {vecinosSeleccionados.length === vecinos.length ? "Deseleccionar todos" : "Seleccionar todos"}
                    </Text>
                  </Pressable>
                </View>

                {cargandoVecinos ? (
                  <ActivityIndicator color="#7C3AED" style={{ marginTop: 12 }} />
                ) : (
                  vecinos.map((v) => {
                    const sel = vecinosSeleccionados.includes(v.id);
                    return (
                      <Pressable key={v.id} style={mStyles.vecinoRow} onPress={() => toggleVecino(v.id)}>
                        <View style={mStyles.vecinoAvatar}>
                          <Text style={mStyles.vecinoIniciales}>
                            {v.nombre.charAt(0)}{v.apellidos?.charAt(0) ?? ""}
                          </Text>
                        </View>
                        <Text style={mStyles.vecinoNombre}>
                          {v.nombre} {v.apellidos ?? ""}
                        </Text>
                        {importeNum > 0 && sel && (
                          <Text style={mStyles.vecinoImporte}>{formatEur(importePorVecino)}</Text>
                        )}
                        <View style={[mStyles.checkbox, sel && mStyles.checkboxSel]}>
                          {sel && <Ionicons name="checkmark" size={13} color="white" />}
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function EconomiaScreen() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargandoUsuario, setCargandoUsuario] = useState(true);
  const [tab, setTab] = useState<Tab>("resumen");
  const [filtroCuotas, setFiltroCuotas] = useState<"todos" | "pagados" | "pendientes">("todos");
  const [refreshing, setRefreshing] = useState(false);

  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [repartos, setRepartos] = useState<GastoReparto[]>([]);
  const [cargando, setCargando] = useState(true);

  const [mesActivo, setMesActivo] = useState(new Date().getMonth() + 1);
  const [anioActivo, setAnioActivo] = useState(new Date().getFullYear());
  const [marcandoId, setMarcandoId] = useState<string | null>(null);
  const [modalGastoVisible, setModalGastoVisible] = useState(false);

  // 1. Cargar usuario
  useEffect(() => {
    const cargar = async () => {
      setCargandoUsuario(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setCargandoUsuario(false); return; }
      const { data } = await supabase
        .from("usuario").select("id, rol, comunidad_id").eq("email", user.email).single();
      if (data) setUsuario(data);
      setCargandoUsuario(false);
    };
    cargar();
  }, []);

  // 2. Mes mas reciente con datos
  useEffect(() => {
    if (!usuario) return;
    const buscar = async () => {
      const { data } = await supabase
        .from("pago").select("mes, anio").eq("comunidad_id", usuario.comunidad_id)
        .order("anio", { ascending: false }).order("mes", { ascending: false }).limit(1);
      if (data && data.length > 0) { setMesActivo(data[0].mes); setAnioActivo(data[0].anio); }
    };
    buscar();
  }, [usuario]);

  // 3. Cargar datos
  const cargarDatos = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);

    // Cuotas
    const { data: pagosData } = await supabase
      .from("pago")
      .select("id, usuario_id, mes, anio, importe, estado, fecha_pago, usuario:usuario_id(nombre, apellidos)")
      .eq("comunidad_id", usuario.comunidad_id).eq("mes", mesActivo).eq("anio", anioActivo).order("estado");
    if (pagosData) {
      setCuotas(pagosData.map((p: any) => ({
        id: p.id, usuario_id: p.usuario_id,
        nombre: p.usuario ? (p.usuario.apellidos ? `${p.usuario.nombre} ${p.usuario.apellidos}` : p.usuario.nombre) : "Desconocido",
        mes: p.mes, anio: p.anio, importe: parseFloat(p.importe),
        estado: p.estado, fecha_pago: p.fecha_pago,
      })));
    }

    // Presupuestos
    const { data: presData } = await supabase
      .from("presupuesto").select("id, nombre, total, gastado, color")
      .eq("comunidad_id", usuario.comunidad_id).eq("activo", true).order("created_at");
    if (presData) setPresupuestos(presData.map((p: any) => ({ ...p, total: parseFloat(p.total), gastado: parseFloat(p.gastado) })));

    // Movimientos
    const { data: movData } = await supabase
      .from("movimiento").select("id, concepto, tipo, importe, fecha, tipo_gasto")
      .eq("comunidad_id", usuario.comunidad_id).order("fecha", { ascending: false }).limit(50);
    if (movData) setMovimientos(movData.map((m: any) => ({ ...m, importe: parseFloat(m.importe), tipo_gasto: m.tipo_gasto ?? "comunidad" })));

    // Repartos pendientes del usuario actual
    const { data: repartoData } = await supabase
      .from("gasto_reparto")
      .select("id, movimiento_id, usuario_id, importe, estado, movimiento:movimiento_id(concepto, fecha)")
      .eq("usuario_id", usuario.id).eq("estado", "PENDIENTE");
    if (repartoData) {
      setRepartos(repartoData.map((r: any) => ({
        id: r.id, movimiento_id: r.movimiento_id, usuario_id: r.usuario_id,
        nombre: r.movimiento?.concepto ?? "Gasto", importe: parseFloat(r.importe), estado: r.estado,
      })));
    }

    setCargando(false);
  }, [usuario, mesActivo, anioActivo]);

  useEffect(() => { if (usuario) cargarDatos(); }, [usuario, mesActivo, anioActivo, cargarDatos]);

  const onRefresh = async () => { setRefreshing(true); await cargarDatos(); setRefreshing(false); };

  // Marcar cuota pagada
  const marcarCuotaPagada = async (cuota: Cuota) => {
    if (!esPresidente) return;
    Alert.alert("Marcar como pagado", `Confirmar pago de ${cuota.nombre} — ${formatEur(cuota.importe)}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Confirmar", onPress: async () => {
        setMarcandoId(cuota.id);
        await supabase.from("pago").update({ estado: "PAGADO", fecha_pago: new Date().toISOString() }).eq("id", cuota.id);
        await supabase.from("movimiento").insert({
          comunidad_id: usuario!.comunidad_id, concepto: `Cuota ${MESES[cuota.mes - 1]} - ${cuota.nombre}`,
          tipo: "ingreso", tipo_gasto: "comunidad", importe: cuota.importe, fecha: new Date().toISOString().split("T")[0],
        });
        await cargarDatos();
        setMarcandoId(null);
      }},
    ]);
  };

  // Marcar reparto pagado
  const marcarRepartoPagado = async (reparto: GastoReparto) => {
    Alert.alert("Confirmar pago", `Marcar ${formatEur(reparto.importe)} de "${reparto.nombre}" como pagado?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Confirmar", onPress: async () => {
        await supabase.from("gasto_reparto").update({ estado: "PAGADO", fecha_pago: new Date().toISOString() }).eq("id", reparto.id);
        await cargarDatos();
      }},
    ]);
  };

  // Calculos
  const totalCuotas  = cuotas.reduce((s, c) => s + c.importe, 0);
  const cobrado      = cuotas.filter((c) => c.estado === "PAGADO").reduce((s, c) => s + c.importe, 0);
  const pendiente    = cuotas.filter((c) => c.estado !== "PAGADO").reduce((s, c) => s + c.importe, 0);
  const pctCobrado   = totalCuotas > 0 ? Math.round((cobrado / totalCuotas) * 100) : 0;
  const saldo        = movimientos.reduce((s, m) => s + (m.tipo === "ingreso" ? m.importe : -m.importe), 0);
  const ingresosMes  = movimientos.filter((m) => m.tipo === "ingreso" && new Date(m.fecha).getMonth() + 1 === mesActivo && new Date(m.fecha).getFullYear() === anioActivo).reduce((s, m) => s + m.importe, 0);
  const gastosMes    = movimientos.filter((m) => m.tipo === "gasto"   && new Date(m.fecha).getMonth() + 1 === mesActivo && new Date(m.fecha).getFullYear() === anioActivo).reduce((s, m) => s + m.importe, 0);
  const cuotasFiltradas = filtroCuotas === "todos" ? cuotas : filtroCuotas === "pagados" ? cuotas.filter((c) => c.estado === "PAGADO") : cuotas.filter((c) => c.estado !== "PAGADO");

  const esPresidente = usuario?.rol === "PRESIDENTE";

  const cambiarMes = (delta: number) => {
    let m = mesActivo + delta, a = anioActivo;
    if (m > 12) { m = 1; a++; } if (m < 1) { m = 12; a--; }
    setMesActivo(m); setAnioActivo(a);
  };

  if (cargandoUsuario) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}><Text style={styles.headerTitle}>Economia</Text></View>
        <View style={styles.centered}><ActivityIndicator size="large" color="#2F67E8" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>

      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>Economia</Text>
        <View style={{ flex: 1 }} />
        {/* Botón Nuevo Gasto — solo PRESIDENTE */}
        {esPresidente && (
          <Pressable style={styles.nuevoGastoBtn} onPress={() => setModalGastoVisible(true)}>
            <Ionicons name="add" size={16} color="white" />
            <Text style={styles.nuevoGastoBtnText}>Nuevo gasto</Text>
          </Pressable>
        )}
        <Pressable style={styles.headerAction} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={20} color="white" />
        </Pressable>
      </View>

      {/* TABS */}
      <View style={styles.tabsRow}>
        {(["resumen", "cuotas", "presupuestos", "movimientos"] as Tab[]).map((t) => (
          <Pressable key={t} style={[styles.tabChip, tab === t && styles.tabChipActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabChipText, tab === t && styles.tabChipTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* SELECTOR MES */}
      {(tab === "resumen" || tab === "cuotas") && (
        <View style={styles.mesRow}>
          <Pressable onPress={() => cambiarMes(-1)} style={styles.mesBtn}>
            <Ionicons name="chevron-back" size={18} color="#2F67E8" />
          </Pressable>
          <Text style={styles.mesLabel}>{MESES[mesActivo - 1]} {anioActivo}</Text>
          <Pressable onPress={() => cambiarMes(1)} style={styles.mesBtn}>
            <Ionicons name="chevron-forward" size={18} color="#2F67E8" />
          </Pressable>
        </View>
      )}

      {cargando ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2F67E8" />
          <Text style={styles.cargandoText}>Cargando datos...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_HEIGHT + 18 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2F67E8" />}
        >

          {/* ── RESUMEN ─────────────────────────────────────────────────────── */}
          {tab === "resumen" && (
            <>
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>SALDO ACUMULADO</Text>
                <Text style={styles.balanceAmount}>{formatEur(saldo)}</Text>
                <Text style={styles.balanceSubtitle}>Basado en {movimientos.length} movimientos</Text>
                <View style={styles.balanceDivider} />
                <View style={styles.balanceRow}>
                  <View style={styles.balanceStat}>
                    <Ionicons name="arrow-down-circle" size={18} color="#86EFAC" />
                    <Text style={styles.balanceStatLabel}>Ingresos mes</Text>
                    <Text style={styles.balanceStatValue}>{formatEur(ingresosMes)}</Text>
                  </View>
                  <View style={styles.balanceStat}>
                    <Ionicons name="arrow-up-circle" size={18} color="#FCA5A5" />
                    <Text style={styles.balanceStatLabel}>Gastos mes</Text>
                    <Text style={styles.balanceStatValue}>{formatEur(gastosMes)}</Text>
                  </View>
                  <View style={styles.balanceStat}>
                    <Ionicons name="time-outline" size={18} color="#FDE68A" />
                    <Text style={styles.balanceStatLabel}>Cuotas pend.</Text>
                    <Text style={styles.balanceStatValue}>{formatEur(pendiente)}</Text>
                  </View>
                </View>
              </View>

              {/* Repartos pendientes del usuario */}
              {repartos.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Gastos que me corresponden pagar</Text>
                  {repartos.map((r) => (
                    <View key={r.id} style={styles.repartoRow}>
                      <View style={styles.repartoIcon}>
                        <Ionicons name="people" size={16} color="#7C3AED" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.repartoConcepto}>{r.nombre}</Text>
                        <Text style={styles.repartoSub}>Gasto repartido · pendiente de pago</Text>
                      </View>
                      <Text style={styles.repartoImporte}>{formatEur(r.importe)}</Text>
                      <Pressable style={styles.repartoBtn} onPress={() => marcarRepartoPagado(r)}>
                        <Ionicons name="checkmark" size={16} color="#7C3AED" />
                      </Pressable>
                    </View>
                  ))}
                </>
              )}

              {/* Cuotas */}
              <Text style={styles.sectionTitle}>Cuotas {MESES[mesActivo - 1]} {anioActivo}</Text>
              {cuotas.length === 0 ? (
                <View style={styles.emptyBox}><Ionicons name="cash-outline" size={32} color="#D1D5DB" /><Text style={styles.emptyText}>Sin cuotas este mes</Text></View>
              ) : (
                <>
                  <View style={styles.progressCard}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>{cuotas.filter((c) => c.estado === "PAGADO").length} de {cuotas.length} pagados</Text>
                      <Text style={styles.progressPct}>{pctCobrado}%</Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${pctCobrado}%` as any }]} />
                    </View>
                    <View style={styles.progressFooter}>
                      <Text style={styles.progressMini}>Cobrado: <Text style={{ color: "#16A34A", fontWeight: "700" }}>{formatEur(cobrado)}</Text></Text>
                      <Text style={styles.progressMini}>Total: {formatEur(totalCuotas)}</Text>
                    </View>
                  </View>
                  {cuotas.filter((c) => c.estado !== "PAGADO").length > 0 && (
                    <>
                      <Text style={[styles.sectionTitle, { marginTop: 4 }]}>Pendientes de cobro</Text>
                      {cuotas.filter((c) => c.estado !== "PAGADO").map((c) => (
                        <View key={c.id} style={styles.alertRow}>
                          <Ionicons name="alert-circle" size={18} color="#DC2626" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.alertRowTitle}>{c.nombre}</Text>
                            <Text style={styles.alertRowSub}>Sin pagar</Text>
                          </View>
                          <Text style={styles.alertRowAmount}>{formatEur(c.importe)}</Text>
                          {esPresidente && (
                            <Pressable style={styles.alertRowBtn} onPress={() => marcarCuotaPagada(c)} disabled={marcandoId === c.id}>
                              {marcandoId === c.id ? <ActivityIndicator size="small" color="#2F67E8" /> : <Ionicons name="checkmark" size={16} color="#2F67E8" />}
                            </Pressable>
                          )}
                        </View>
                      ))}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* ── CUOTAS ──────────────────────────────────────────────────────── */}
          {tab === "cuotas" && (
            <>
              <View style={styles.filterRow}>
                {(["todos", "pagados", "pendientes"] as const).map((f) => (
                  <Pressable key={f} style={[styles.filterChip, filtroCuotas === f && styles.filterChipActive]} onPress={() => setFiltroCuotas(f)}>
                    <Text style={[styles.filterChipText, filtroCuotas === f && styles.filterChipTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Vecino</Text>
                <Text style={[styles.tableCell, { flex: 1.2, textAlign: "right" }]}>Importe</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: "center" }]}>Estado</Text>
                {esPresidente && <Text style={[styles.tableCell, { width: 36 }]} />}
              </View>
              {cuotasFiltradas.length === 0 ? (
                <View style={styles.emptyBox}><Text style={styles.emptyText}>No hay cuotas en esta categoria</Text></View>
              ) : (
                cuotasFiltradas.map((c) => (
                  <View key={c.id} style={styles.tableRow}>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.tableData}>{c.nombre}</Text>
                      {c.fecha_pago && <Text style={styles.tableDataSub}>{formatFecha(c.fecha_pago)}</Text>}
                    </View>
                    <Text style={[styles.tableData, { flex: 1.2, textAlign: "right", fontWeight: "700" }]}>{formatEur(c.importe)}</Text>
                    <View style={{ flex: 1, alignItems: "center" }}>
                      <View style={[styles.badge, c.estado === "PAGADO" ? styles.badgeGreen : styles.badgeRed]}>
                        <Text style={[styles.badgeText, { color: c.estado === "PAGADO" ? "#15803D" : "#DC2626" }]}>{c.estado === "PAGADO" ? "Pagado" : "Pendiente"}</Text>
                      </View>
                    </View>
                    {esPresidente && (
                      <View style={{ width: 36, alignItems: "center" }}>
                        {c.estado !== "PAGADO" && (
                          <Pressable style={styles.alertRowBtn} onPress={() => marcarCuotaPagada(c)} disabled={marcandoId === c.id}>
                            {marcandoId === c.id ? <ActivityIndicator size="small" color="#2F67E8" /> : <Ionicons name="checkmark" size={16} color="#2F67E8" />}
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                ))
              )}
              <View style={styles.tableTotal}>
                <Text style={styles.tableTotalLabel}>Total cobrado</Text>
                <Text style={styles.tableTotalValue}>{formatEur(cobrado)}</Text>
              </View>
            </>
          )}

          {/* ── PRESUPUESTOS ────────────────────────────────────────────────── */}
          {tab === "presupuestos" && (
            <>
              <Text style={styles.sectionTitle}>Proyectos activos</Text>
              {presupuestos.length === 0 ? (
                <View style={styles.emptyBox}><Ionicons name="pie-chart-outline" size={32} color="#D1D5DB" /><Text style={styles.emptyText}>No hay presupuestos activos</Text></View>
              ) : (
                <>
                  {presupuestos.map((p) => {
                    const pct = p.total > 0 ? Math.round((p.gastado / p.total) * 100) : 0;
                    const ok = pct >= 100;
                    return (
                      <View key={p.id} style={styles.budgetCard}>
                        <View style={styles.budgetHeader}>
                          <View style={[styles.budgetDot, { backgroundColor: p.color }]} />
                          <Text style={styles.budgetName}>{p.nombre}</Text>
                          {ok && <View style={styles.completadoBadge}><Text style={styles.completadoText}>Completado</Text></View>}
                          <Text style={[styles.budgetPct, { color: ok ? "#16A34A" : "#374151" }]}>{pct}%</Text>
                        </View>
                        <View style={styles.budgetBar}>
                          <View style={[styles.budgetFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: ok ? "#16A34A" : p.color }]} />
                        </View>
                        <View style={styles.budgetFooter}>
                          <Text style={styles.budgetMini}>Ejecutado: <Text style={{ color: p.color, fontWeight: "700" }}>{formatEur(p.gastado)}</Text></Text>
                          <Text style={styles.budgetMini}>Total: {formatEur(p.total)}</Text>
                        </View>
                      </View>
                    );
                  })}
                  <View style={styles.progressCard}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>Total presupuestado</Text>
                      <Text style={styles.progressPct}>
                        {presupuestos.reduce((s, p) => s + p.total, 0) > 0
                          ? Math.min(Math.round((presupuestos.reduce((s, p) => s + p.gastado, 0) / presupuestos.reduce((s, p) => s + p.total, 0)) * 100), 100)
                          : 0}%
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${presupuestos.reduce((s,p)=>s+p.total,0)>0?Math.min(Math.round((presupuestos.reduce((s,p)=>s+p.gastado,0)/presupuestos.reduce((s,p)=>s+p.total,0))*100),100):0}%` as any }]} />
                    </View>
                    <View style={styles.progressFooter}>
                      <Text style={styles.progressMini}>Ejecutado: <Text style={{ color: "#16A34A", fontWeight: "700" }}>{formatEur(presupuestos.reduce((s, p) => s + p.gastado, 0))}</Text></Text>
                      <Text style={styles.progressMini}>Total: {formatEur(presupuestos.reduce((s, p) => s + p.total, 0))}</Text>
                    </View>
                  </View>
                </>
              )}
            </>
          )}

          {/* ── MOVIMIENTOS ─────────────────────────────────────────────────── */}
          {tab === "movimientos" && (
            <>
              <View style={styles.movSummaryRow}>
                <View style={[styles.movSummary, { borderColor: "#86EFAC" }]}>
                  <Text style={styles.movSummaryLabel}>Ingresos totales</Text>
                  <Text style={[styles.movSummaryValue, { color: "#16A34A" }]}>+{formatEur(movimientos.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + m.importe, 0))}</Text>
                </View>
                <View style={[styles.movSummary, { borderColor: "#FCA5A5" }]}>
                  <Text style={styles.movSummaryLabel}>Gastos totales</Text>
                  <Text style={[styles.movSummaryValue, { color: "#DC2626" }]}>-{formatEur(movimientos.filter((m) => m.tipo === "gasto").reduce((s, m) => s + m.importe, 0))}</Text>
                </View>
              </View>
              <Text style={styles.sectionTitle}>Historial</Text>
              {movimientos.length === 0 ? (
                <View style={styles.emptyBox}><Ionicons name="receipt-outline" size={32} color="#D1D5DB" /><Text style={styles.emptyText}>Sin movimientos</Text></View>
              ) : (
                movimientos.map((m) => (
                  <View key={m.id} style={styles.movRow}>
                    <View style={[styles.movIcon, { backgroundColor: m.tipo === "ingreso" ? "#DCFCE7" : m.tipo_gasto === "repartido" ? "#F5F3FF" : "#FEE2E2" }]}>
                      <Ionicons
                        name={m.tipo === "ingreso" ? "arrow-down" : m.tipo_gasto === "repartido" ? "people" : "arrow-up"}
                        size={18}
                        color={m.tipo === "ingreso" ? "#16A34A" : m.tipo_gasto === "repartido" ? "#7C3AED" : "#DC2626"}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.movConcepto}>{m.concepto}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <Text style={styles.movFecha}>{formatFecha(m.fecha)}</Text>
                        {m.tipo_gasto === "repartido" && (
                          <View style={styles.repartidoBadge}><Text style={styles.repartidoBadgeText}>Repartido</Text></View>
                        )}
                      </View>
                    </View>
                    <Text style={[styles.movImporte, { color: m.tipo === "ingreso" ? "#16A34A" : m.tipo_gasto === "repartido" ? "#7C3AED" : "#DC2626" }]}>
                      {m.tipo === "ingreso" ? "+" : "-"}{formatEur(m.importe)}
                    </Text>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* TAB BAR */}
      <View style={[styles.bottomTabBar, { height: TAB_BAR_HEIGHT }]}>
        <TabButton icon="home-outline" label="Inicio" onPress={() => router.push("/(tabs)")} />
        <TabButton icon="chatbubble-ellipses-outline" label="Chats" onPress={() => router.push("/(tabs)/chat")} />
        <TabButton icon="bar-chart-outline" label="Economia" onPress={() => router.push("/(tabs)/economia")} active />
        <TabButton icon="people-outline" label="Contactos" onPress={() => {}} />
      </View>

      {/* MODAL CREAR GASTO */}
      {usuario && (
        <ModalCrearGasto
          visible={modalGastoVisible}
          onClose={() => setModalGastoVisible(false)}
          usuario={usuario}
          onGastoCreado={cargarDatos}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Estilos pantalla ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { height: 64, backgroundColor: "#2F67E8", flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 6 },
  backButton: { width: 32, justifyContent: "center", alignItems: "center", marginRight: 4 },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "700" },
  headerAction: { width: 36, alignItems: "center" },
  nuevoGastoBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.2)", borderWidth: 1, borderColor: "rgba(255,255,255,0.4)", paddingVertical: 7, paddingHorizontal: 11, borderRadius: 20 },
  nuevoGastoBtnText: { color: "white", fontSize: 13, fontWeight: "700" },
  tabsRow: { flexDirection: "row", backgroundColor: "white", paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  tabChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#F1F5F9" },
  tabChipActive: { backgroundColor: "#2F67E8" },
  tabChipText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  tabChipTextActive: { color: "white" },
  mesRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", gap: 16 },
  mesBtn: { padding: 6 },
  mesLabel: { fontSize: 15, fontWeight: "700", color: "#1F2937", minWidth: 100, textAlign: "center" },
  content: { padding: 14 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#1F2937", marginBottom: 10, marginTop: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  cargandoText: { color: "#9CA3AF", fontSize: 14 },
  emptyBox: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 13, color: "#9CA3AF" },
  balanceCard: { backgroundColor: "#1E3A8A", borderRadius: 16, padding: 20, marginBottom: 4 },
  balanceLabel: { color: "#93C5FD", fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },
  balanceAmount: { color: "white", fontSize: 32, fontWeight: "800", marginTop: 4 },
  balanceSubtitle: { color: "#6B96D6", fontSize: 11, marginTop: 2 },
  balanceDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: 16 },
  balanceRow: { flexDirection: "row", justifyContent: "space-between" },
  balanceStat: { alignItems: "center", gap: 4 },
  balanceStatLabel: { color: "#93C5FD", fontSize: 10, fontWeight: "600" },
  balanceStatValue: { color: "white", fontSize: 13, fontWeight: "700" },
  progressCard: { backgroundColor: "white", borderRadius: 12, padding: 16, marginBottom: 4, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  progressLabel: { fontSize: 13, fontWeight: "600", color: "#374151" },
  progressPct: { fontSize: 13, fontWeight: "800", color: "#2F67E8" },
  progressBar: { height: 10, backgroundColor: "#E5E7EB", borderRadius: 10, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#2F67E8", borderRadius: 10 },
  progressFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  progressMini: { fontSize: 11, color: "#6B7280" },
  alertRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "white", borderRadius: 10, padding: 12, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: "#DC2626" },
  alertRowTitle: { fontSize: 13, fontWeight: "600", color: "#1F2937" },
  alertRowSub: { fontSize: 11, color: "#DC2626", marginTop: 1 },
  alertRowAmount: { fontSize: 13, fontWeight: "700", color: "#1F2937", marginRight: 8 },
  alertRowBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" },
  repartoRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F5F3FF", borderRadius: 10, padding: 12, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: "#7C3AED" },
  repartoIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center" },
  repartoConcepto: { fontSize: 13, fontWeight: "600", color: "#1F2937" },
  repartoSub: { fontSize: 11, color: "#7C3AED", marginTop: 1 },
  repartoImporte: { fontSize: 13, fontWeight: "800", color: "#7C3AED", marginRight: 8 },
  repartoBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center" },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#E5E7EB" },
  filterChipActive: { backgroundColor: "#1E3A8A" },
  filterChipText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  filterChipTextActive: { color: "white" },
  tableHeader: { flexDirection: "row", backgroundColor: "#E8EDF8", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 4 },
  tableCell: { fontSize: 11, fontWeight: "700", color: "#6B7280", textTransform: "uppercase" },
  tableRow: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 4 },
  tableData: { fontSize: 13, color: "#1F2937" },
  tableDataSub: { fontSize: 10, color: "#9CA3AF", marginTop: 1 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  badgeGreen: { backgroundColor: "#DCFCE7" },
  badgeRed: { backgroundColor: "#FEE2E2" },
  badgeText: { fontSize: 10, fontWeight: "700" },
  tableTotal: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 12, marginTop: 4, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  tableTotalLabel: { fontSize: 13, fontWeight: "700", color: "#374151" },
  tableTotalValue: { fontSize: 13, fontWeight: "800", color: "#2F67E8" },
  budgetCard: { backgroundColor: "white", borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  budgetHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  budgetDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  budgetName: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1F2937" },
  budgetPct: { fontSize: 13, fontWeight: "800" },
  budgetBar: { height: 8, backgroundColor: "#F3F4F6", borderRadius: 10, overflow: "hidden" },
  budgetFill: { height: "100%", borderRadius: 10 },
  budgetFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  budgetMini: { fontSize: 11, color: "#6B7280" },
  completadoBadge: { backgroundColor: "#DCFCE7", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginRight: 8 },
  completadoText: { fontSize: 10, fontWeight: "700", color: "#15803D" },
  movSummaryRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  movSummary: { flex: 1, backgroundColor: "white", borderRadius: 10, padding: 12, borderWidth: 1.5 },
  movSummaryLabel: { fontSize: 11, fontWeight: "600", color: "#6B7280", marginBottom: 4 },
  movSummaryValue: { fontSize: 16, fontWeight: "800" },
  movRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "white", borderRadius: 10, padding: 12, marginBottom: 6 },
  movIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  movConcepto: { fontSize: 13, fontWeight: "600", color: "#1F2937" },
  movFecha: { fontSize: 11, color: "#9CA3AF" },
  movImporte: { fontSize: 14, fontWeight: "800" },
  repartidoBadge: { backgroundColor: "#EDE9FE", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  repartidoBadgeText: { fontSize: 9, fontWeight: "700", color: "#7C3AED" },
  bottomTabBar: { borderTopWidth: 1, borderTopColor: "#D1D5DB", flexDirection: "row", backgroundColor: "white" },
});

// ─── Estilos modal ────────────────────────────────────────────────────────────

const mStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "white" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  cancelar: { color: "#6B7280", fontSize: 15 },
  titulo: { fontSize: 17, fontWeight: "700", color: "#111827" },
  guardarBtn: { backgroundColor: "#2F67E8", paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20 },
  guardarBtnText: { color: "white", fontWeight: "700", fontSize: 14 },
  section: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
  label: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 10 },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#111827", backgroundColor: "#F9FAFB" },
  tipoRow: { flexDirection: "row", gap: 10 },
  tipoBtn: { flex: 1, borderRadius: 14, padding: 14, backgroundColor: "#F9FAFB", borderWidth: 1.5, borderColor: "#E5E7EB", gap: 6, alignItems: "flex-start" },
  tipoBtnActive: { backgroundColor: "#2F67E8", borderColor: "#2F67E8" },
  tipoBtnActiveReparto: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },
  tipoBtnText: { fontSize: 13, fontWeight: "700", color: "#374151" },
  tipoBtnTextActive: { color: "white" },
  tipoBtnSub: { fontSize: 11, color: "#9CA3AF", lineHeight: 15 },
  previewBox: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginTop: 4, backgroundColor: "#F5F3FF", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#DDD6FE" },
  previewText: { fontSize: 13, color: "#374151", flex: 1 },
  vecinosHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  selTodosText: { fontSize: 12, color: "#7C3AED", fontWeight: "700" },
  vecinoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", gap: 10 },
  vecinoAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" },
  vecinoIniciales: { fontSize: 14, fontWeight: "700", color: "#2F67E8" },
  vecinoNombre: { flex: 1, fontSize: 14, fontWeight: "500", color: "#111827" },
  vecinoImporte: { fontSize: 13, fontWeight: "700", color: "#7C3AED" },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center" },
  checkboxSel: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },
});