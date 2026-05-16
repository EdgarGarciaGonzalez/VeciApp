// app/login.tsx
import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../src/lib/supabase";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const iniciarSesion = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Faltan datos", "Escribe tu email y contrasena.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setLoading(false);
      Alert.alert("Error al iniciar sesion", error.message);
      return;
    }

    if (!data.session) {
      setLoading(false);
      Alert.alert("Error", "No se pudo iniciar sesion.");
      return;
    }

    // Comprobar si tiene comunidad asignada
    const { data: perfil } = await supabase
      .from("usuario")
      .select("comunidad_id")
      .eq("email", data.session.user.email)
      .single();

    setLoading(false);

    if (!perfil || !perfil.comunidad_id) {
      router.replace("/comunidad");
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VeciApp</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Iniciar sesion</Text>
        <Text style={styles.subtitle}>Accede a tu comunidad</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="tuemail@correo.com"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <Text style={styles.label}>Contrasena</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Tu contrasena"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          style={styles.input}
        />

        <Pressable
          onPress={iniciarSesion}
          disabled={loading}
          style={[styles.button, loading && { opacity: 0.6 }]}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={styles.buttonText}>Entrar</Text>}
        </Pressable>

        <Pressable
          onPress={() => router.push("/registro")}
          style={{ marginTop: 14, alignSelf: "center" }}
        >
          <Text style={{ color: "#2F67E8", fontWeight: "700" }}>
            No tengo cuenta - Registrarme
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
  container: { padding: 18, paddingTop: 28, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "800", marginBottom: 6, color: "#111827" },
  subtitle: { color: "#6B7280", marginBottom: 22 },
  label: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
    backgroundColor: "#F9FAFB", fontSize: 15, color: "#111827",
  },
  button: {
    backgroundColor: "#2F67E8", padding: 15, borderRadius: 12,
    alignItems: "center", marginTop: 6,
  },
  buttonText: { color: "white", fontWeight: "800", fontSize: 15 },
});