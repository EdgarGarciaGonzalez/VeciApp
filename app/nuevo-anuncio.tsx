import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
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
    if (!titulo.trim()) {
      Alert.alert("Falta titulo", "Escribe un titulo para el anuncio.");
      return;
    }

    if (!comunidadId) {
      Alert.alert("Error", "No se pudo identificar tu comunidad.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase.from("anuncio").insert([
      {
        comunidad_id: comunidadId,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
      },
    ]);

    setGuardando(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    Alert.alert("Listo", "Anuncio creado correctamente.");
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Nuevo anuncio</Text>

        <Text style={styles.label}>Título</Text>
        <TextInput
          value={titulo}
          onChangeText={setTitulo}
          style={styles.input}
          placeholder="Ej: Corte de agua"
        />

        <Text style={styles.label}>Descripción</Text>
        <TextInput
          value={descripcion}
          onChangeText={setDescripcion}
          style={[styles.input, { minHeight: 120 }]}
          multiline
          textAlignVertical="top"
          placeholder="Escribe el anuncio..."
        />

        <Pressable
          style={[styles.button, guardando && { opacity: 0.6 }]}
          onPress={crearAnuncio}
          disabled={guardando}
        >
          <Text style={styles.buttonText}>
            {guardando ? "Guardando..." : "Publicar anuncio"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "white" },
  content: { padding: 18 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 18 },
  label: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    backgroundColor: "white",
  },
  button: {
    backgroundColor: "#111827",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "white", fontWeight: "700" },
});