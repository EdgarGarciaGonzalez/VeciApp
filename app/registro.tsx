import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../src/lib/supabase";

export default function RegistroScreen() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ⚠️ PON AQUÍ EL ID REAL DE TU COMUNIDAD
  const COMUNIDAD_ID = "752e8ca8-c8d0-441a-a76a-4e3d2069eb87";

  const registrarse = async () => {
    if (!COMUNIDAD_ID || COMUNIDAD_ID.includes("PEGA")) {
      Alert.alert(
        "Falta configurar comunidad",
        "Pon el ID real de tu comunidad en registro.tsx"
      );
      return;
    }

    if (!nombre.trim() || !email.trim() || password.length < 6) {
      Alert.alert(
        "Datos inválidos",
        "Rellena nombre, email y contraseña (mínimo 6 caracteres)."
      );
      return;
    }

    setLoading(true);

    // 1️⃣ Crear usuario en Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setLoading(false);
      Alert.alert("Error al registrarse", error.message);
      return;
    }

    // 2️⃣ Insertar perfil en tabla usuario
    const { error: insertError } = await supabase.from("usuario").insert([
      {
        comunidad_id: COMUNIDAD_ID,
        rol: "PROPIETARIO",
        nombre: nombre.trim(),
        apellidos: apellidos.trim() || null,
        email: email.trim().toLowerCase(),
        telefono: telefono.trim() || null,
      },
    ]);

    setLoading(false);

    if (insertError) {
      Alert.alert(
        "Usuario creado, pero fallo perfil",
        insertError.message +
          "\n\nSi estás probando, desactiva RLS en la tabla usuario."
      );
      return;
    }

    Alert.alert("Cuenta creada", "Ahora puedes iniciar sesión.");
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VeciApp</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, paddingTop: 26 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.subtitle}>
          Regístrate para acceder a tu comunidad
        </Text>

        <Text style={styles.label}>Nombre *</Text>
        <TextInput
          value={nombre}
          onChangeText={setNombre}
          style={styles.input}
        />

        <Text style={styles.label}>Apellidos</Text>
        <TextInput
          value={apellidos}
          onChangeText={setApellidos}
          style={styles.input}
        />

        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          value={telefono}
          onChangeText={setTelefono}
          keyboardType="phone-pad"
          style={styles.input}
        />

        <Text style={styles.label}>Email *</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <Text style={styles.label}>Contraseña *</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <Pressable
          onPress={registrarse}
          disabled={loading}
          style={[styles.button, loading && { opacity: 0.6 }]}
        >
          <Text style={styles.buttonText}>
            {loading ? "Creando..." : "Crear cuenta"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace("/login")}
          style={{ marginTop: 14, alignSelf: "center" }}
        >
          <Text style={{ color: "#1E40AF", fontWeight: "700" }}>
            Ya tengo cuenta · Iniciar sesión
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "white" },

  header: {
    height: 64,
    backgroundColor: "#0B3CCF",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "700" },

  title: { fontSize: 26, fontWeight: "800", marginBottom: 6 },
  subtitle: { color: "#666", marginBottom: 22 },

  label: { fontSize: 14, fontWeight: "800", marginBottom: 6 },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "white",
  },

  button: {
    backgroundColor: "#111827",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  buttonText: { color: "white", fontWeight: "800", fontSize: 15 },
});