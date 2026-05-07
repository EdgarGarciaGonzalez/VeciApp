// app/(tabs)/chat.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomTabBar, { TAB_BAR_HEIGHT } from "../../components/BottomTabBar";
import { supabase } from "../../src/lib/supabase";


type Chat = {
  id: string;
  nombre: string;
  tipo: "personal" | "grupo" | "edificio" | "servicio" | "urgente";
  ultimo_mensaje?: string;
  ultimo_mensaje_at?: string;
  no_leidos: number;
};

type Vecino = {
  id: string;
  nombre: string;
  apellidos: string | null;
  rol: string;
  email: string;
};

type UsuarioSesion = {
  id: string;
  rol: string;
  comunidad_id: string;
};

function tiempoRelativo(isoString?: string): string {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ayer";
  return `${days}d`;
}

function iconoPorTipo(tipo: Chat["tipo"]): string {
  const map: Record<Chat["tipo"], string> = {
    personal: "person",
    grupo: "people",
    edificio: "business",
    servicio: "construct",
    urgente: "alert-circle",
  };
  return map[tipo] ?? "chatbubble";
}

export default function ChatsScreen() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargandoUsuario, setCargandoUsuario] = useState(true);
  const [errorPerfil, setErrorPerfil] = useState(false);

  const [chats, setChats] = useState<Chat[]>([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [nombreGrupo, setNombreGrupo] = useState("");
  const [vecinos, setVecinos] = useState<Vecino[]>([]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [cargandoVecinos, setCargandoVecinos] = useState(false);
  const [creando, setCreando] = useState(false);

  const suscripcionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // 1. Cargar usuario de sesion
  useEffect(() => {
    const cargar = async () => {
      setCargandoUsuario(true);
      setErrorPerfil(false);
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user?.email) {
          router.replace("/login");
          return;
        }

        const { data, error } = await supabase
          .from("usuario")
          .select("id, rol, comunidad_id")
          .eq("email", user.email)
          .single();

        if (error || !data) {
          setErrorPerfil(true);
          return;
        }

        setUsuario(data);
      } catch (e) {
        setErrorPerfil(true);
      } finally {
        setCargandoUsuario(false);
      }
    };
    cargar();
  }, []);

  // 2. Cargar chats del usuario
  const cargarChats = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);

    const { data: memberships } = await supabase
      .from("chat_miembro")
      .select("chat_id")
      .eq("usuario_id", usuario.id);

    if (!memberships || memberships.length === 0) {
      setChats([]);
      setCargando(false);
      return;
    }

    const chatIds = memberships.map((m: any) => m.chat_id);

    const { data: chatsData } = await supabase
      .from("chat")
      .select("id, nombre, tipo, ultimo_mensaje_at")
      .in("id", chatIds)
      .order("ultimo_mensaje_at", { ascending: false });

    if (!chatsData) {
      setChats([]);
      setCargando(false);
      return;
    }

    const chatsConMensaje = await Promise.all(
      chatsData.map(async (chat: any) => {
        const { data: msgs } = await supabase
          .from("mensaje")
          .select("contenido")
          .eq("chat_id", chat.id)
          .order("created_at", { ascending: false })
          .limit(1);

        return {
          id: chat.id,
          nombre: chat.nombre,
          tipo: chat.tipo as Chat["tipo"],
          ultimo_mensaje: msgs?.[0]?.contenido,
          ultimo_mensaje_at: chat.ultimo_mensaje_at,
          no_leidos: 0,
        };
      })
    );

    setChats(chatsConMensaje);
    setCargando(false);
  }, [usuario]);

  useEffect(() => {
    if (usuario) cargarChats();
  }, [usuario, cargarChats]);

  // 3. Realtime
  useEffect(() => {
    if (!usuario) return;

    suscripcionRef.current?.unsubscribe();

    const canal = supabase
      .channel(`chats_usuario_${usuario.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_miembro",
          filter: `usuario_id=eq.${usuario.id}`,
        },
        () => cargarChats()
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensaje",
        },
        () => cargarChats()
      )
      .subscribe();

    suscripcionRef.current = canal;
    return () => { canal.unsubscribe(); };
  }, [usuario, cargarChats]);

  // 4. Abrir modal y cargar vecinos
  const abrirModal = async () => {
    if (!usuario) return;
    setModalVisible(true);
    setNombreGrupo("");
    setSeleccionados([]);
    setCargandoVecinos(true);

    const { data } = await supabase
      .from("usuario")
      .select("id, nombre, apellidos, rol, email")
      .eq("comunidad_id", usuario.comunidad_id)
      .neq("id", usuario.id)
      .order("nombre");

    setVecinos(data ?? []);
    setCargandoVecinos(false);
  };

  const toggleVecino = (id: string) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  // 5. Crear grupo
  const crearGrupo = async () => {
    if (!usuario) return;
    if (!nombreGrupo.trim()) {
      Alert.alert("Nombre requerido", "Escribe un nombre para el grupo.");
      return;
    }
    if (seleccionados.length === 0) {
      Alert.alert("Sin miembros", "Selecciona al menos un vecino.");
      return;
    }

    setCreando(true);

    const { data: nuevoChat, error: errorChat } = await supabase
      .from("chat")
      .insert({
        nombre: nombreGrupo.trim(),
        tipo: "grupo",
        comunidad_id: usuario.comunidad_id,
        creado_por: usuario.id,
        ultimo_mensaje_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (errorChat || !nuevoChat) {
      Alert.alert("Error", "No se pudo crear el grupo.");
      setCreando(false);
      return;
    }

    const miembros = [usuario.id, ...seleccionados].map((uid) => ({
      chat_id: nuevoChat.id,
      usuario_id: uid,
    }));

    const { error: errorMiembros } = await supabase
      .from("chat_miembro")
      .insert(miembros);

    if (errorMiembros) {
      Alert.alert("Error", "Grupo creado pero no se pudieron añadir los miembros.");
    } else {
      Alert.alert("Grupo creado", `"${nombreGrupo}" listo.`);
      setModalVisible(false);
      cargarChats();
    }

    setCreando(false);
  };

  const chatsFiltrados = chats.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const esPresidente = usuario?.rol === "PRESIDENTE";

  // Estado: cargando usuario
  if (cargandoUsuario) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chats</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2F67E8" />
          <Text style={styles.cargandoText}>Cargando…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Estado: error de perfil
  if (errorPerfil) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color="white" />
          </Pressable>
          <Text style={styles.headerTitle}>Chats</Text>
        </View>
        <View style={styles.centered}>
          <Ionicons name="person-circle-outline" size={48} color="#D1D5DB" />
          <Text style={[styles.cargandoText, { textAlign: "center", paddingHorizontal: 32 }]}>
            Tu cuenta no tiene perfil de vecino asociado.{"\n"}Contacta con el administrador.
          </Text>
          <Pressable style={styles.reintentarBtn} onPress={() => router.back()}>
            <Text style={styles.reintentarBtnText}>Volver</Text>
          </Pressable>
        </View>
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
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={{ flex: 1 }} />

        {/* Boton "Nuevo grupo" - solo PRESIDENTE */}
        {esPresidente && (
          <Pressable style={styles.nuevoGrupoBtn} onPress={abrirModal}>
            <Ionicons name="people" size={15} color="white" />
            <Text style={styles.nuevoGrupoBtnText}>Nuevo grupo</Text>
          </Pressable>
        )}
      </View>

      {/* BUSCADOR */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={16} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar chats..."
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

      {/* LISTA */}
      {cargando ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2F67E8" />
          <Text style={styles.cargandoText}>Cargando chats…</Text>
        </View>
      ) : (
        <FlatList
          data={chatsFiltrados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 18 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>
                {busqueda ? "No se encontraron chats" : "Aun no tienes chats"}
              </Text>
            </View>
          }
          renderItem={({ item: chat }) => (
            <Pressable
              style={styles.chatRow}
              onPress={() =>
                router.push({
                  pathname: "/chat/id",
                  params: { id: chat.id, nombre: chat.nombre },
                })
              }
            >
              <View
                style={[
                  styles.avatar,
                  chat.tipo === "urgente" ? styles.avatarUrgente : styles.avatarNormal,
                ]}
              >
                <Ionicons
                  name={iconoPorTipo(chat.tipo) as any}
                  size={22}
                  color={chat.tipo === "urgente" ? "#DC2626" : "#2F67E8"}
                />
              </View>

              <View style={styles.chatInfo}>
                <Text style={styles.chatNombre}>{chat.nombre}</Text>
                {chat.ultimo_mensaje && (
                  <Text style={styles.chatUltimo} numberOfLines={1}>
                    {chat.ultimo_mensaje}
                  </Text>
                )}
              </View>

              <View style={styles.chatRight}>
                {chat.ultimo_mensaje_at && (
                  <Text style={styles.chatHora}>
                    {tiempoRelativo(chat.ultimo_mensaje_at)}
                  </Text>
                )}
                <View style={styles.chatRightBottom}>
                  {chat.no_leidos > 0 && (
                    <View
                      style={[
                        styles.badge,
                        chat.tipo === "urgente" && styles.badgeUrgente,
                      ]}
                    >
                      <Text style={styles.badgeText}>{chat.no_leidos}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </View>
              </View>
            </Pressable>
          )}
        />
      )}

      {/* TAB BAR */}
      <BottomTabBar />

      {/* MODAL CREAR GRUPO */}
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
            <Text style={styles.modalTitulo}>Nuevo grupo</Text>
            <Pressable
              onPress={crearGrupo}
              disabled={creando}
              style={[styles.modalCrearBtn, creando && { opacity: 0.5 }]}
            >
              {creando ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.modalCrearBtnText}>Crear</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Nombre del grupo</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej. Escalera A, Propietarios..."
              placeholderTextColor="#9CA3AF"
              value={nombreGrupo}
              onChangeText={setNombreGrupo}
              maxLength={60}
            />
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>
              Anadir vecinos{" "}
              <Text style={styles.modalLabelCount}>
                ({seleccionados.length} seleccionados)
              </Text>
            </Text>
          </View>

          {cargandoVecinos ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#2F67E8" />
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              {vecinos.map((v) => {
                const marcado = seleccionados.includes(v.id);
                return (
                  <Pressable
                    key={v.id}
                    style={styles.vecinoRow}
                    onPress={() => toggleVecino(v.id)}
                  >
                    <View style={styles.vecinoAvatar}>
                      <Text style={styles.vecinoIniciales}>
                        {v.nombre.charAt(0).toUpperCase()}
                        {v.apellidos?.charAt(0).toUpperCase() ?? ""}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.vecinoNombre}>
                        {v.nombre} {v.apellidos ?? ""}
                      </Text>
                      <Text style={styles.vecinoRol}>{v.rol}</Text>
                    </View>
                    <View style={[styles.checkbox, marcado && styles.checkboxMarcado]}>
                      {marcado && <Ionicons name="checkmark" size={14} color="white" />}
                    </View>
                  </Pressable>
                );
              })}
              {vecinos.length === 0 && (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No hay vecinos en tu comunidad</Text>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4FB" },

  header: {
    height: 64,
    backgroundColor: "#2F67E8",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 6,
  },
  backButton: { width: 32, justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "700" },

  nuevoGrupoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 4,
  },
  nuevoGrupoBtnText: { color: "white", fontSize: 13, fontWeight: "700" },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8ECF4",
    marginHorizontal: 14,
    marginVertical: 12,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1F2937" },

  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarNormal: { backgroundColor: "#EEF2FF" },
  avatarUrgente: { backgroundColor: "#FEE2E2" },
  chatInfo: { flex: 1 },
  chatNombre: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 2 },
  chatUltimo: { fontSize: 12, color: "#6B7280" },
  chatRight: { alignItems: "flex-end", gap: 4 },
  chatHora: { fontSize: 11, color: "#9CA3AF" },
  chatRightBottom: { flexDirection: "row", alignItems: "center", gap: 4 },
  badge: {
    backgroundColor: "#2F67E8",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeUrgente: { backgroundColor: "#DC2626" },
  badgeText: { color: "white", fontSize: 10, fontWeight: "700" },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  cargandoText: { color: "#9CA3AF", fontSize: 14 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: "#9CA3AF" },

  reintentarBtn: {
    backgroundColor: "#2F67E8",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginTop: 8,
  },
  reintentarBtnText: { color: "white", fontWeight: "700" },

  tabBar: {
    borderTopWidth: 1,
    borderTopColor: "#D1D5DB",
    flexDirection: "row",
    backgroundColor: "white",
  },

  modalSafe: { flex: 1, backgroundColor: "white" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalCancelar: { color: "#6B7280", fontSize: 15 },
  modalTitulo: { fontSize: 17, fontWeight: "700", color: "#111827" },
  modalCrearBtn: {
    backgroundColor: "#2F67E8",
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  modalCrearBtnText: { color: "white", fontWeight: "700", fontSize: 14 },
  modalSection: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  modalLabel: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8 },
  modalLabelCount: { color: "#2F67E8", fontWeight: "600" },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },

  vecinoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  vecinoAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  vecinoIniciales: { fontSize: 15, fontWeight: "700", color: "#2F67E8" },
  vecinoNombre: { fontSize: 15, fontWeight: "600", color: "#111827" },
  vecinoRol: { fontSize: 12, color: "#9CA3AF", marginTop: 1 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxMarcado: { backgroundColor: "#2F67E8", borderColor: "#2F67E8" },
});