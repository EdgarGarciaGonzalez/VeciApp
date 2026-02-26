import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../src/lib/supabase";

export default function NuevaIncidenciaScreen() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prioridad, setPrioridad] = useState<1 | 2 | 3>(2);
  const [guardando, setGuardando] = useState(false);

  // ⚠️ Para tu proyecto (sin login real aún), usamos un usuario fijo:
  const EMAIL_USUARIO_DEMO = "laura@veciapp.com";

  const crearIncidencia = async () => {
    if (!titulo.trim()) {
      Alert.alert("Falta título", "Escribe un título para la incidencia.");
      return;
    }

    setGuardando(true);

    // 1) Buscar comunidad y usuario demo
    const { data: userRow, error: userErr } = await supabase
      .from("usuario")
      .select("id, comunidad_id")
      .eq("email", EMAIL_USUARIO_DEMO)
      .single();

    if (userErr || !userRow) {
      setGuardando(false);
      Alert.alert("Error", "No se encontró el usuario demo en la tabla usuario.");
      return;
    }

    // 2) Insertar incidencia
    const { error } = await supabase.from("incidencia").insert([
      {
        comunidad_id: userRow.comunidad_id,
        creada_por: userRow.id,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        prioridad,
        estado: "ABIERTA",
      },
    ]);

    setGuardando(false);

    if (error) {
      Alert.alert("Error al crear", error.message);
      return;
    }

    Alert.alert("Listo", "Incidencia creada correctamente.");
    router.back(); // vuelve a la lista
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "white" }} contentContainerStyle={{ padding: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 16 }}>Nueva incidencia</Text>

      <Text style={{ fontWeight: "600", marginBottom: 6 }}>Título</Text>
      <TextInput
        value={titulo}
        onChangeText={setTitulo}
        placeholder="Ej: Luz fundida en el portal"
        style={{
          borderWidth: 1,
          borderColor: "#e5e7eb",
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
        }}
      />

      <Text style={{ fontWeight: "600", marginBottom: 6 }}>Descripción</Text>
      <TextInput
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder="Describe el problema..."
        multiline
        style={{
          borderWidth: 1,
          borderColor: "#e5e7eb",
          borderRadius: 12,
          padding: 12,
          minHeight: 100,
          textAlignVertical: "top",
          marginBottom: 12,
        }}
      />

      <Text style={{ fontWeight: "600", marginBottom: 8 }}>Prioridad</Text>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
        {[1, 2, 3].map((p) => (
          <Pressable
            key={p}
            onPress={() => setPrioridad(p as 1 | 2 | 3)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: prioridad === p ? "#111827" : "#e5e7eb",
              backgroundColor: prioridad === p ? "#111827" : "white",
            }}
          >
            <Text style={{ color: prioridad === p ? "white" : "#111827", fontWeight: "600" }}>
              {p === 1 ? "Baja" : p === 2 ? "Media" : "Alta"}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={crearIncidencia}
        disabled={guardando}
        style={{
          backgroundColor: guardando ? "#9ca3af" : "#111827",
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>
          {guardando ? "Guardando..." : "Crear incidencia"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}