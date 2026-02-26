import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
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
      Alert.alert("Faltan datos", "Escribe tu email y contraseña.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setLoading(false);

    if (error) {
      Alert.alert("Error al iniciar sesión", error.message);
      return;
    }

    if (data.session) {
      router.replace("/(tabs)");
    } else {
      Alert.alert("Error", "No se pudo iniciar sesión.");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VeciApp</Text>
      </View>

      <View style={styles.container}>
        <Text style={styles.title}>Iniciar sesión</Text>
        <Text style={styles.subtitle}>Accede a tu comunidad</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="tuemail@correo.com"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          style={styles.input}
        />

        <Pressable
          onPress={iniciarSesion}
          disabled={loading}
          style={[styles.button, loading && { opacity: 0.6 }]}
        >
          <Text style={styles.buttonText}>
            {loading ? "Entrando..." : "Entrar"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/registro")}
          style={{ marginTop: 14, alignSelf: "center" }}
        >
          <Text style={{ color: "#1E40AF", fontWeight: "700" }}>
            No tengo cuenta · Registrarme
          </Text>
        </Pressable>
      </View>
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

  container: { flex: 1, padding: 18, paddingTop: 28 },

  title: { fontSize: 26, fontWeight: "800", marginBottom: 6 },
  subtitle: { color: "#666", marginBottom: 22 },

  label: { fontSize: 14, fontWeight: "800", marginBottom: 6 },

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
    marginTop: 6,
  },
  buttonText: { color: "white", fontWeight: "800", fontSize: 15 },
});