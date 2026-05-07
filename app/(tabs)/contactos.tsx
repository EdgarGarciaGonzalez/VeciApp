// app/(tabs)/contactos.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomTabBar, { TAB_BAR_HEIGHT } from "../../components/BottomTabBar";
import { supabase } from "../../src/lib/supabase";


type Vecino = {
  id: string;
  nombre: string;
  apellidos: string | null;
  rol: string;
  email: string;
  piso: string | null;
  telefono: string | null;
};

type ContactoEmergencia = {
  id: string;
  nombre: string;
  telefono: string;
  descripcion: string | null;
  icono: string;
};

type UsuarioSesion = {
  id: string;
  rol: string;
  comunidad_id: string;
};

function iniciales(nombre: string, apellidos: string | null): string {
  return (nombre.charAt(0) + (apellidos?.charAt(0) ?? "")).toUpperCase();
}

function rolLabel(rol: string): string {
  const m: Record<string, string> = {
    PRESIDENTE: "Presidente",
    PROPIETARIO: "Propietario",
    INQUILINO: "Inquilino",
    TRABAJADOR: "Trabajador",
  };
  return m[rol] ?? rol;
}

function rolColor(rol: string): string {
  const m: Record<string, string> = {
    PRESIDENTE: "#2F67E8",
    PROPIETARIO: "#374151",
    INQUILINO: "#7C3AED",
    TRABAJADOR: "#D97706",
  };
  return m[rol] ?? "#6B7280";
}

