import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../src/lib/supabase";

type EventoComunidad = {
  id: string;
  titulo: string;
  descripcion: string | null;
  hora: string;
  tipo: "reunion" | "mantenimiento" | "otro";
  fecha: string;
};

const TIPO_COLORES: Record<EventoComunidad["tipo"], string> = {
  reunion: "#3B82F6",
  mantenimiento: "#F59E0B",
  otro: "#8B5CF6",
};

const TIPO_LABELS: Record<EventoComunidad["tipo"], string> = {
  reunion: "Reunión",
  mantenimiento: "Mantenimiento",
  otro: "Otro",
};

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const DIAS_SEMANA = ["L","M","X","J","V","S","D"];

function toKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

export default function CalendarioComunidad() {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [diaSeleccionado, setDiaSeleccionado] = useState<string>(toKey(hoy));
  const [eventos, setEventos] = useState<EventoComunidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [comunidadId, setComunidadId] = useState<string | null>(null);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevoDesc, setNuevoDesc] = useState("");
  const [nuevoHora, setNuevoHora] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<EventoComunidad["tipo"]>("reunion");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Obtener usuario y comunidad_id al montar
  useEffect(() => {
    const obtenerUsuario = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const { data: usuarioData } = await supabase
        .from("usuario")
        .select("id, comunidad_id")
        .eq("email", authData.user.email)
        .single();
      if (usuarioData) {
        setUsuarioId(usuarioData.id);
        setComunidadId(usuarioData.comunidad_id);
      }
    };
    obtenerUsuario();
  }, []);

  // Cargar eventos del mes desde Supabase
  const cargarEventos = useCallback(async () => {
    if (!comunidadId) return;
    setLoading(true);
    const fechaInicio = `${anio}-${String(mes+1).padStart(2,"0")}-01`;
    const ultimoDiaN = new Date(anio, mes+1, 0).getDate();
    const fechaFin = `${anio}-${String(mes+1).padStart(2,"0")}-${String(ultimoDiaN).padStart(2,"0")}`;
    const { data, error } = await supabase
      .from("evento")
      .select("id, titulo, descripcion, hora, tipo, fecha")
      .eq("comunidad_id", comunidadId)
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin)
      .order("hora", { ascending: true });
    if (!error && data) setEventos(data as EventoComunidad[]);
    setLoading(false);
  }, [comunidadId, mes, anio]);

  useEffect(() => { cargarEventos(); }, [cargarEventos]);

  // Cuadrícula del mes
  const primerDia = new Date(anio, mes, 1);
  const ultimoDia = new Date(anio, mes+1, 0);
  let offsetInicio = primerDia.getDay() - 1;
  if (offsetInicio < 0) offsetInicio = 6;
  const celdas: (number | null)[] = [
    ...Array(offsetInicio).fill(null),
    ...Array.from({ length: ultimoDia.getDate() }, (_, i) => i+1),
  ];

  const eventosPorFecha: Record<string, EventoComunidad[]> = {};
  for (const ev of eventos) {
    if (!eventosPorFecha[ev.fecha]) eventosPorFecha[ev.fecha] = [];
    eventosPorFecha[ev.fecha].push(ev);
  }
  const eventosDelDia = eventosPorFecha[diaSeleccionado] ?? [];

  const irMesAnterior = () => {
    if (mes === 0) { setMes(11); setAnio(a => a-1); } else setMes(m => m-1);
  };
  const irMesSiguiente = () => {
    if (mes === 11) { setMes(0); setAnio(a => a+1); } else setMes(m => m+1);
  };

  // Guardar en Supabase
  const guardarEvento = async () => {
    if (!nuevoTitulo.trim()) return;
    if (!comunidadId) { setErrorMsg("No se pudo obtener la comunidad."); return; }
    setGuardando(true);
    setErrorMsg(null);
    const { data, error } = await supabase
      .from("evento")
      .insert({
        comunidad_id: comunidadId,
        creado_por: usuarioId,
        titulo: nuevoTitulo.trim(),
        descripcion: nuevoDesc.trim() || null,
        hora: nuevoHora.trim() || "00:00",
        tipo: nuevoTipo,
        fecha: diaSeleccionado,
      })
      .select("id, titulo, descripcion, hora, tipo, fecha")
      .single();
    if (error) { setErrorMsg(error.message); setGuardando(false); return; }
    if (data) setEventos(prev => [...prev, data as EventoComunidad]);
    setNuevoTitulo(""); setNuevoDesc(""); setNuevoHora(""); setNuevoTipo("reunion");
    setGuardando(false);
    setModalVisible(false);
  };

  // Eliminar de Supabase
  const eliminarEvento = async (id: string) => {
    const { error } = await supabase.from("evento").delete().eq("id", id);
    if (!error) setEventos(prev => prev.filter(e => e.id !== id));
  };

  return (
    <View>
      {/* Cabecera mes */}
      <View style={styles.calHeader}>
        <Pressable onPress={irMesAnterior} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color="#1E3A8A" />
        </Pressable>
        <Text style={styles.calMes}>{MESES[mes]} {anio}</Text>
        <Pressable onPress={irMesSiguiente} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color="#1E3A8A" />
        </Pressable>
      </View>

      {/* Días semana */}
      <View style={styles.weekRow}>
        {DIAS_SEMANA.map(d => (
          <Text key={d} style={styles.weekLabel}>{d}</Text>
        ))}
      </View>

      {/* Cuadrícula */}
      <View style={styles.grid}>
        {celdas.map((dia, i) => {
          if (dia === null) return <View key={`e-${i}`} style={styles.celda} />;
          const key = `${anio}-${String(mes+1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
          const tieneEvento = !!eventosPorFecha[key];
          const esHoy = key === toKey(hoy);
          const seleccionado = key === diaSeleccionado;
          return (
            <Pressable
              key={key}
              style={[styles.celda, esHoy && styles.celdaHoy, seleccionado && styles.celdaSeleccionada]}
              onPress={() => setDiaSeleccionado(key)}
            >
              <Text style={[styles.celdaTexto, esHoy && styles.celdaTextoHoy, seleccionado && styles.celdaTextoSel]}>
                {dia}
              </Text>
              {tieneEvento && <View style={[styles.dot, seleccionado && { backgroundColor: "white" }]} />}
            </Pressable>
          );
        })}
      </View>

      {/* Eventos del día */}
      <View style={styles.eventosSec}>
        <View style={styles.eventosHeader}>
          <Text style={styles.eventosTitulo}>
            {loading ? "Cargando..." : eventosDelDia.length === 0 ? "Sin eventos" : `${eventosDelDia.length} evento${eventosDelDia.length > 1 ? "s" : ""}`}
          </Text>
          <Pressable style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={16} color="white" />
            <Text style={styles.addBtnText}>Añadir</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color="#0B3CCF" style={{ marginVertical: 12 }} />
        ) : eventosDelDia.length === 0 ? (
          <Text style={styles.sinEventos}>No hay eventos para este día. Añade uno!</Text>
        ) : (
          eventosDelDia.map(ev => (
            <View key={ev.id} style={styles.eventoCard}>
              <View style={[styles.eventoBadge, { backgroundColor: TIPO_COLORES[ev.tipo] + "22" }]}>
                <View style={[styles.eventoPunto, { backgroundColor: TIPO_COLORES[ev.tipo] }]} />
                <Text style={[styles.eventoTipo, { color: TIPO_COLORES[ev.tipo] }]}>{TIPO_LABELS[ev.tipo]}</Text>
              </View>
              <View style={styles.eventoInfo}>
                <Text style={styles.eventoTitulo}>{ev.titulo}</Text>
                {!!ev.descripcion && <Text style={styles.eventoDesc}>{ev.descripcion}</Text>}
                <View style={styles.eventoHoraRow}>
                  <Ionicons name="time-outline" size={12} color="#94A3B8" />
                  <Text style={styles.eventoHora}>{ev.hora}</Text>
                </View>
              </View>
              <Pressable onPress={() => eliminarEvento(ev.id)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={16} color="#CBD5E1" />
              </Pressable>
            </View>
          ))
        )}
      </View>

      {/* Modal añadir evento */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitulo}>Nuevo evento</Text>
          <Text style={styles.sheetFecha}>{diaSeleccionado.split("-").reverse().join("/")}</Text>

          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <Text style={styles.label}>Título *</Text>
          <TextInput style={styles.input} placeholder="Ej: Revisión ascensor" placeholderTextColor="#94A3B8" value={nuevoTitulo} onChangeText={setNuevoTitulo} />

          <Text style={styles.label}>Descripción</Text>
          <TextInput style={[styles.input, styles.inputMulti]} placeholder="Detalles del evento..." placeholderTextColor="#94A3B8" value={nuevoDesc} onChangeText={setNuevoDesc} multiline numberOfLines={3} />

          <Text style={styles.label}>Hora</Text>
          <TextInput style={styles.input} placeholder="19:00" placeholderTextColor="#94A3B8" value={nuevoHora} onChangeText={setNuevoHora} />

          <Text style={styles.label}>Tipo</Text>
          <View style={styles.tiposRow}>
            {(["reunion","mantenimiento","otro"] as const).map(t => (
              <Pressable key={t} style={[styles.tipoChip, nuevoTipo === t && { backgroundColor: TIPO_COLORES[t], borderColor: TIPO_COLORES[t] }]} onPress={() => setNuevoTipo(t)}>
                <Text style={[styles.tipoChipText, nuevoTipo === t && { color: "white" }]}>{TIPO_LABELS[t]}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={[styles.guardarBtn, guardando && { opacity: 0.6 }]} onPress={guardarEvento} disabled={guardando}>
            {guardando ? <ActivityIndicator color="white" /> : <Text style={styles.guardarBtnText}>Guardar evento</Text>}
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  calHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  navBtn: { padding: 6 },
  calMes: { fontSize: 16, fontWeight: "700", color: "#111827" },
  weekRow: { flexDirection: "row", marginBottom: 4 },
  weekLabel: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "600", color: "#94A3B8" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  celda: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  celdaHoy: { borderWidth: 1.5, borderColor: "#0B3CCF" },
  celdaSeleccionada: { backgroundColor: "#0B3CCF" },
  celdaTexto: { fontSize: 13, color: "#374151" },
  celdaTextoHoy: { fontWeight: "700", color: "#0B3CCF" },
  celdaTextoSel: { color: "white", fontWeight: "700" },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#0B3CCF", marginTop: 2 },
  eventosSec: { marginTop: 16 },
  eventosHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  eventosTitulo: { fontSize: 15, fontWeight: "700", color: "#111827" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#0B3CCF", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  addBtnText: { color: "white", fontWeight: "700", fontSize: 13 },
  sinEventos: { fontSize: 13, color: "#94A3B8", textAlign: "center", paddingVertical: 12 },
  eventoCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#F8FAFC", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  eventoBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: "flex-start" },
  eventoPunto: { width: 6, height: 6, borderRadius: 3 },
  eventoTipo: { fontSize: 11, fontWeight: "700" },
  eventoInfo: { flex: 1 },
  eventoTitulo: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 2 },
  eventoDesc: { fontSize: 13, color: "#475569", marginBottom: 4 },
  eventoHoraRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  eventoHora: { fontSize: 12, color: "#94A3B8" },
  deleteBtn: { padding: 4 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, backgroundColor: "#E2E8F0", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  sheetTitulo: { fontSize: 20, fontWeight: "800", color: "#111827", marginBottom: 2 },
  sheetFecha: { fontSize: 13, color: "#64748B", marginBottom: 20 },
  errorBox: { backgroundColor: "#FEE2E2", borderRadius: 8, padding: 10, marginBottom: 12 },
  errorText: { color: "#B91C1C", fontSize: 13 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: "#F1F5F9", borderRadius: 10, padding: 12, fontSize: 14, color: "#111827", borderWidth: 1, borderColor: "#E2E8F0" },
  inputMulti: { height: 80, textAlignVertical: "top" },
  tiposRow: { flexDirection: "row", gap: 8 },
  tipoChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: "#CBD5E1" },
  tipoChipText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  guardarBtn: { marginTop: 24, backgroundColor: "#0B3CCF", borderRadius: 12, padding: 16, alignItems: "center" },
  guardarBtnText: { color: "white", fontWeight: "800", fontSize: 15 },
});