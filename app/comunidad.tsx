// app/comunidad.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";

type Paso = "elegir" | "crear" | "unirse";

export default function ComunidadScreen() {
  const router = useRouter();

  const [paso, setPaso] = useState<Paso>("elegir");
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Crear comunidad
  const [nombreCom, setNombreCom] = useState("");
  const [direccionCom, setDireccionCom] = useState("");

  // Unirse
  const [codigo, setCodigo] = useState("");
  const [comunidadEncontrada, setComunidadEncontrada] = useState<{
    id: string; nombre: string; direccion: string;
  } | null>(null);
  const [buscando, setBuscando] = useState(false);

  // Obtener email del usuario logado
  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    };
    cargar();
  }, []);

  // Buscar comunidad por codigo
  const buscarComunidad = async () => {
    const cod = codigo.trim().toUpperCase();
    if (cod.length < 4) {
      Alert.alert("Codigo invalido", "El codigo debe tener al menos 4 caracteres.");
      return;
    }

    setBuscando(true);
    setComunidadEncontrada(null);

    const { data, error } = await supabase
      .from("comunidad")
      .select("id, nombre, direccion")
      .eq("codigo", cod)
      .single();

    setBuscando(false);

    if (error || !data) {
      Alert.alert("No encontrada", "No existe ninguna comunidad con ese codigo. Verifica con tu administrador.");
      return;
    }

    setComunidadEncontrada(data);
  };

  // Unirse a comunidad encontrada
  const unirseAComunidad = async () => {
    if (!comunidadEncontrada) return;
    setLoading(true);

    const { error } = await supabase
      .from("usuario")
      .update({ comunidad_id: comunidadEncontrada.id, rol: "PROPIETARIO" })
      .eq("email", userEmail);

    setLoading(false);

    if (error) {
      Alert.alert("Error", "No se pudo unir a la comunidad: " + error.message);
      return;
    }

    router.replace("/(tabs)");
  };

  // Crear nueva comunidad
  const crearComunidad = async () => {
    if (!nombreCom.trim()) {
      Alert.alert("Nombre requerido", "Escribe el nombre de tu comunidad.");
      return;
    }
    if (!direccionCom.trim()) {
      Alert.alert("Direccion requerida", "Escribe la direccion del edificio.");
      return;
    }

    setLoading(true);

    // Generar codigo aleatorio de 6 caracteres
    const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let cod = "";
    for (let i = 0; i < 6; i++) cod += caracteres[Math.floor(Math.random() * caracteres.length)];

    // 1. Crear comunidad
    const { data: nuevaCom, error: errCom } = await supabase
      .from("comunidad")
      .insert({
        nombre: nombreCom.trim(),
        direccion: direccionCom.trim(),
        codigo: cod,
      })
      .select("id, codigo")
      .single();

    if (errCom || !nuevaCom) {
      setLoading(false);
      Alert.alert("Error", "No se pudo crear la comunidad: " + (errCom?.message ?? ""));
      return;
    }

    // 2. Asignar comunidad al usuario como PRESIDENTE
    const { error: errUser } = await supabase
      .from("usuario")
      .update({ comunidad_id: nuevaCom.id, rol: "PRESIDENTE" })
      .eq("email", userEmail);

    setLoading(false);

    if (errUser) {
      Alert.alert("Error", "Comunidad creada pero no se pudo asignar tu perfil.");
      return;
    }

    // Crear contactos de emergencia por defecto
    await supabase.from("contacto_emergencia").insert([
      { comunidad_id: nuevaCom.id, nombre: "Emergencias", telefono: "112", descripcion: "Policia, Bomberos, Ambulancia", icono: "warning" },
      { comunidad_id: nuevaCom.id, nombre: "Policia Local", telefono: "092", descripcion: "Policia municipal", icono: "shield" },
    ]);

    // Mostrar modal con código
    setCodigoGenerado(nuevaCom.codigo);
    setModalExitoVisible(true);
  };

  const [modalExitoVisible, setModalExitoVisible] = useState(false);
  const [codigoGenerado, setCodigoGenerado] = useState("");
  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          {paso !== "elegir" && (
            <Pressable onPress={() => { setPaso("elegir"); setComunidadEncontrada(null); }} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="white" />
            </Pressable>
          )}
          <Text style={styles.headerTitle}>VeciApp</Text>
          <View style={{ flex: 1 }} />
          <Pressable onPress={cerrarSesion} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={18} color="white" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── PASO 1: ELEGIR ─────────────────────────────────────────── */}
          {paso === "elegir" && (
            <>
              {/* Ilustracion */}
              <View style={styles.heroBox}>
                <View style={styles.heroIcon}>
                  <Ionicons name="home" size={48} color="#2F67E8" />
                </View>
                <Text style={styles.heroTitle}>Bienvenido a VeciApp</Text>
                <Text style={styles.heroSub}>
                  Gestiona tu comunidad de vecinos de forma sencilla. Para empezar, crea una nueva comunidad o unete a una existente.
                </Text>
              </View>

              {/* Opcion: Crear */}
              <Pressable style={styles.optionCard} onPress={() => setPaso("crear")}>
                <View style={styles.optionIconBox}>
                  <Ionicons name="add-circle" size={28} color="#2F67E8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Crear comunidad</Text>
                  <Text style={styles.optionSub}>
                    Seras el presidente y podras invitar a tus vecinos con un codigo
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </Pressable>

              {/* Opcion: Unirse */}
              <Pressable style={styles.optionCard} onPress={() => setPaso("unirse")}>
                <View style={[styles.optionIconBox, { backgroundColor: "#F0FDF4" }]}>
                  <Ionicons name="enter" size={28} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Unirme a comunidad</Text>
                  <Text style={styles.optionSub}>
                    Introduce el codigo que te ha dado tu administrador o presidente
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </Pressable>

              {/* Info */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={18} color="#2F67E8" />
                <Text style={styles.infoText}>
                  Si tu comunidad ya usa VeciApp, pide el codigo de invitacion a tu presidente o administrador.
                </Text>
              </View>
            </>
          )}

          {/* ── PASO 2: CREAR ──────────────────────────────────────────── */}
          {paso === "crear" && (
            <>
              <View style={styles.stepHeader}>
                <View style={styles.stepIconBox}>
                  <Ionicons name="business" size={32} color="#2F67E8" />
                </View>
                <Text style={styles.stepTitle}>Crear nueva comunidad</Text>
                <Text style={styles.stepSub}>
                  Seras el presidente de esta comunidad. Podras invitar vecinos compartiendo el codigo que se generara automaticamente.
                </Text>
              </View>

              <Text style={styles.label}>Nombre de la comunidad</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Comunidad Calle Mayor 5"
                placeholderTextColor="#9CA3AF"
                value={nombreCom}
                onChangeText={setNombreCom}
                maxLength={80}
              />

              <Text style={styles.label}>Direccion</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Calle Mayor 5, Barcelona"
                placeholderTextColor="#9CA3AF"
                value={direccionCom}
                onChangeText={setDireccionCom}
                maxLength={120}
              />

              {/* Resumen */}
              <View style={styles.resumenBox}>
                <Ionicons name="shield-checkmark" size={18} color="#2F67E8" />
                <Text style={styles.resumenText}>
                  Tu rol sera <Text style={{ fontWeight: "800", color: "#2F67E8" }}>Presidente</Text>. Podras gestionar vecinos, gastos, votaciones y mas.
                </Text>
              </View>

              <Pressable
                style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
                onPress={crearComunidad}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="white" />
                  : <>
                      <Ionicons name="add-circle" size={20} color="white" />
                      <Text style={styles.primaryBtnText}>Crear comunidad</Text>
                    </>
                }
              </Pressable>
            </>
          )}

          {/* ── PASO 3: UNIRSE ─────────────────────────────────────────── */}
          {paso === "unirse" && (
            <>
              <View style={styles.stepHeader}>
                <View style={[styles.stepIconBox, { backgroundColor: "#F0FDF4" }]}>
                  <Ionicons name="enter" size={32} color="#16A34A" />
                </View>
                <Text style={styles.stepTitle}>Unirme a comunidad</Text>
                <Text style={styles.stepSub}>
                  Introduce el codigo de 6 caracteres que te ha facilitado el presidente o administrador de tu comunidad.
                </Text>
              </View>

              <Text style={styles.label}>Codigo de invitacion</Text>
              <View style={styles.codigoRow}>
                <TextInput
                  style={styles.codigoInput}
                  placeholder="XXXXXX"
                  placeholderTextColor="#D1D5DB"
                  value={codigo}
                  onChangeText={(t) => setCodigo(t.toUpperCase())}
                  maxLength={6}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <Pressable
                  style={[styles.buscarBtn, buscando && { opacity: 0.6 }]}
                  onPress={buscarComunidad}
                  disabled={buscando}
                >
                  {buscando
                    ? <ActivityIndicator color="white" size="small" />
                    : <Text style={styles.buscarBtnText}>Buscar</Text>}
                </Pressable>
              </View>

              {/* Comunidad encontrada */}
              {comunidadEncontrada && (
                <View style={styles.encontradaCard}>
                  <View style={styles.encontradaIcon}>
                    <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.encontradaNombre}>{comunidadEncontrada.nombre}</Text>
                    <Text style={styles.encontradaDir}>{comunidadEncontrada.direccion}</Text>
                  </View>
                </View>
              )}

              {comunidadEncontrada && (
                <>
                  <View style={styles.resumenBox}>
                    <Ionicons name="person" size={18} color="#16A34A" />
                    <Text style={styles.resumenText}>
                      Te uniras como <Text style={{ fontWeight: "800", color: "#16A34A" }}>Propietario</Text>. El presidente podra cambiar tu rol mas adelante.
                    </Text>
                  </View>

                  <Pressable
                    style={[styles.primaryBtnGreen, loading && { opacity: 0.6 }]}
                    onPress={unirseAComunidad}
                    disabled={loading}
                  >
                    {loading
                      ? <ActivityIndicator color="white" />
                      : <>
                          <Ionicons name="enter" size={20} color="white" />
                          <Text style={styles.primaryBtnText}>Unirme a esta comunidad</Text>
                        </>
                    }
                  </Pressable>
                </>
              )}
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL EXITO — CODIGO GENERADO */}
      <Modal
        visible={modalExitoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSuccess}>
            <View style={styles.successIconBox}>
              <Ionicons name="checkmark-circle" size={64} color="#16A34A" />
            </View>

            <Text style={styles.successTitle}>¡Comunidad creada!</Text>
            <Text style={styles.successSub}>
              Tu comunidad esta lista. Ahora puedes invitar a tus vecinos compartiendo este codigo.
            </Text>

            <View style={styles.codigoBox}>
              <Text style={styles.codigoLabel}>Tu codigo de invitacion:</Text>
              <Text style={styles.codigoValue}>{codigoGenerado}</Text>
              <Pressable
                onPress={() => {
                  // Copiar al portapapeles (opcional)
                  alert(`Codigo copiado: ${codigoGenerado}`);
                }}
                style={styles.copiarBtn}
              >
                <Ionicons name="copy" size={18} color="#2F67E8" />
                <Text style={styles.copiarBtnText}>Copiar</Text>
              </Pressable>
            </View>

            <Text style={styles.instruccionesTitle}>Como invitar a tus vecinos:</Text>
            <View style={styles.instruccionesBox}>
              <View style={styles.paso}>
                <Text style={styles.pasoNum}>1</Text>
                <Text style={styles.pasoTexto}>Comparte este codigo por WhatsApp, email o en persona</Text>
              </View>
              <View style={styles.paso}>
                <Text style={styles.pasoNum}>2</Text>
                <Text style={styles.pasoTexto}>Tus vecinos lo introducen en "Unirme a comunidad" durante el registro</Text>
              </View>
              <View style={styles.paso}>
                <Text style={styles.pasoNum}>3</Text>
                <Text style={styles.pasoTexto}>Se unen automaticamente y empiezan a usar VeciApp</Text>
              </View>
            </View>

            <Pressable
              style={styles.entrarBtn}
              onPress={() => {
                setModalExitoVisible(false);
                router.replace("/(tabs)");
              }}
            >
              <Text style={styles.entrarBtnText}>Entrar a VeciApp</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4FB" },

  header: {
    height: 64, backgroundColor: "#2F67E8",
    flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8,
  },
  backBtn: { width: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "800" },
  logoutBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },

  content: { padding: 18, paddingBottom: 40 },

  // Hero
  heroBox: { alignItems: "center", paddingVertical: 30, gap: 12 },
  heroIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: { fontSize: 24, fontWeight: "800", color: "#111827", textAlign: "center" },
  heroSub: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 21, paddingHorizontal: 12 },

  // Option cards
  optionCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "white", borderRadius: 16, padding: 18, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  optionIconBox: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center",
  },
  optionTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 3 },
  optionSub: { fontSize: 12, color: "#6B7280", lineHeight: 17 },

  infoBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#DBEAFE", borderRadius: 12, padding: 14, marginTop: 8,
  },
  infoText: { fontSize: 12, color: "#1E40AF", flex: 1, lineHeight: 18 },

  // Step headers
  stepHeader: { alignItems: "center", paddingVertical: 20, gap: 10, marginBottom: 10 },
  stepIconBox: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center",
  },
  stepTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  stepSub: { fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 20, paddingHorizontal: 10 },

  // Form
  label: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8, marginTop: 14 },
  input: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 15,
    color: "#111827", backgroundColor: "white",
  },

  resumenBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#F0F9FF", borderRadius: 12, padding: 14, marginTop: 20,
    borderWidth: 1, borderColor: "#DBEAFE",
  },
  resumenText: { fontSize: 13, color: "#374151", flex: 1, lineHeight: 19 },

  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#2F67E8", borderRadius: 14,
    paddingVertical: 16, marginTop: 20,
    shadowColor: "#2F67E8", shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  primaryBtnGreen: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#16A34A", borderRadius: 14,
    paddingVertical: 16, marginTop: 20,
    shadowColor: "#16A34A", shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  primaryBtnText: { color: "white", fontSize: 16, fontWeight: "800" },

  // Codigo
  codigoRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  codigoInput: {
    flex: 1, borderWidth: 2, borderColor: "#D1D5DB", borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 14, fontSize: 24,
    fontWeight: "800", color: "#111827", backgroundColor: "white",
    textAlign: "center", letterSpacing: 8,
  },
  buscarBtn: {
    backgroundColor: "#2F67E8", borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  buscarBtnText: { color: "white", fontWeight: "700", fontSize: 15 },

  // Encontrada
  encontradaCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#F0FDF4", borderRadius: 14, padding: 16, marginTop: 18,
    borderWidth: 1.5, borderColor: "#BBF7D0",
  },
  encontradaIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" },
  encontradaNombre: { fontSize: 16, fontWeight: "700", color: "#111827" },
  encontradaDir: { fontSize: 13, color: "#6B7280", marginTop: 2 },

  // Modal exito
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center", justifyContent: "center", padding: 20,
  },
  modalSuccess: {
    backgroundColor: "white", borderRadius: 20, padding: 28,
    alignItems: "center", width: "100%", maxWidth: 380,
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
  },
  successIconBox: { marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 8, textAlign: "center" },
  successSub: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 21, marginBottom: 24 },
  codigoBox: {
    backgroundColor: "#F0FDF4", borderRadius: 16, borderWidth: 2, borderColor: "#BBF7D0",
    padding: 18, width: "100%", marginBottom: 22,
    alignItems: "center",
  },
  codigoLabel: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 8 },
  codigoValue: { fontSize: 32, fontWeight: "900", color: "#16A34A", letterSpacing: 3, marginBottom: 12 },
  copiarBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "white", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: "#BBF7D0",
  },
  copiarBtnText: { fontSize: 12, fontWeight: "700", color: "#16A34A" },
  instruccionesTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 12, width: "100%" },
  instruccionesBox: { width: "100%", gap: 10, marginBottom: 22 },
  paso: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  pasoNum: { fontSize: 16, fontWeight: "800", color: "white", backgroundColor: "#2F67E8", width: 28, height: 28, borderRadius: 14, textAlign: "center", lineHeight: 28 },
  pasoTexto: { flex: 1, fontSize: 13, color: "#374151", lineHeight: 19, paddingTop: 4 },
  entrarBtn: {
    backgroundColor: "#2F67E8", borderRadius: 14,
    paddingVertical: 15, width: "100%",
    alignItems: "center",
  },
  entrarBtnText: { color: "white", fontSize: 16, fontWeight: "800" },
});