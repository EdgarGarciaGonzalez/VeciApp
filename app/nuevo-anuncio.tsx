// app/nuevo-anuncio.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";

export default function NuevoAnuncioScreen() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [comunidadId, setComunidadId] = useState<string | null>(null);

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      const { data } = await supabase
        .from("usuario").select("comunidad_id")
        .eq("email", user.email).single();
      if (data?.comunidad_id) setComunidadId(data.comunidad_id);
    };
    cargar();
  }, []);

  const crearAnuncio = async () => {
    if (!titulo.trim()) { Alert.alert("Falta titulo", "Escribe un titulo para el anuncio."); return; }
    if (!comunidadId) { Alert.alert("Error", "No se pudo identificar tu comunidad."); return; }

    setGuardando(true);
    const { error } = await supabase.from("anuncio").insert({
      comunidad_id: comunidadId,
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
    });
    setGuardando(false);

    if (error) { Alert.alert("Error", error.message); return; }
    Alert.alert("Publicado", "Anuncio creado correctamente.");
    router.back();
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="white" />
        </Pressable>
        <Text style={s.headerTitle}>Nuevo anuncio</Text>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={crearAnuncio}
          disabled={guardando}
          style={[s.saveBtn, guardando && { opacity: 0.5 }]}
        >
          {guardando
            ? <ActivityIndicator size="small" color="white" />
            : <Text style={s.saveBtnText}>Publicar</Text>}
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>Titulo</Text>
        <TextInput
          style={s.input}
          placeholder="Ej: Corte de agua manana"
          placeholderTextColor="#9CA3AF"
          value={titulo}
          onChangeText={setTitulo}
          maxLength={100}
        />

        <Text style={s.label}>Descripcion (opcional)</Text>
        <TextInput
          style={[s.input, { minHeight: 120, textAlignVertical: "top" }]}
          placeholder="Escribe los detalles del anuncio..."
          placeholderTextColor="#9CA3AF"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          maxLength={500}
        />
      </ScrollView>
      </KeyboardAvoidingView>
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
});