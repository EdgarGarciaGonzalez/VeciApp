// app/chat/[id].tsx
//
// Pantalla de chat en tiempo real usando Supabase Realtime.
// Navega a esta pantalla con: router.push(`/chat/${chat.id}?nombre=${chat.nombre}`)
//
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Mensaje = {
  id: string;
  chat_id: string;
  autor: string;
  contenido: string;
  created_at: string;
};

// ─── Nombre local del usuario (ajusta según tu sistema de auth) ───────────────
// Si usas Supabase Auth puedes sustituirlo por: supabase.auth.getUser()
const MI_NOMBRE = "Yo"; // Cambia esto por el nombre/piso del usuario logueado

// ─── Utilidades ───────────────────────────────────────────────────────────────
function formatHora(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function formatFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}

function mismaFecha(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

// ─── Componente burbuja ───────────────────────────────────────────────────────
function Burbuja({ mensaje, esMio }: { mensaje: Mensaje; esMio: boolean }) {
  return (
    <View style={[styles.burbujaWrap, esMio ? styles.burbujaRight : styles.burbujaLeft]}>
      {!esMio && <Text style={styles.burbujaAutor}>{mensaje.autor}</Text>}
      <View style={[styles.burbuja, esMio ? styles.burbujaPropia : styles.burbujaAjena]}>
        <Text style={[styles.burbujaTexto, esMio && { color: "white" }]}>
          {mensaje.contenido}
        </Text>
      </View>
      <Text style={[styles.burbujaHora, esMio && { textAlign: "right" }]}>
        {formatHora(mensaje.created_at)}
      </Text>
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
  const flatListRef = useRef<FlatList>(null);

  // ── Cargar mensajes iniciales ──────────────────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      const { data, error } = await supabase
        .from("mensajes")
        .select("*")
        .eq("chat_id", id)
        .order("created_at", { ascending: true })
        .limit(100);

      if (!error && data) setMensajes(data);
      setCargando(false);
    };

    cargar();
  }, [id]);

  // ── Suscripción Realtime ───────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensajes",
          filter: `chat_id=eq.${id}`,
        },
        (payload) => {
          const nuevo = payload.new as Mensaje;
          setMensajes((prev) => {
            // Evitar duplicados
            if (prev.some((m) => m.id === nuevo.id)) return prev;
            return [...prev, nuevo];
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // ── Scroll al final al cargar ──────────────────────────────────────────────
  useEffect(() => {
    if (!cargando && mensajes.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [cargando]);

  // ── Enviar mensaje ─────────────────────────────────────────────────────────
  const enviar = useCallback(async () => {
    const contenido = texto.trim();
    if (!contenido || enviando) return;

    setTexto("");
    setEnviando(true);

    await supabase.from("mensajes").insert({
      chat_id: id,
      autor: MI_NOMBRE,
      contenido,
    });

    setEnviando(false);
  }, [texto, id, enviando]);

  // ── Render item ────────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item, index }: { item: Mensaje; index: number }) => {
      const esMio = item.autor === MI_NOMBRE;
      const anterior = mensajes[index - 1];
      const mostrarFecha = !anterior || !mismaFecha(anterior.created_at, item.created_at);

      return (
        <>
          {mostrarFecha && (
            <View style={styles.fechaSeparador}>
              <Text style={styles.fechaTexto}>{formatFecha(item.created_at)}</Text>
            </View>
          )}
          <Burbuja mensaje={item} esMio={esMio} />
        </>
      );
    },
    [mensajes]
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="white" />
        </Pressable>
        <View style={styles.headerAvatar}>
          <Ionicons name="people" size={18} color="#2F67E8" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerNombre}>{nombre ?? id}</Text>
          <Text style={styles.headerSub}>Chat grupal</Text>
        </View>
        <Pressable style={styles.headerAction}>
          <Ionicons name="ellipsis-vertical" size={20} color="white" />
        </Pressable>
      </View>

      {/* MENSAJES */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
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
            ListEmptyComponent={
              <View style={styles.vacio}>
                <Ionicons name="chatbubble-ellipses-outline" size={48} color="#D1D5DB" />
                <Text style={styles.vacioTexto}>Sin mensajes aún</Text>
                <Text style={styles.vacioSub}>¡Sé el primero en escribir!</Text>
              </View>
            }
          />
        )}

        {/* INPUT */}
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#9CA3AF"
            value={texto}
            onChangeText={setTexto}
            multiline
            maxLength={500}
            returnKeyType="default"
          />
          <Pressable
            style={[styles.sendBtn, (!texto.trim() || enviando) && styles.sendBtnDisabled]}
            onPress={enviar}
            disabled={!texto.trim() || enviando}
          >
            {enviando ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="send" size={18} color="white" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4FB" },

  // Header
  header: {
    height: 64,
    backgroundColor: "#2F67E8",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 10,
  },
  backButton: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerNombre: { color: "white", fontSize: 16, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: 11 },
  headerAction: { width: 32, alignItems: "center" },

  // Lista
  lista: { paddingHorizontal: 12, paddingVertical: 16, flexGrow: 1 },

  loading: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Fecha separador
  fechaSeparador: { alignItems: "center", marginVertical: 12 },
  fechaTexto: {
    fontSize: 11,
    color: "#6B7280",
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },

  // Burbujas
  burbujaWrap: { marginBottom: 6, maxWidth: "80%" },
  burbujaLeft: { alignSelf: "flex-start" },
  burbujaRight: { alignSelf: "flex-end" },

  burbujaAutor: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2F67E8",
    marginBottom: 2,
    marginLeft: 4,
  },
  burbuja: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  burbujaPropia: {
    backgroundColor: "#2F67E8",
    borderBottomRightRadius: 4,
  },
  burbujaAjena: {
    backgroundColor: "white",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  burbujaTexto: { fontSize: 14, color: "#1F2937", lineHeight: 20 },
  burbujaHora: { fontSize: 10, color: "#9CA3AF", marginTop: 3, marginHorizontal: 4 },

  // Estado vacío
  vacio: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 8 },
  vacioTexto: { fontSize: 16, fontWeight: "700", color: "#9CA3AF" },
  vacioSub: { fontSize: 13, color: "#D1D5DB" },

  // Input
  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  input: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2937",
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#2F67E8",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#93C5FD" },
});