// app/chat/id.tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { supabase } from "../../src/lib/supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Mensaje = {
  id: string; chat_id: string; usuario_id: string;
  autor: string; contenido: string; created_at: string;
};

type Miembro = {
  id: string; usuario_id: string; nombre: string;
  apellidos: string | null; rol: string; activo: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}
function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}
function mismaFecha(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

const COLORES_AUTOR = [
  "#E53E3E", "#DD6B20", "#D69E2E", "#38A169",
  "#2B6CB0", "#6B46C1", "#B83280", "#00B5D8",
];
function colorParaAutor(nombre: string): string {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  return COLORES_AUTOR[Math.abs(hash) % COLORES_AUTOR.length];
}

// ─── Burbuja ──────────────────────────────────────────────────────────────────

function Burbuja({ mensaje, esMio, mostrarNombre }: { mensaje: Mensaje; esMio: boolean; mostrarNombre: boolean }) {
  return (
    <View style={[styles.burbujaWrap, esMio ? styles.wrapRight : styles.wrapLeft]}>
      {!esMio && mostrarNombre && (
        <Text style={[styles.autorNombre, { color: colorParaAutor(mensaje.autor) }]}>
          {mensaje.autor}
        </Text>
      )}
      <View style={[styles.burbuja, esMio ? styles.burbujaPropia : styles.burbujaAjena]}>
        <Text style={[styles.burbujaTexto, esMio && { color: "white" }]}>
          {mensaje.contenido}
        </Text>
        <Text style={[styles.horaInterna, esMio && { color: "rgba(255,255,255,0.65)" }]}>
          {formatHora(mensaje.created_at)}
        </Text>
      </View>
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function ChatScreen() {
  const router = useRouter();
  const { id, nombre } = useLocalSearchParams<{ id: string; nombre: string }>();

  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const [miUserId, setMiUserId]     = useState<string | null>(null);
  const [miRol, setMiRol]           = useState<string>("");
  const [comunidadId, setComunidadId] = useState<string>("");

  // Menú de opciones
  const [menuVisible, setMenuVisible]           = useState(false);
  // Sub-menú silenciar
  const [silenciarVisible, setSilenciarVisible] = useState(false);
  // Modal participantes
  const [partVisible, setPartVisible]           = useState(false);
  const [miembros, setMiembros]                 = useState<Miembro[]>([]);
  const [cargandoMiembros, setCargandoMiembros] = useState(false);
  // Modal añadir miembro (presidente)
  const [addVisible, setAddVisible]             = useState(false);
  const [vecinosBuscar, setVecinosBuscar]       = useState<Miembro[]>([]);
  const [selAdd, setSelAdd]                     = useState<string[]>([]);
  const [guardandoAdd, setGuardandoAdd]         = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const esPresidente = miRol === "PRESIDENTE";

  // 1. Cargar usuario
  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perfil } = await supabase
        .from("usuario").select("id, nombre, apellidos, rol, comunidad_id")
        .eq("email", user.email).single();

      if (perfil) {
        setMiUserId(perfil.id);
        setMiRol(perfil.rol);
        setComunidadId(perfil.comunidad_id);
      }
    };
    cargar();
  }, []);

  // 2. Cargar mensajes
  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      const { data, error } = await supabase
        .from("mensaje")
        .select("id, chat_id, contenido, created_at, usuario_id, usuario:usuario_id(nombre, apellidos)")
        .eq("chat_id", id).order("created_at", { ascending: true }).limit(200);

      if (!error && data) {
        setMensajes(data.map((m: any) => ({
          id: m.id, chat_id: m.chat_id, usuario_id: m.usuario_id,
          contenido: m.contenido, created_at: m.created_at,
          autor: m.usuario
            ? m.usuario.apellidos ? `${m.usuario.nombre} ${m.usuario.apellidos}` : m.usuario.nombre
            : "Desconocido",
        })));
      }
      setCargando(false);
    };
    cargar();
  }, [id]);

  // 3. Realtime
  useEffect(() => {
    const channel = supabase.channel(`chat:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensaje", filter: `chat_id=eq.${id}` },
        async (payload) => {
          const nuevo = payload.new as any;
          let autor = "Desconocido";
          if (nuevo.usuario_id) {
            const { data: p } = await supabase.from("usuario").select("nombre, apellidos").eq("id", nuevo.usuario_id).single();
            if (p) autor = p.apellidos ? `${p.nombre} ${p.apellidos}` : p.nombre;
          }
          const completo: Mensaje = { ...nuevo, autor };
          setMensajes((prev) => prev.some((m) => m.id === completo.id) ? prev : [...prev, completo]);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // 4. Scroll al final
  useEffect(() => {
    if (!cargando && mensajes.length > 0)
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 150);
  }, [cargando]);

  // 5. Enviar mensaje
  const enviar = useCallback(async () => {
    const contenido = texto.trim();
    if (!contenido || enviando || !miUserId) return;
    setTexto("");
    setEnviando(true);
    await supabase.from("mensaje").insert({ chat_id: id, usuario_id: miUserId, contenido });
    setEnviando(false);
  }, [texto, id, enviando, miUserId]);

  // ── Acciones del menú ──────────────────────────────────────────────────────

  const salirGrupo = () => {
    setMenuVisible(false);
    Alert.alert("Salir del grupo", "¿Seguro que quieres salir de este grupo?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir", style: "destructive",
        onPress: async () => {
          if (!miUserId) return;
          await supabase.from("chat_miembro")
            .update({ activo: false }).eq("chat_id", id).eq("usuario_id", miUserId);
          router.back();
        },
      },
    ]);
  };

  const silenciar = async (opcion: "siempre" | "dia" | "semana") => {
    setSilenciarVisible(false);
    setMenuVisible(false);
    if (!miUserId) return;

    let hasta: string | null = null;
    if (opcion === "dia")    hasta = new Date(Date.now() + 86400000).toISOString();
    if (opcion === "semana") hasta = new Date(Date.now() + 604800000).toISOString();

    await supabase.from("chat_miembro")
      .update({ silenciado_hasta: hasta })
      .eq("chat_id", id).eq("usuario_id", miUserId);

    Alert.alert("Grupo silenciado", opcion === "siempre" ? "Silenciado indefinidamente." : opcion === "dia" ? "Silenciado durante 1 día." : "Silenciado durante 1 semana.");
  };

  const verParticipantes = async () => {
    setMenuVisible(false);
    setPartVisible(true);
    setCargandoMiembros(true);

    const { data } = await supabase
      .from("chat_miembro")
      .select("id, usuario_id, activo, usuario:usuario_id(nombre, apellidos, rol)")
      .eq("chat_id", id).eq("activo", true);

    if (data) {
      setMiembros(data.map((m: any) => ({
        id: m.id, usuario_id: m.usuario_id, activo: m.activo,
        nombre: m.usuario?.nombre ?? "?",
        apellidos: m.usuario?.apellidos ?? null,
        rol: m.usuario?.rol ?? "",
      })));
    }
    setCargandoMiembros(false);
  };

  const eliminarMiembro = (miembro: Miembro) => {
    Alert.alert("Eliminar miembro", `¿Eliminar a ${miembro.nombre} del grupo?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: async () => {
          await supabase.from("chat_miembro")
            .update({ activo: false }).eq("id", miembro.id);
          setMiembros((prev) => prev.filter((m) => m.id !== miembro.id));
        },
      },
    ]);
  };

  const abrirAnadir = async () => {
    setPartVisible(false);
    setSelAdd([]);
    setAddVisible(true);

    // Vecinos de la comunidad que NO están ya en el grupo
    const { data: enGrupo } = await supabase
      .from("chat_miembro").select("usuario_id").eq("chat_id", id).eq("activo", true);
    const idsEnGrupo = (enGrupo ?? []).map((m: any) => m.usuario_id);

    const { data: todos } = await supabase
      .from("usuario").select("id, nombre, apellidos, rol")
      .eq("comunidad_id", comunidadId).order("nombre");

    const fuera = (todos ?? []).filter((v: any) => !idsEnGrupo.includes(v.id));
    setVecinosBuscar(fuera.map((v: any) => ({ id: v.id, usuario_id: v.id, nombre: v.nombre, apellidos: v.apellidos, rol: v.rol, activo: true })));
  };

  const confirmarAnadir = async () => {
    if (selAdd.length === 0) return;
    setGuardandoAdd(true);
    const nuevos = selAdd.map((uid) => ({ chat_id: id, usuario_id: uid }));
    await supabase.from("chat_miembro").insert(nuevos);
    setGuardandoAdd(false);
    setAddVisible(false);
    Alert.alert("Listo", `${selAdd.length} miembro(s) añadido(s) al grupo.`);
  };

  // ── Render item ────────────────────────────────────────────────────────────

  const renderItem = useCallback(({ item, index }: { item: Mensaje; index: number }) => {
    const esMio = item.usuario_id === miUserId;
    const anterior = mensajes[index - 1];
    const mostrarFecha   = !anterior || !mismaFecha(anterior.created_at, item.created_at);
    const mostrarNombre  = !anterior || anterior.usuario_id !== item.usuario_id;
    return (
      <>
        {mostrarFecha && (
          <View style={styles.fechaSeparador}>
            <Text style={styles.fechaTexto}>{formatFecha(item.created_at)}</Text>
          </View>
        )}
        <Burbuja mensaje={item} esMio={esMio} mostrarNombre={mostrarNombre} />
      </>
    );
  }, [mensajes, miUserId]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>

      {/* HEADER — es lo primero en pantalla, sin header nativo de Expo Router */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="white" />
        </Pressable>
        <View style={styles.headerAvatar}>
          <Ionicons name="people" size={18} color="white" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerNombre}>{nombre ?? id}</Text>
          <Text style={styles.headerSub}>Chat grupal</Text>
        </View>
        <Pressable style={styles.headerAction} onPress={() => setMenuVisible(true)}>
          <Ionicons name="ellipsis-vertical" size={20} color="white" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        {/* MENSAJES */}
        {cargando ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#2F67E8" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={mensajes}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.lista}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            ListEmptyComponent={
              <View style={styles.vacio}>
                <Ionicons name="chatbubble-ellipses-outline" size={48} color="#D1D5DB" />
                <Text style={styles.vacioTexto}>Sin mensajes aun</Text>
                <Text style={styles.vacioSub}>Se el primero en escribir!</Text>
              </View>
            }
          />
        )}

        {/* INPUT — dentro del KAV, sube con el teclado */}
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#9CA3AF"
            value={texto}
            onChangeText={setTexto}
            multiline
            maxLength={500}
            onFocus={() => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300)}
          />
          <Pressable
            style={[styles.sendBtn, (!texto.trim() || enviando) && styles.sendBtnDisabled]}
            onPress={enviar}
            disabled={!texto.trim() || enviando}
          >
            {enviando
              ? <ActivityIndicator size="small" color="white" />
              : <Ionicons name="send" size={18} color="white" />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* ── MENÚ OPCIONES ─────────────────────────────────────────────────── */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => { setMenuVisible(false); setSilenciarVisible(false); }}>
          <View style={styles.menuCard}>

            {/* Salir del grupo */}
            <Pressable style={styles.menuItem} onPress={salirGrupo}>
              <Ionicons name="exit-outline" size={20} color="#DC2626" />
              <Text style={[styles.menuItemText, { color: "#DC2626" }]}>Salir del grupo</Text>
            </Pressable>

            <View style={styles.menuDivider} />

            {/* Silenciar */}
            <Pressable style={styles.menuItem} onPress={() => setSilenciarVisible(!silenciarVisible)}>
              <Ionicons name="notifications-off-outline" size={20} color="#374151" />
              <Text style={styles.menuItemText}>Silenciar grupo</Text>
              <Ionicons name={silenciarVisible ? "chevron-up" : "chevron-down"} size={16} color="#9CA3AF" style={{ marginLeft: "auto" }} />
            </Pressable>

            {silenciarVisible && (
              <View style={styles.subMenu}>
                {([
                  { label: "Para siempre", key: "siempre" as const, icon: "infinite-outline" },
                  { label: "Durante 1 día", key: "dia" as const, icon: "today-outline" },
                  { label: "Durante 1 semana", key: "semana" as const, icon: "calendar-outline" },
                ] as const).map((op) => (
                  <Pressable key={op.key} style={styles.subMenuItem} onPress={() => silenciar(op.key)}>
                    <Ionicons name={op.icon as any} size={16} color="#6B7280" />
                    <Text style={styles.subMenuText}>{op.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.menuDivider} />

            {/* Ver participantes */}
            <Pressable style={styles.menuItem} onPress={verParticipantes}>
              <Ionicons name="people-outline" size={20} color="#374151" />
              <Text style={styles.menuItemText}>Ver participantes</Text>
            </Pressable>

            {/* Añadir / Eliminar miembros (solo PRESIDENTE) */}
            {esPresidente && (
              <>
                <View style={styles.menuDivider} />
                <Pressable style={styles.menuItem} onPress={abrirAnadir}>
                  <Ionicons name="person-add-outline" size={20} color="#2F67E8" />
                  <Text style={[styles.menuItemText, { color: "#2F67E8" }]}>Añadir / Eliminar miembro</Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* ── MODAL PARTICIPANTES ────────────────────────────────────────────── */}
      <Modal visible={partVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPartVisible(false)}>
        <SafeAreaView style={styles.modalSafe} edges={["top"]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitulo}>Participantes</Text>
            <Pressable onPress={() => setPartVisible(false)} style={styles.modalClose}>
              <Ionicons name="close" size={22} color="#374151" />
            </Pressable>
          </View>

          {cargandoMiembros ? (
            <View style={styles.loading}><ActivityIndicator color="#2F67E8" /></View>
          ) : (
            <ScrollView>
              {miembros.map((m) => (
                <View key={m.id} style={styles.miembroRow}>
                  <View style={styles.miembroAvatar}>
                    <Text style={styles.miembroIniciales}>
                      {m.nombre.charAt(0)}{m.apellidos?.charAt(0) ?? ""}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miembroNombre}>{m.nombre} {m.apellidos ?? ""}</Text>
                    <Text style={styles.miembroRol}>{m.rol}</Text>
                  </View>
                  {/* Presidente puede expulsar (a otros) */}
                  {esPresidente && m.usuario_id !== miUserId && (
                    <Pressable style={styles.expulsarBtn} onPress={() => eliminarMiembro(m)}>
                      <Ionicons name="person-remove-outline" size={18} color="#DC2626" />
                    </Pressable>
                  )}
                </View>
              ))}
            </ScrollView>
          )}

          {esPresidente && (
            <View style={styles.modalFooter}>
              <Pressable style={styles.anadirBtn} onPress={abrirAnadir}>
                <Ionicons name="person-add-outline" size={18} color="white" />
                <Text style={styles.anadirBtnText}>Añadir miembro</Text>
              </Pressable>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* ── MODAL AÑADIR MIEMBRO ───────────────────────────────────────────── */}
      <Modal visible={addVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAddVisible(false)}>
        <SafeAreaView style={styles.modalSafe} edges={["top"]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setAddVisible(false)}>
              <Text style={styles.modalCancelar}>Cancelar</Text>
            </Pressable>
            <Text style={styles.modalTitulo}>Añadir miembro</Text>
            <Pressable
              onPress={confirmarAnadir}
              disabled={guardandoAdd || selAdd.length === 0}
              style={[styles.modalConfirm, (guardandoAdd || selAdd.length === 0) && { opacity: 0.4 }]}
            >
              {guardandoAdd
                ? <ActivityIndicator size="small" color="white" />
                : <Text style={styles.modalConfirmText}>Añadir ({selAdd.length})</Text>}
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {vecinosBuscar.length === 0 ? (
              <View style={styles.vacio}>
                <Text style={styles.vacioTexto}>Todos los vecinos ya están en el grupo</Text>
              </View>
            ) : (
              vecinosBuscar.map((v) => {
                const sel = selAdd.includes(v.usuario_id);
                return (
                  <Pressable
                    key={v.usuario_id}
                    style={styles.miembroRow}
                    onPress={() => setSelAdd((prev) => sel ? prev.filter((x) => x !== v.usuario_id) : [...prev, v.usuario_id])}
                  >
                    <View style={styles.miembroAvatar}>
                      <Text style={styles.miembroIniciales}>
                        {v.nombre.charAt(0)}{v.apellidos?.charAt(0) ?? ""}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.miembroNombre}>{v.nombre} {v.apellidos ?? ""}</Text>
                      <Text style={styles.miembroRol}>{v.rol}</Text>
                    </View>
                    <View style={[styles.checkbox, sel && styles.checkboxSel]}>
                      {sel && <Ionicons name="checkmark" size={14} color="white" />}
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4FB" },

  // Header — sin SafeArea extra, nombre directo, sin borde blanco superior
  header: {
    height: 64,
    backgroundColor: "#2F67E8",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 10,
  },
  backButton: { width: 32, alignItems: "center", justifyContent: "center" },
  headerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  headerNombre: { color: "white", fontSize: 16, fontWeight: "700" },
  headerSub:    { color: "rgba(255,255,255,0.7)", fontSize: 11 },
  headerAction: { width: 32, alignItems: "center" },

  // Lista
  lista: { paddingHorizontal: 12, paddingVertical: 14, flexGrow: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Separador fecha
  fechaSeparador: { alignItems: "center", marginVertical: 12 },
  fechaTexto: {
    fontSize: 11, fontWeight: "600", color: "#2F67E8",
    backgroundColor: "#DBEAFE", paddingHorizontal: 12,
    paddingVertical: 4, borderRadius: 12,
  },

  // Burbujas
  burbujaWrap: { marginBottom: 3, maxWidth: "78%" },
  wrapLeft:  { alignSelf: "flex-start", marginLeft: 4 },
  wrapRight: { alignSelf: "flex-end",   marginRight: 4 },
  autorNombre: { fontSize: 12, fontWeight: "700", marginBottom: 3, marginLeft: 12 },
  burbuja: { borderRadius: 18, paddingHorizontal: 13, paddingTop: 8, paddingBottom: 6 },
  burbujaPropia: {
    backgroundColor: "#2F67E8", borderBottomRightRadius: 4,
    shadowColor: "#2F67E8", shadowOpacity: 0.25, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  burbujaAjena: {
    backgroundColor: "white", borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: "#E0E8FB",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  burbujaTexto: { fontSize: 14, color: "#1F2937", lineHeight: 20, marginRight: 38 },
  horaInterna:  { fontSize: 10, color: "#9CA3AF", textAlign: "right", marginTop: -4 },

  // Vacío
  vacio: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 8 },
  vacioTexto: { fontSize: 16, fontWeight: "700", color: "#9CA3AF" },
  vacioSub:   { fontSize: 13, color: "#D1D5DB" },

  // Input
  inputWrap: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#E0E8FB",
  },
  input: {
    flex: 1, backgroundColor: "#F0F4FB", borderRadius: 22,
    borderWidth: 1, borderColor: "#D1D9F0",
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: "#1F2937", maxHeight: 120,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#2F67E8",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#2F67E8", shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  sendBtnDisabled: { backgroundColor: "#93C5FD", shadowOpacity: 0 },

  // Menú flotante (3 puntos)
  menuOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start", alignItems: "flex-end",
    paddingTop: 68, paddingRight: 12,
  },
  menuCard: {
    backgroundColor: "white", borderRadius: 14, minWidth: 230,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  menuItemText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  menuDivider: { height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 12 },
  subMenu: { backgroundColor: "#F9FAFB", paddingHorizontal: 12, paddingBottom: 6 },
  subMenuItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  subMenuText: { fontSize: 13, color: "#6B7280" },

  // Modales
  modalSafe: { flex: 1, backgroundColor: "white" },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  modalTitulo:      { fontSize: 17, fontWeight: "700", color: "#111827" },
  modalClose:       { padding: 4 },
  modalCancelar:    { fontSize: 15, color: "#6B7280" },
  modalConfirm: {
    backgroundColor: "#2F67E8", paddingVertical: 7,
    paddingHorizontal: 14, borderRadius: 20,
  },
  modalConfirmText: { color: "white", fontWeight: "700", fontSize: 13 },
  modalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB" },

  // Filas de miembros
  miembroRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6", gap: 12,
  },
  miembroAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center",
  },
  miembroIniciales: { fontSize: 15, fontWeight: "700", color: "#2F67E8" },
  miembroNombre: { fontSize: 14, fontWeight: "600", color: "#111827" },
  miembroRol:    { fontSize: 12, color: "#9CA3AF", marginTop: 1 },
  expulsarBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center",
  },
  anadirBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#2F67E8", borderRadius: 12, padding: 14,
  },
  anadirBtnText: { color: "white", fontWeight: "700", fontSize: 15 },

  // Checkbox
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: "#D1D5DB",
    alignItems: "center", justifyContent: "center",
  },
  checkboxSel: { backgroundColor: "#2F67E8", borderColor: "#2F67E8" },
});