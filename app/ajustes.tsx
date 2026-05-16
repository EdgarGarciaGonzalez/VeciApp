// app/ajustes.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Modal, Platform, Pressable, ScrollView, StyleSheet,
  Switch, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";

type Perfil = {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string;
  telefono: string | null;
  rol: string;
  comunidad_id: string;
};

type ComunidadInfo = {
  id: string;
  nombre: string;
  direccion: string;
  codigo: string;
  miembros: number;
};

function rolLabel(r: string) {
  return { PRESIDENTE: "Presidente", PROPIETARIO: "Propietario", TRABAJADOR: "Trabajador", INQUILINO: "Inquilino" }[r] ?? r;
}

export default function AjustesScreen() {
  const router = useRouter();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [comunidad, setComunidad] = useState<ComunidadInfo | null>(null);
  const [cargando, setCargando] = useState(true);

  // Editar perfil
  const [editVisible, setEditVisible] = useState(false);
  const [editNombre, setEditNombre] = useState("");
  const [editApellidos, setEditApellidos] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Cambiar contraseña
  const [passVisible, setPassVisible] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [guardandoPass, setGuardandoPass] = useState(false);

  // Notificaciones (solo local por ahora)
  const [notifGrupos, setNotifGrupos] = useState(true);
  const [notifPagos, setNotifPagos] = useState(true);
  const [notifIncidencias, setNotifIncidencias] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setCargando(false); return; }

      const { data: p } = await supabase
        .from("usuario")
        .select("id, nombre, apellidos, email, telefono, rol, comunidad_id")
        .eq("email", user.email)
        .single();

      if (p) {
        setPerfil(p);

        // Info de la comunidad
        const { data: com } = await supabase
          .from("comunidad")
          .select("id, nombre, direccion, codigo")
          .eq("id", p.comunidad_id)
          .single();

        if (com) {
          const { count } = await supabase
            .from("usuario")
            .select("id", { count: "exact", head: true })
            .eq("comunidad_id", p.comunidad_id);

          setComunidad({ ...com, miembros: count ?? 0 });
        }
      }
      setCargando(false);
    };
    cargar();
  }, []);

  // Abrir editar perfil
  const abrirEditarPerfil = () => {
    if (!perfil) return;
    setEditNombre(perfil.nombre);
    setEditApellidos(perfil.apellidos ?? "");
    setEditTelefono(perfil.telefono ?? "");
    setEditVisible(true);
  };

  const guardarPerfil = async () => {
    if (!perfil || !editNombre.trim()) {
      Alert.alert("Nombre requerido");
      return;
    }
    setGuardando(true);
    const { error } = await supabase.from("usuario").update({
      nombre: editNombre.trim(),
      apellidos: editApellidos.trim() || null,
      telefono: editTelefono.trim() || null,
    }).eq("id", perfil.id);

    setGuardando(false);
    if (error) { Alert.alert("Error", error.message); return; }

    setPerfil({ ...perfil, nombre: editNombre.trim(), apellidos: editApellidos.trim() || null, telefono: editTelefono.trim() || null });
    setEditVisible(false);
  };

  // Cambiar contraseña
  const cambiarPassword = async () => {
    if (newPass.length < 6) {
      Alert.alert("Contraseña muy corta", "Minimo 6 caracteres.");
      return;
    }
    if (newPass !== confirmPass) {
      Alert.alert("No coinciden", "Las contraseñas no coinciden.");
      return;
    }
    setGuardandoPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setGuardandoPass(false);
    if (error) { Alert.alert("Error", error.message); return; }
    setPassVisible(false);
    setNewPass(""); setConfirmPass("");
    Alert.alert("Hecho", "Contraseña actualizada correctamente.");
  };

  // Cerrar sesión
  const cerrarSesion = () => {
    Alert.alert("Cerrar sesion", "Seguro que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir", style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  // Eliminar cuenta
  const eliminarCuenta = () => {
    Alert.alert(
      "Eliminar cuenta",
      "Esta accion es irreversible. Se eliminaran todos tus datos. Seguro?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar", style: "destructive",
          onPress: async () => {
            if (!perfil) return;
            await supabase.from("usuario").delete().eq("id", perfil.id);
            await supabase.auth.signOut();
            router.replace("/login");
          },
        },
      ]
    );
  };

  if (cargando) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn}><Ionicons name="chevron-back" size={22} color="white" /></Pressable>
          <Text style={s.headerTitle}>Ajustes</Text>
        </View>
        <View style={s.centered}><ActivityIndicator size="large" color="#2F67E8" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* HEADER */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="white" />
        </Pressable>
        <Text style={s.headerTitle}>Ajustes</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ── PERFIL ───────────────────────────────────────── */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {perfil?.nombre.charAt(0)}{perfil?.apellidos?.charAt(0) ?? ""}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName}>{perfil?.nombre} {perfil?.apellidos ?? ""}</Text>
            <Text style={s.profileEmail}>{perfil?.email}</Text>
            <View style={s.rolBadge}>
              <Text style={s.rolBadgeText}>{rolLabel(perfil?.rol ?? "")}</Text>
            </View>
          </View>
          <Pressable onPress={abrirEditarPerfil} style={s.editBtn}>
            <Ionicons name="create-outline" size={18} color="#2F67E8" />
          </Pressable>
        </View>

        {/* ── COMUNIDAD ────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Mi comunidad</Text>
        {comunidad && (
          <View style={s.card}>
            <View style={s.cardRow}>
              <Ionicons name="business-outline" size={20} color="#2F67E8" />
              <View style={{ flex: 1 }}>
                <Text style={s.cardLabel}>Nombre</Text>
                <Text style={s.cardValue}>{comunidad.nombre}</Text>
              </View>
            </View>
            <View style={s.cardDivider} />
            <View style={s.cardRow}>
              <Ionicons name="location-outline" size={20} color="#2F67E8" />
              <View style={{ flex: 1 }}>
                <Text style={s.cardLabel}>Direccion</Text>
                <Text style={s.cardValue}>{comunidad.direccion}</Text>
              </View>
            </View>
            <View style={s.cardDivider} />
            <View style={s.cardRow}>
              <Ionicons name="key-outline" size={20} color="#2F67E8" />
              <View style={{ flex: 1 }}>
                <Text style={s.cardLabel}>Codigo de invitacion</Text>
                <Text style={[s.cardValue, { fontWeight: "900", letterSpacing: 2, color: "#2F67E8" }]}>
                  {comunidad.codigo}
                </Text>
              </View>
              <Pressable onPress={() => Alert.alert("Codigo", comunidad.codigo)} style={s.copyBtn}>
                <Ionicons name="copy-outline" size={16} color="#2F67E8" />
              </Pressable>
            </View>
            <View style={s.cardDivider} />
            <View style={s.cardRow}>
              <Ionicons name="people-outline" size={20} color="#2F67E8" />
              <View style={{ flex: 1 }}>
                <Text style={s.cardLabel}>Vecinos registrados</Text>
                <Text style={s.cardValue}>{comunidad.miembros}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── NOTIFICACIONES ──────────────────────────────── */}
        <Text style={s.sectionTitle}>Notificaciones</Text>
        <View style={s.card}>
          <View style={s.switchRow}>
            <Ionicons name="chatbubbles-outline" size={20} color="#374151" />
            <Text style={s.switchLabel}>Mensajes de grupo</Text>
            <Switch value={notifGrupos} onValueChange={setNotifGrupos} trackColor={{ true: "#2F67E8" }} />
          </View>
          <View style={s.cardDivider} />
          <View style={s.switchRow}>
            <Ionicons name="cash-outline" size={20} color="#374151" />
            <Text style={s.switchLabel}>Pagos y cuotas</Text>
            <Switch value={notifPagos} onValueChange={setNotifPagos} trackColor={{ true: "#2F67E8" }} />
          </View>
          <View style={s.cardDivider} />
          <View style={s.switchRow}>
            <Ionicons name="warning-outline" size={20} color="#374151" />
            <Text style={s.switchLabel}>Incidencias</Text>
            <Switch value={notifIncidencias} onValueChange={setNotifIncidencias} trackColor={{ true: "#2F67E8" }} />
          </View>
        </View>

        {/* ── CUENTA ─────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Cuenta</Text>
        <View style={s.card}>
          <Pressable style={s.menuRow} onPress={() => { setNewPass(""); setConfirmPass(""); setPassVisible(true); }}>
            <Ionicons name="lock-closed-outline" size={20} color="#374151" />
            <Text style={s.menuRowText}>Cambiar contraseña</Text>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
          </Pressable>
          <View style={s.cardDivider} />
          <Pressable style={s.menuRow} onPress={cerrarSesion}>
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            <Text style={[s.menuRowText, { color: "#DC2626" }]}>Cerrar sesion</Text>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
          </Pressable>
          <View style={s.cardDivider} />
          <Pressable style={s.menuRow} onPress={eliminarCuenta}>
            <Ionicons name="trash-outline" size={20} color="#DC2626" />
            <Text style={[s.menuRowText, { color: "#DC2626" }]}>Eliminar cuenta</Text>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
          </Pressable>
        </View>

        {/* ── INFO APP ───────────────────────────────────── */}
        <Text style={s.sectionTitle}>Sobre la app</Text>
        <View style={s.card}>
          <View style={s.cardRow}>
            <Ionicons name="information-circle-outline" size={20} color="#9CA3AF" />
            <View style={{ flex: 1 }}>
              <Text style={s.cardLabel}>Version</Text>
              <Text style={s.cardValue}>VeciApp 1.0.0</Text>
            </View>
          </View>
        </View>

        <Text style={s.footerText}>Hecho con ❤️ para comunidades de vecinos</Text>

      </ScrollView>

      {/* ── MODAL EDITAR PERFIL ────────────────────────────── */}
      <Modal visible={editVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditVisible(false)}>
        <SafeAreaView style={s.modalSafe} edges={["top"]}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={s.modalHeader}>
            <Pressable onPress={() => setEditVisible(false)}>
              <Text style={s.modalCancel}>Cancelar</Text>
            </Pressable>
            <Text style={s.modalTitle}>Editar perfil</Text>
            <Pressable onPress={guardarPerfil} disabled={guardando} style={[s.modalSave, guardando && { opacity: 0.5 }]}>
              {guardando ? <ActivityIndicator size="small" color="white" /> : <Text style={s.modalSaveText}>Guardar</Text>}
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
            <View>
              <Text style={s.inputLabel}>Nombre</Text>
              <TextInput style={s.input} value={editNombre} onChangeText={setEditNombre} placeholder="Tu nombre" placeholderTextColor="#9CA3AF" />
            </View>
            <View>
              <Text style={s.inputLabel}>Apellidos</Text>
              <TextInput style={s.input} value={editApellidos} onChangeText={setEditApellidos} placeholder="Tus apellidos" placeholderTextColor="#9CA3AF" />
            </View>
            <View>
              <Text style={s.inputLabel}>Telefono</Text>
              <TextInput style={s.input} value={editTelefono} onChangeText={setEditTelefono} placeholder="600 123 456" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
            </View>
            <View style={s.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color="#2F67E8" />
              <Text style={s.infoBoxText}>El email y el rol no se pueden cambiar desde aqui.</Text>
            </View>
          </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ── MODAL CAMBIAR CONTRASEÑA ──────────────────────── */}
      <Modal visible={passVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPassVisible(false)}>
        <SafeAreaView style={s.modalSafe} edges={["top"]}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={s.modalHeader}>
            <Pressable onPress={() => setPassVisible(false)}>
              <Text style={s.modalCancel}>Cancelar</Text>
            </Pressable>
            <Text style={s.modalTitle}>Contraseña</Text>
            <Pressable onPress={cambiarPassword} disabled={guardandoPass} style={[s.modalSave, guardandoPass && { opacity: 0.5 }]}>
              {guardandoPass ? <ActivityIndicator size="small" color="white" /> : <Text style={s.modalSaveText}>Cambiar</Text>}
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
            <View>
              <Text style={s.inputLabel}>Nueva contraseña</Text>
              <TextInput style={s.input} value={newPass} onChangeText={setNewPass} secureTextEntry placeholder="Minimo 6 caracteres" placeholderTextColor="#9CA3AF" />
            </View>
            <View>
              <Text style={s.inputLabel}>Confirmar contraseña</Text>
              <TextInput style={s.input} value={confirmPass} onChangeText={setConfirmPass} secureTextEntry placeholder="Repite la contraseña" placeholderTextColor="#9CA3AF" />
            </View>
          </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4FB" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    height: 64, backgroundColor: "#2F67E8",
    flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8,
  },
  backBtn: { width: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "700" },

  // Perfil
  profileCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "white", margin: 14, marginBottom: 4,
    borderRadius: 16, padding: 18,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#2F67E8", alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: "white", fontSize: 20, fontWeight: "800" },
  profileName: { fontSize: 17, fontWeight: "700", color: "#111827" },
  profileEmail: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  rolBadge: { backgroundColor: "#EEF2FF", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginTop: 6 },
  rolBadgeText: { fontSize: 11, fontWeight: "700", color: "#2F67E8" },
  editBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center",
  },

  // Secciones
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#6B7280", marginLeft: 18, marginTop: 20, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },

  card: {
    backgroundColor: "white", marginHorizontal: 14, borderRadius: 14,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    overflow: "hidden",
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  cardLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: "600" },
  cardValue: { fontSize: 14, color: "#111827", fontWeight: "600", marginTop: 1 },
  cardDivider: { height: 1, backgroundColor: "#F3F4F6", marginLeft: 48 },
  copyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" },

  // Switch
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  switchLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: "#374151" },

  // Menu
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  menuRowText: { flex: 1, fontSize: 14, fontWeight: "600", color: "#374151" },

  footerText: { textAlign: "center", color: "#D1D5DB", fontSize: 12, marginTop: 28 },

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
  inputLabel: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: "#111827", backgroundColor: "#F9FAFB",
  },
  infoBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#DBEAFE", borderRadius: 10, padding: 12, marginTop: 6,
  },
  infoBoxText: { fontSize: 12, color: "#1E40AF", flex: 1 },
});