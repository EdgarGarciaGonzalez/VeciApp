// app/nueva-incidencia.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";

const PRIORIDADES = [
  { value: 1, label: "Baja", color: "#6B7280", bg: "#F3F4F6" },
  { value: 2, label: "Media", color: "#D97706", bg: "#FEF3C7" },
  { value: 3, label: "Alta", color: "#DC2626", bg: "#FEE2E2" },
] as const;

export default function NuevaIncidenciaScreen() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prioridad, setPrioridad] = useState<1 | 2 | 3>(2);
  const [guardando, setGuardando] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [comunidadId, setComunidadId] = useState<string | null>(null);

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      const { data } = await supabase
        .from("usuario").select("id, comunidad_id")
        .eq("email", user.email).single();
      if (data) {
        setUserId(data.id);
        setComunidadId(data.comunidad_id);
      }
    };
    cargar();
  }, []);

  const crear = async () => {
    if (!titulo.trim()) { Alert.alert("Falta titulo", "Escribe un titulo para la incidencia."); return; }
    if (!comunidadId || !userId) { Alert.alert("Error", "No se pudo identificar tu perfil."); return; }

    setGuardando(true);
    const { error } = await supabase.from("incidencia").insert({
      comunidad_id: comunidadId,
      creada_por: userId,
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      prioridad,
      estado: "ABIERTA",
    });
    setGuardando(false);

    if (error) { Alert.alert("Error", error.message); return; }
    Alert.alert("Creada", "Incidencia registrada correctamente.");
    router.back();
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="white" />
        </Pressable>
        <Text style={s.headerTitle}>Nueva incidencia</Text>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={crear}
          disabled={guardando}
          style={[s.saveBtn, guardando && { opacity: 0.5 }]}
        >
          {guardando
            ? <ActivityIndicator size="small" color="white" />
            : <Text style={s.saveBtnText}>Crear</Text>}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>Titulo</Text>
        <TextInput
          style={s.input}
          placeholder="Ej: Luz fundida en el portal"
          placeholderTextColor="#9CA3AF"
          value={titulo}
          onChangeText={setTitulo}
          maxLength={100}
        />

        <Text style={s.label}>Descripcion (opcional)</Text>
        <TextInput
          style={[s.input, { minHeight: 120, textAlignVertical: "top" }]}
          placeholder="Describe el problema con detalle..."
          placeholderTextColor="#9CA3AF"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          maxLength={500}
        />

        <Text style={s.label}>Prioridad</Text>
        <View style={s.prioridadRow}>
          {PRIORIDADES.map((p) => {
            const sel = prioridad === p.value;
            return (
              <Pressable
                key={p.value}
                onPress={() => setPrioridad(p.value as 1 | 2 | 3)}
                style={[
                  s.prioridadBtn,
                  { borderColor: sel ? p.color : "#E5E7EB", backgroundColor: sel ? p.bg : "white" },
                ]}
              >
                <View style={[s.prioridadDot, { backgroundColor: p.color }]} />
                <Text style={[s.prioridadText, { color: sel ? p.color : "#6B7280", fontWeight: sel ? "800" : "600" }]}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4FB" },
  header: {
    height: 64, backgroundColor: "#2F67E8",
    flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 8,
  },
  backBtn: { width: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "700" },
  saveBtn: {
    backgroundColor: "rgba(255,255,255,0.2)", borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)", paddingVertical: 7,
    paddingHorizontal: 14, borderRadius: 20,
  },
  saveBtnText: { color: "white", fontSize: 14, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8, marginTop: 14 },
  input: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: "#111827", backgroundColor: "white",
  },
  prioridadRow: { flexDirection: "row", gap: 10 },
  prioridadBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 2,
  },
  prioridadDot: { width: 10, height: 10, borderRadius: 5 },
  prioridadText: { fontSize: 14 },
});