// app/(tabs)/votaciones.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomTabBar, { TAB_BAR_HEIGHT } from "../../components/BottomTabBar";
import { supabase } from "../../src/lib/supabase";

type Opcion = { id: string; texto: string; votos: number };
type Encuesta = {
  id: string;
  pregunta: string;
  activa: boolean;
  created_at: string;
  opciones: Opcion[];
  miVoto: string | null; // opcion_id que voté
  totalVotos: number;
};
type UsuarioSesion = { id: string; rol: string; comunidad_id: string };

export default function VotacionesScreen() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargandoUsuario, setCargandoUsuario] = useState(true);
  const [encuestas, setEncuestas] = useState<Encuesta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [votandoId, setVotandoId] = useState<string | null>(null);

  // Modal nueva encuesta
  const [modalVisible, setModalVisible] = useState(false);
  const [nuevaPregunta, setNuevaPregunta] = useState("");
  const [nuevasOpciones, setNuevasOpciones] = useState(["", ""]);
  const [guardando, setGuardando] = useState(false);

  const esPresidente = usuario?.rol === "PRESIDENTE";

  // 1. Cargar usuario
  useEffect(() => {
    const cargar = async () => {
      setCargandoUsuario(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setCargandoUsuario(false); return; }
      const { data } = await supabase
        .from("usuario").select("id, rol, comunidad_id")
        .eq("email", user.email).single();
      if (data) setUsuario(data);
      setCargandoUsuario(false);
    };
    cargar();
  }, []);

  // 2. Cargar encuestas
  const cargarEncuestas = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);

    const { data: enc } = await supabase
      .from("encuesta")
      .select("id, pregunta, activa, created_at")
      .eq("comunidad_id", usuario.comunidad_id)
      .order("created_at", { ascending: false });

    if (!enc) { setCargando(false); return; }

    const resultado: Encuesta[] = [];

    for (const e of enc) {
      // Opciones con conteo de votos
      const { data: opciones } = await supabase
        .from("encuesta_opcion")
        .select("id, texto")
        .eq("encuesta_id", e.id);

      const opcionesConVotos: Opcion[] = [];
      let totalVotos = 0;

      for (const op of (opciones ?? [])) {
        const { count } = await supabase
          .from("encuesta_respuesta")
          .select("id", { count: "exact", head: true })
          .eq("opcion_id", op.id);
        const v = count ?? 0;
        totalVotos += v;
        opcionesConVotos.push({ id: op.id, texto: op.texto, votos: v });
      }

      // Mi voto
      const { data: miResp } = await supabase
        .from("encuesta_respuesta")
        .select("opcion_id")
        .eq("encuesta_id", e.id)
        .eq("usuario_id", usuario.id)
        .limit(1);

      resultado.push({
        ...e,
        opciones: opcionesConVotos,
        miVoto: miResp && miResp.length > 0 ? miResp[0].opcion_id : null,
        totalVotos,
      });
    }

    setEncuestas(resultado);
    setCargando(false);
  }, [usuario]);

  useEffect(() => { if (usuario) cargarEncuestas(); }, [usuario, cargarEncuestas]);

  const onRefresh = async () => { setRefreshing(true); await cargarEncuestas(); setRefreshing(false); };

  // 3. Votar
  const votar = async (encuesta: Encuesta, opcionId: string) => {
    if (!usuario || encuesta.miVoto) return;
    setVotandoId(opcionId);

    const { error } = await supabase.from("encuesta_respuesta").insert({
      encuesta_id: encuesta.id,
      opcion_id: opcionId,
      usuario_id: usuario.id,
    });

    if (error) {
      Alert.alert("Error", "No se pudo registrar tu voto.");
    } else {
      await cargarEncuestas();
    }
    setVotandoId(null);
  };

  // 4. Cerrar votacion (presidente)
  const cerrarVotacion = (encuesta: Encuesta) => {
    Alert.alert("Cerrar votacion", "Los vecinos ya no podran votar. Continuar?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar", style: "destructive",
        onPress: async () => {
          await supabase.from("encuesta").update({ activa: false }).eq("id", encuesta.id);
          await cargarEncuestas();
        },
      },
    ]);
  };

  // 5. Crear encuesta
  const crearEncuesta = async () => {
    const pregunta = nuevaPregunta.trim();
    const opts = nuevasOpciones.map((o) => o.trim()).filter((o) => o.length > 0);

    if (!pregunta) { Alert.alert("Escribe la pregunta"); return; }
    if (opts.length < 2) { Alert.alert("Minimo 2 opciones"); return; }

    setGuardando(true);

    const { data: nueva, error } = await supabase.from("encuesta").insert({
      comunidad_id: usuario!.comunidad_id,
      creada_por: usuario!.id,
      pregunta,
      activa: true,
    }).select("id").single();

    if (error || !nueva) {
      setGuardando(false);
      Alert.alert("Error", "No se pudo crear la encuesta.");
      return;
    }

    const opcionesInsert = opts.map((texto) => ({
      encuesta_id: nueva.id,
      texto,
    }));
    await supabase.from("encuesta_opcion").insert(opcionesInsert);

    setGuardando(false);
    setModalVisible(false);
    setNuevaPregunta("");
    setNuevasOpciones(["", ""]);
    await cargarEncuestas();
  };

  const addOpcion = () => {
    if (nuevasOpciones.length >= 6) return;
    setNuevasOpciones([...nuevasOpciones, ""]);
  };

  const updateOpcion = (index: number, text: string) => {
    const copia = [...nuevasOpciones];
    copia[index] = text;
    setNuevasOpciones(copia);
  };

  const removeOpcion = (index: number) => {
    if (nuevasOpciones.length <= 2) return;
    setNuevasOpciones(nuevasOpciones.filter((_, i) => i !== index));
  };

  const activas = encuestas.filter((e) => e.activa);
  const cerradas = encuestas.filter((e) => !e.activa);

  if (cargandoUsuario) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}><Text style={styles.headerTitle}>Votaciones</Text></View>
        <View style={styles.centered}><ActivityIndicator size="large" color="#2F67E8" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>Votaciones</Text>
        <View style={{ flex: 1 }} />
        {esPresidente && (
          <Pressable style={styles.nuevoBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={16} color="white" />
            <Text style={styles.nuevoBtnText}>Nueva</Text>
          </Pressable>
        )}
      </View>

      {cargando ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#2F67E8" /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 14, paddingBottom: TAB_BAR_HEIGHT + 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2F67E8" />}
        >
          {/* ACTIVAS */}
          <Text style={styles.sectionTitle}>
            Votaciones activas ({activas.length})
          </Text>

          {activas.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="checkbox-outline" size={36} color="#D1D5DB" />
              <Text style={styles.emptyText}>No hay votaciones activas</Text>
            </View>
          ) : (
            activas.map((enc) => (
              <View key={enc.id} style={styles.encuestaCard}>
                <View style={styles.encuestaHeader}>
                  <View style={styles.activeBadge}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeBadgeText}>Activa</Text>
                  </View>
                  {esPresidente && (
                    <Pressable onPress={() => cerrarVotacion(enc)} style={styles.cerrarBtn}>
                      <Text style={styles.cerrarBtnText}>Cerrar</Text>
                    </Pressable>
                  )}
                </View>
                <Text style={styles.pregunta}>{enc.pregunta}</Text>
                <Text style={styles.totalVotos}>{enc.totalVotos} voto{enc.totalVotos !== 1 ? "s" : ""}</Text>

                {enc.opciones.map((op) => {
                  const pct = enc.totalVotos > 0 ? Math.round((op.votos / enc.totalVotos) * 100) : 0;
                  const esLaVotada = enc.miVoto === op.id;
                  const yaVoto = !!enc.miVoto;

                  return (
                    <Pressable
                      key={op.id}
                      style={[styles.opcionRow, esLaVotada && styles.opcionVotada]}
                      onPress={() => !yaVoto && votar(enc, op.id)}
                      disabled={yaVoto || votandoId === op.id}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={styles.opcionHeader}>
                          <Text style={[styles.opcionTexto, esLaVotada && { color: "#2F67E8", fontWeight: "800" }]}>
                            {op.texto}
                          </Text>
                          {esLaVotada && <Ionicons name="checkmark-circle" size={18} color="#2F67E8" />}
                        </View>
                        {yaVoto && (
                          <View style={styles.barContainer}>
                            <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: esLaVotada ? "#2F67E8" : "#D1D5DB" }]} />
                          </View>
                        )}
                      </View>
                      {yaVoto && (
                        <Text style={[styles.pctText, esLaVotada && { color: "#2F67E8" }]}>{pct}%</Text>
                      )}
                      {votandoId === op.id && <ActivityIndicator size="small" color="#2F67E8" />}
                    </Pressable>
                  );
                })}

                {!enc.miVoto && (
                  <Text style={styles.votaHint}>Pulsa una opcion para votar</Text>
                )}
              </View>
            ))
          )}

          {/* CERRADAS */}
          {cerradas.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 10 }]}>
                Votaciones anteriores ({cerradas.length})
              </Text>

              {cerradas.map((enc) => {
                const ganadora = enc.opciones.reduce((max, o) => o.votos > max.votos ? o : max, enc.opciones[0]);
                return (
                  <View key={enc.id} style={[styles.encuestaCard, { borderLeftColor: "#9CA3AF" }]}>
                    <View style={styles.cerradaBadge}>
                      <Text style={styles.cerradaBadgeText}>Cerrada</Text>
                    </View>
                    <Text style={styles.pregunta}>{enc.pregunta}</Text>
                    <Text style={styles.totalVotos}>{enc.totalVotos} voto{enc.totalVotos !== 1 ? "s" : ""}</Text>

                    {enc.opciones.map((op) => {
                      const pct = enc.totalVotos > 0 ? Math.round((op.votos / enc.totalVotos) * 100) : 0;
                      const esGanadora = op.id === ganadora?.id && op.votos > 0;
                      return (
                        <View key={op.id} style={styles.opcionRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.opcionTexto, esGanadora && { fontWeight: "800", color: "#16A34A" }]}>
                              {op.texto} {esGanadora && "✓"}
                            </Text>
                            <View style={styles.barContainer}>
                              <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: esGanadora ? "#16A34A" : "#D1D5DB" }]} />
                            </View>
                          </View>
                          <Text style={[styles.pctText, esGanadora && { color: "#16A34A" }]}>{pct}%</Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}

      <BottomTabBar />

      {/* MODAL NUEVA ENCUESTA */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalSafe} edges={["top"]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Nueva votacion</Text>
            <Pressable onPress={crearEncuesta} disabled={guardando} style={[styles.modalSave, guardando && { opacity: 0.5 }]}>
              {guardando ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.modalSaveText}>Crear</Text>}
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 18 }}>
            <Text style={styles.inputLabel}>Pregunta</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Aprobamos la reforma del portal?"
              placeholderTextColor="#9CA3AF"
              value={nuevaPregunta}
              onChangeText={setNuevaPregunta}
              maxLength={150}
              multiline
            />

            <Text style={[styles.inputLabel, { marginTop: 20 }]}>Opciones de respuesta</Text>
            {nuevasOpciones.map((op, i) => (
              <View key={i} style={styles.opcionInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder={`Opcion ${i + 1}`}
                  placeholderTextColor="#9CA3AF"
                  value={op}
                  onChangeText={(t) => updateOpcion(i, t)}
                  maxLength={60}
                />
                {nuevasOpciones.length > 2 && (
                  <Pressable onPress={() => removeOpcion(i)} style={styles.removeOpcionBtn}>
                    <Ionicons name="close-circle" size={22} color="#DC2626" />
                  </Pressable>
                )}
              </View>
            ))}

            {nuevasOpciones.length < 6 && (
              <Pressable style={styles.addOpcionBtn} onPress={addOpcion}>
                <Ionicons name="add-circle-outline" size={20} color="#2F67E8" />
                <Text style={styles.addOpcionText}>Añadir opcion</Text>
              </Pressable>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4FB" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    height: 64, backgroundColor: "#2F67E8",
    flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 6,
  },
  backBtn: { width: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "700" },
  nuevoBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)", borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)", paddingVertical: 7,
    paddingHorizontal: 11, borderRadius: 20,
  },
  nuevoBtnText: { color: "white", fontSize: 13, fontWeight: "700" },

  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#1F2937", marginBottom: 10, marginTop: 16 },
  emptyBox: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 13, color: "#9CA3AF" },

  encuestaCard: {
    backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 12,
    borderLeftWidth: 3, borderLeftColor: "#2F67E8",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  encuestaHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#DCFCE7", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#16A34A" },
  activeBadgeText: { fontSize: 11, fontWeight: "700", color: "#16A34A" },
  cerradaBadge: { backgroundColor: "#F3F4F6", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 8 },
  cerradaBadgeText: { fontSize: 11, fontWeight: "700", color: "#6B7280" },
  cerrarBtn: { backgroundColor: "#FEE2E2", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  cerrarBtnText: { fontSize: 12, fontWeight: "700", color: "#DC2626" },

  pregunta: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 4 },
  totalVotos: { fontSize: 12, color: "#9CA3AF", marginBottom: 12 },

  opcionRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: "#F3F4F6",
  },
  opcionVotada: { borderColor: "#2F67E8", backgroundColor: "#EEF2FF" },
  opcionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  opcionTexto: { fontSize: 14, fontWeight: "600", color: "#374151" },
  barContainer: { height: 6, backgroundColor: "#E5E7EB", borderRadius: 6, overflow: "hidden", marginTop: 6 },
  barFill: { height: "100%", borderRadius: 6 },
  pctText: { fontSize: 14, fontWeight: "800", color: "#6B7280", minWidth: 38, textAlign: "right" },
  votaHint: { fontSize: 12, color: "#9CA3AF", textAlign: "center", marginTop: 6 },

  // Modal
  modalSafe: { flex: 1, backgroundColor: "white" },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  modalCancel: { fontSize: 15, color: "#6B7280" },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  modalSave: { backgroundColor: "#2F67E8", paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20 },
  modalSaveText: { color: "white", fontWeight: "700", fontSize: 14 },
  inputLabel: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: "#111827", backgroundColor: "#F9FAFB",
  },
  opcionInputRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  removeOpcionBtn: { padding: 4 },
  addOpcionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10 },
  addOpcionText: { fontSize: 14, fontWeight: "600", color: "#2F67E8" },
});