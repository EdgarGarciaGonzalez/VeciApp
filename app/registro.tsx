// app/registro.tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";

export default function RegistroScreen() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const registrarse = async () => {
    if (!nombre.trim() || !email.trim() || password.length < 6) {
      Alert.alert(
        "Datos invalidos",
        "Rellena nombre, email y contrasena (minimo 6 caracteres)."
      );
      return;
    }

    setLoading(true);

    // 1. Crear usuario en Supabase Auth
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setLoading(false);
      Alert.alert("Error al registrarse", error.message);
      return;
    }

    // 2. Insertar perfil SIN comunidad (se asignara en /comunidad)
    const { error: insertError } = await supabase.from("usuario").insert([
      {
        comunidad_id: null,
        rol: "PROPIETARIO",
        nombre: nombre.trim(),
        apellidos: apellidos.trim() || null,
        email: email.trim().toLowerCase(),
        telefono: telefono.trim() || null,
      },
    ]);

    setLoading(false);

    if (insertError) {
      Alert.alert("Error al crear perfil", insertError.message);
      return;
    }

    // 3. Redirigir a la pantalla de comunidad
    Alert.alert(
      "Cuenta creada!",
      "Ahora elige crear o unirte a una comunidad.",
      [{ text: "Continuar", onPress: () => router.replace("/comunidad") }]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VeciApp</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, paddingTop: 26 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.subtitle}>
          Registrate para gestionar tu comunidad
        </Text>

        <Text style={styles.label}>Nombre *</Text>
        <TextInput value={nombre} onChangeText={setNombre} style={styles.input} placeholderTextColor="#9CA3AF" placeholder="Tu nombre" />

        <Text style={styles.label}>Apellidos</Text>
        <TextInput value={apellidos} onChangeText={setApellidos} style={styles.input} placeholderTextColor="#9CA3AF" placeholder="Tus apellidos" />

        <Text style={styles.label}>Telefono</Text>
        <TextInput value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" style={styles.input} placeholderTextColor="#9CA3AF" placeholder="600 123 456" />

        <Text style={styles.label}>Email *</Text>
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} placeholderTextColor="#9CA3AF" placeholder="tu@email.com" />

        <Text style={styles.label}>Contrasena *</Text>
        <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} placeholderTextColor="#9CA3AF" placeholder="Minimo 6 caracteres" />

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
          <Text style={{ color: "#2F67E8", fontWeight: "700" }}>
            Ya tengo cuenta - Iniciar sesion
          </Text>
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4FB" },
  header: { height: 64, backgroundColor: "#2F67E8", justifyContent: "center", paddingHorizontal: 18 },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "800" },
  title: { fontSize: 26, fontWeight: "800", marginBottom: 6, color: "#111827" },
  subtitle: { color: "#6B7280", marginBottom: 22 },
  label: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
    backgroundColor: "#F9FAFB", fontSize: 15, color: "#111827",
  },
  button: {
    backgroundColor: "#2F67E8", padding: 15, borderRadius: 12,
    alignItems: "center", marginTop: 10,
  },
  buttonText: { color: "white", fontWeight: "800", fontSize: 15 },
});