function iconoEmergencia(icono: string): string {
  const m: Record<string, string> = {
    warning: "warning-outline",
    shield: "shield-outline",
    flame: "flame-outline",
    medkit: "medkit-outline",
    water: "water-outline",
    construct: "construct-outline",
    call: "call-outline",
  };
  return m[icono] ?? "call-outline";
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ContactosScreen() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargandoUsuario, setCargandoUsuario] = useState(true);
  const [tab, setTab] = useState<"vecinos" | "emergencias">("vecinos");

  const [vecinos, setVecinos] = useState<Vecino[]>([]);
  const [emergencias, setEmergencias] = useState<ContactoEmergencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  // Modal nuevo contacto emergencia (presidente)
  const [modalVisible, setModalVisible] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [nuevoDescripcion, setNuevoDescripcion] = useState("");
  const [nuevoIcono, setNuevoIcono] = useState("call");
  const [guardando, setGuardando] = useState(false);

  const esPresidente = usuario?.rol === "PRESIDENTE";

  // 1. Cargar usuario
  useEffect(() => {
    const cargar = async () => {
      setCargandoUsuario(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setCargandoUsuario(false); return; }
      const { data } = await supabase
        .from("usuario").select("id, rol, comunidad_id")
        .eq("email", user.email).single();
      if (data) setUsuario(data);
      setCargandoUsuario(false);
    };
    cargar();
  }, []);

  // 2. Cargar datos
  const cargarDatos = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);

    // Vecinos de la comunidad
    const { data: vecinosData } = await supabase
      .from("usuario")
      .select("id, nombre, apellidos, rol, email, telefono")
      .eq("comunidad_id", usuario.comunidad_id)
      .order("rol").order("nombre");

    if (vecinosData) setVecinos(vecinosData as Vecino[]);

    // Contactos de emergencia
    const { data: emergData } = await supabase
      .from("contacto_emergencia")
      .select("id, nombre, telefono, descripcion, icono")
      .eq("comunidad_id", usuario.comunidad_id)
      .order("created_at");

    if (emergData) setEmergencias(emergData as ContactoEmergencia[]);

    setCargando(false);
  }, [usuario]);

  useEffect(() => { if (usuario) cargarDatos(); }, [usuario, cargarDatos]);

  const onRefresh = async () => { setRefreshing(true); await cargarDatos(); setRefreshing(false); };

  // 3. Abrir chat con un vecino
  const abrirChat = async (vecino: Vecino) => {
    if (!usuario) return;

    // Buscar si ya existe un chat personal entre los dos
    const { data: misChats } = await supabase
      .from("chat_miembro").select("chat_id").eq("usuario_id", usuario.id);
    const { data: susChats } = await supabase
      .from("chat_miembro").select("chat_id").eq("usuario_id", vecino.id);

    if (misChats && susChats) {
      const misIds = misChats.map((c: any) => c.chat_id);
      const susIds = susChats.map((c: any) => c.chat_id);
      const comunes = misIds.filter((id: string) => susIds.includes(id));

      // Buscar entre los chats comunes uno de tipo personal
      if (comunes.length > 0) {
        const { data: chatPersonal } = await supabase
          .from("chat").select("id, nombre")
          .in("id", comunes).eq("tipo", "personal").limit(1);

        if (chatPersonal && chatPersonal.length > 0) {
          router.push({
            pathname: "/chat/id",
            params: { id: chatPersonal[0].id, nombre: chatPersonal[0].nombre },
          });
          return;
        }
      }
    }

    // No existe → crear chat personal
    const nombreChat = `${vecino.nombre} ${vecino.apellidos ?? ""}`.trim();

    const { data: nuevoChat, error } = await supabase
      .from("chat")
      .insert({
        nombre: nombreChat,
        tipo: "personal",
        comunidad_id: usuario.comunidad_id,
        creado_por: usuario.id,
        ultimo_mensaje_at: new Date().toISOString(),
      })
      .select("id").single();

    if (error || !nuevoChat) {
      Alert.alert("Error", "No se pudo crear el chat.");
      return;
    }

    // Añadir ambos como miembros
    await supabase.from("chat_miembro").insert([
      { chat_id: nuevoChat.id, usuario_id: usuario.id },
      { chat_id: nuevoChat.id, usuario_id: vecino.id },
    ]);

    router.push({
      pathname: "/chat/id",
      params: { id: nuevoChat.id, nombre: nombreChat },
    });
  };

  // 4. Llamar emergencia
  const llamar = (telefono: string) => {
    Linking.openURL(`tel:${telefono}`);
  };

  // 5. Crear contacto emergencia
  const crearEmergencia = async () => {
    if (!nuevoNombre.trim() || !nuevoTelefono.trim()) {
      Alert.alert("Campos requeridos", "Nombre y telefono son obligatorios.");
      return;
    }
    setGuardando(true);
    const { error } = await supabase.from("contacto_emergencia").insert({
      comunidad_id: usuario!.comunidad_id,
      nombre: nuevoNombre.trim(),
      telefono: nuevoTelefono.trim(),
      descripcion: nuevoDescripcion.trim() || null,
      icono: nuevoIcono,
      creado_por: usuario!.id,
    });
    setGuardando(false);
    if (error) { Alert.alert("Error", "No se pudo crear el contacto."); return; }
    setModalVisible(false);
    setNuevoNombre(""); setNuevoTelefono(""); setNuevoDescripcion("");
    cargarDatos();
  };

  // 6. Eliminar emergencia (presidente)
  const eliminarEmergencia = (contacto: ContactoEmergencia) => {
    Alert.alert("Eliminar contacto", `Eliminar "${contacto.nombre}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: async () => {
          await supabase.from("contacto_emergencia").delete().eq("id", contacto.id);
          cargarDatos();
        },
      },
    ]);
  };

  // Filtro
  const vecinosFiltrados = vecinos.filter((v) =>
    `${v.nombre} ${v.apellidos ?? ""}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  const iconos = ["call", "warning", "shield", "flame", "medkit", "water", "construct"];

  if (cargandoUsuario) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}><Text style={styles.headerTitle}>Contactos</Text></View>
        <View style={styles.centered}><ActivityIndicator size="large" color="#2F67E8" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>

      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>Contactos</Text>
        <View style={{ flex: 1 }} />
        {esPresidente && tab === "emergencias" && (
          <Pressable style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={16} color="white" />
            <Text style={styles.addBtnText}>Nuevo</Text>
          </Pressable>
        )}
      </View>

      {/* TABS: Vecinos / Emergencias */}
      <View style={styles.tabsRow}>
        <Pressable
          style={[styles.tabChip, tab === "vecinos" && styles.tabChipActive]}
          onPress={() => setTab("vecinos")}
        >
          <Ionicons name="people-outline" size={16} color={tab === "vecinos" ? "white" : "#6B7280"} />
          <Text style={[styles.tabChipText, tab === "vecinos" && styles.tabChipTextActive]}>
            Vecinos ({vecinos.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabChip, tab === "emergencias" && styles.tabChipEmergActive]}
          onPress={() => setTab("emergencias")}
        >
          <Ionicons name="call-outline" size={16} color={tab === "emergencias" ? "white" : "#6B7280"} />
          <Text style={[styles.tabChipText, tab === "emergencias" && styles.tabChipTextActive]}>
            Emergencias ({emergencias.length})
          </Text>
        </Pressable>
      </View>

      {cargando ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2F67E8" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2F67E8" />}
        >

          {/* ── VECINOS ─────────────────────────────────────────────────────── */}
          {tab === "vecinos" && (
            <>
              {/* Buscador */}
              <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={16} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar vecino..."
                  placeholderTextColor="#9CA3AF"
                  value={busqueda}
                  onChangeText={setBusqueda}
                />
                {busqueda.length > 0 && (
                  <Pressable onPress={() => setBusqueda("")}>
                    <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                  </Pressable>
                )}
              </View>

              {vecinosFiltrados.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="people-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.emptyText}>
                    {busqueda ? "No se encontraron vecinos" : "Sin vecinos en tu comunidad"}
                  </Text>
                </View>
              ) : (
                vecinosFiltrados.map((v) => {
                  const esMio = v.id === usuario?.id;
                  return (
                    <Pressable
                      key={v.id}
                      style={styles.vecinoRow}
                      onPress={() => !esMio && abrirChat(v)}
                      disabled={esMio}
                    >
                      {/* Avatar */}
                      <View style={[styles.avatar, esMio && styles.avatarMio]}>
                        <Text style={[styles.avatarText, esMio && { color: "white" }]}>
                          {iniciales(v.nombre, v.apellidos)}
                        </Text>
                      </View>

                      {/* Info */}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={styles.vecinoNombre}>
                            {v.nombre} {v.apellidos ?? ""}
                          </Text>
                          {esMio && (
                            <View style={styles.tuBadge}>
                              <Text style={styles.tuBadgeText}>Tu</Text>
                            </View>
                          )}
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                          <View style={[styles.rolBadge, { backgroundColor: rolColor(v.rol) + "18" }]}>
                            <Text style={[styles.rolBadgeText, { color: rolColor(v.rol) }]}>
                              {rolLabel(v.rol)}
                            </Text>
                          </View>
                          {v.telefono && (
                            <Text style={styles.vecinoPiso}>{v.telefono}</Text>
                          )}
                        </View>
                      </View>

                      {/* Icono chat */}
                      {!esMio && (
                        <View style={styles.chatIcon}>
                          <Ionicons name="chatbubble-outline" size={18} color="#2F67E8" />
                        </View>
                      )}
                    </Pressable>
                  );
                })
              )}
            </>
          )}

          {/* ── EMERGENCIAS ─────────────────────────────────────────────────── */}
          {tab === "emergencias" && (
            <>
              {/* Aviso */}
              <View style={styles.emergAviso}>
                <Ionicons name="information-circle-outline" size={18} color="#DC2626" />
                <Text style={styles.emergAvisoText}>
                  Pulsa en un contacto para llamar directamente
                </Text>
              </View>

              {emergencias.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="call-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.emptyText}>Sin contactos de emergencia</Text>
                </View>
              ) : (
                emergencias.map((c) => (
                  <Pressable
                    key={c.id}
                    style={styles.emergRow}
                    onPress={() => llamar(c.telefono)}
                  >
                    <View style={styles.emergIcon}>
                      <Ionicons name={iconoEmergencia(c.icono) as any} size={22} color="#DC2626" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.emergNombre}>{c.nombre}</Text>
                      {c.descripcion && (
                        <Text style={styles.emergDesc}>{c.descripcion}</Text>
                      )}
                    </View>
                    <View style={styles.emergTelBox}>
                      <Ionicons name="call" size={14} color="white" />
                      <Text style={styles.emergTel}>{c.telefono}</Text>
                    </View>
                    {esPresidente && (
                      <Pressable
                        style={styles.emergDeleteBtn}
                        onPress={() => eliminarEmergencia(c)}
                        hitSlop={8}
                      >
                        <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      </Pressable>
                    )}
                  </Pressable>
                ))
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* TAB BAR */}
      <BottomTabBar />

      {/* ── MODAL NUEVO CONTACTO EMERGENCIA ─────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={["top"]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancelar}>Cancelar</Text>
            </Pressable>
            <Text style={styles.modalTitulo}>Nuevo contacto</Text>
            <Pressable
              onPress={crearEmergencia}
              disabled={guardando}
              style={[styles.modalGuardar, guardando && { opacity: 0.5 }]}
            >
              {guardando
                ? <ActivityIndicator size="small" color="white" />
                : <Text style={styles.modalGuardarText}>Guardar</Text>}
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
            {/* Nombre */}
            <View>
              <Text style={styles.modalLabel}>Nombre</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. Bomberos, Fontanero..."
                placeholderTextColor="#9CA3AF"
                value={nuevoNombre}
                onChangeText={setNuevoNombre}
                maxLength={60}
              />
            </View>

            {/* Telefono */}
            <View>
              <Text style={styles.modalLabel}>Telefono</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. 112, 092, 600123456..."
                placeholderTextColor="#9CA3AF"
                value={nuevoTelefono}
                onChangeText={setNuevoTelefono}
                keyboardType="phone-pad"
                maxLength={20}
              />
            </View>

            {/* Descripcion */}
            <View>
              <Text style={styles.modalLabel}>Descripcion (opcional)</Text>
              <TextInput
                style={[styles.modalInput, { height: 60, textAlignVertical: "top" }]}
                placeholder="Breve descripcion del contacto..."
                placeholderTextColor="#9CA3AF"
                value={nuevoDescripcion}
                onChangeText={setNuevoDescripcion}
                multiline
                maxLength={120}
              />
            </View>

            {/* Icono */}
            <View>
              <Text style={styles.modalLabel}>Icono</Text>
              <View style={styles.iconRow}>
                {iconos.map((ic) => (
                  <Pressable
                    key={ic}
                    style={[styles.iconBtn, nuevoIcono === ic && styles.iconBtnActive]}
                    onPress={() => setNuevoIcono(ic)}
                  >
                    <Ionicons
                      name={iconoEmergencia(ic) as any}
                      size={20}
                      color={nuevoIcono === ic ? "white" : "#6B7280"}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4FB" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },

  header: {
    height: 64, backgroundColor: "#2F67E8",
    flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 6,
  },
  backButton: { width: 32, justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "700" },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)", borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)", paddingVertical: 7,
    paddingHorizontal: 11, borderRadius: 20,
  },
  addBtnText: { color: "white", fontSize: 13, fontWeight: "700" },

  tabsRow: {
    flexDirection: "row", backgroundColor: "white",
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
    borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  tabChip: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 8, borderRadius: 12, backgroundColor: "#F1F5F9",
  },
  tabChipActive: { backgroundColor: "#2F67E8" },
  tabChipEmergActive: { backgroundColor: "#DC2626" },
  tabChipText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  tabChipTextActive: { color: "white" },

  searchContainer: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#E8ECF4",
    marginHorizontal: 14, marginVertical: 12, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, gap: 6,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1F2937" },

  emptyBox: { alignItems: "center", paddingVertical: 50, gap: 10 },
  emptyText: { fontSize: 14, color: "#9CA3AF" },

  // Vecinos
  vecinoRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "white", marginHorizontal: 14, marginBottom: 6,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, gap: 12,
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center",
  },
  avatarMio: { backgroundColor: "#2F67E8" },
  avatarText: { fontSize: 16, fontWeight: "700", color: "#2F67E8" },
  vecinoNombre: { fontSize: 15, fontWeight: "600", color: "#111827" },
  vecinoPiso: { fontSize: 12, color: "#9CA3AF" },
  rolBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  rolBadgeText: { fontSize: 11, fontWeight: "700" },
  tuBadge: { backgroundColor: "#DBEAFE", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  tuBadgeText: { fontSize: 10, fontWeight: "700", color: "#2F67E8" },
  chatIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center",
  },

  // Emergencias
  emergAviso: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 14, marginVertical: 12,
    backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: "#FECACA",
  },
  emergAvisoText: { fontSize: 13, color: "#991B1B", flex: 1 },
  emergRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "white", marginHorizontal: 14, marginBottom: 8,
    borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14, gap: 12,
    borderLeftWidth: 3, borderLeftColor: "#DC2626",
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  emergIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center",
  },
  emergNombre: { fontSize: 15, fontWeight: "700", color: "#111827" },
  emergDesc: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  emergTelBox: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#DC2626", borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  emergTel: { color: "white", fontSize: 14, fontWeight: "800" },
  emergDeleteBtn: { padding: 6 },

  bottomTabBar: {
    borderTopWidth: 1, borderTopColor: "#D1D5DB",
    flexDirection: "row", backgroundColor: "white",
  },

  // Modal
  modalSafe: { flex: 1, backgroundColor: "white" },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  modalCancelar: { fontSize: 15, color: "#6B7280" },
  modalTitulo: { fontSize: 17, fontWeight: "700", color: "#111827" },
  modalGuardar: {
    backgroundColor: "#DC2626", paddingVertical: 7,
    paddingHorizontal: 16, borderRadius: 20,
  },
  modalGuardarText: { color: "white", fontWeight: "700", fontSize: 14 },
  modalLabel: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8 },
  modalInput: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: "#111827", backgroundColor: "#F9FAFB",
  },
  iconRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  iconBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "transparent",
  },
  iconBtnActive: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
});