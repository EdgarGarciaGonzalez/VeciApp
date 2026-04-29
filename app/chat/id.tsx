// app/chat/id.tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../src/lib/supabase";

type Mensaje = {
  id: string;
  chat_id: string;
  usuario_id: string;
  autor: string;
  contenido: string;
  created_at: string;
};

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
  });
}

function mismaFecha(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

// Colores para los nombres de distintos usuarios (estilo WhatsApp grupos)
const COLORES_AUTOR = [
  "#E53E3E", "#DD6B20", "#D69E2E", "#38A169",
  "#2B6CB0", "#6B46C1", "#B83280", "#00B5D8",
];

function colorParaAutor(nombre: string): string {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORES_AUTOR[Math.abs(hash) % COLORES_AUTOR.length];
}

// Burbuja estilo WhatsApp
function Burbuja({
  mensaje,
  esMio,
  mostrarNombre,
}: {
  mensaje: Mensaje;
  esMio: boolean;
  mostrarNombre: boolean;
}) {
  return (
    <View style={[styles.burbujaWrap, esMio ? styles.wrapRight : styles.wrapLeft]}>
      {/* Nombre del autor — solo en mensajes ajenos y cuando cambia de remitente */}
      {!esMio && mostrarNombre && (
        <Text style={[styles.autorNombre, { color: colorParaAutor(mensaje.autor) }]}>
          {mensaje.autor}
        </Text>
      )}

      <View style={[styles.burbuja, esMio ? styles.burbujaPropia : styles.burbujaAjena]}>
        <Text style={[styles.burbujaTexto, esMio && { color: "white" }]}>
          {mensaje.contenido}
        </Text>
        {/* Hora dentro de la burbuja, pegada abajo a la derecha */}
        <Text style={[styles.horaInterna, esMio && { color: "rgba(255,255,255,0.7)" }]}>
          {formatHora(mensaje.created_at)}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const { id, nombre } = useLocalSearchParams<{ id: string; nombre: string }>();

  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // ID del usuario autenticado (para comparar quién es "yo")
  const [miUserId, setMiUserId] = useState<string | null>(null);
  const [miNombre, setMiNombre] = useState<string>("");

  const flatListRef = useRef<FlatList>(null);

  // 1. Cargar usuario autenticado
  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setMiUserId(user.id);

      // Buscar perfil por auth user id
      const { data: perfil } = await supabase
        .from("usuario")
        .select("nombre, apellidos")
        .eq("id", user.id)
        .single();

      if (perfil) {
        setMiNombre(
          perfil.apellidos
            ? `${perfil.nombre} ${perfil.apellidos}`
            : perfil.nombre
        );
      } else {
        // Fallback: buscar por email
        const { data: perfilEmail } = await supabase
          .from("usuario")
          .select("id, nombre, apellidos")
          .eq("email", user.email)
          .single();

        if (perfilEmail) {
          setMiUserId(perfilEmail.id);
          setMiNombre(
            perfilEmail.apellidos
              ? `${perfilEmail.nombre} ${perfilEmail.apellidos}`
              : perfilEmail.nombre
          );
        } else {
          setMiNombre(user.email ?? "Yo");
        }
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
        .select(
          "id, chat_id, contenido, created_at, usuario_id, usuario:usuario_id(nombre, apellidos)"
        )
        .eq("chat_id", id)
        .order("created_at", { ascending: true })
        .limit(100);

      if (!error && data) {
        const formateados = data.map((m: any) => ({
          id: m.id,
          chat_id: m.chat_id,
          usuario_id: m.usuario_id,
          contenido: m.contenido,
          created_at: m.created_at,
          autor: m.usuario
            ? m.usuario.apellidos
              ? `${m.usuario.nombre} ${m.usuario.apellidos}`
              : m.usuario.nombre
            : "Desconocido",
        }));
        setMensajes(formateados);
      }
      setCargando(false);
    };
    cargar();
  }, [id]);

  // 3. Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensaje",
          filter: `chat_id=eq.${id}`,
        },
        async (payload) => {
          const nuevo = payload.new as any;
          let autor = "Desconocido";
          if (nuevo.usuario_id) {
            const { data: p } = await supabase
              .from("usuario")
              .select("nombre, apellidos")
              .eq("id", nuevo.usuario_id)
              .single();
            if (p) autor = p.apellidos ? `${p.nombre} ${p.apellidos}` : p.nombre;
          }
          const completo: Mensaje = { ...nuevo, autor };
          setMensajes((prev) => {
            if (prev.some((m) => m.id === completo.id)) return prev;
            return [...prev, completo];
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // 4. Scroll al final al cargar
  useEffect(() => {
    if (!cargando && mensajes.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [cargando]);

  // 5. Enviar
  const enviar = useCallback(async () => {
    const contenido = texto.trim();
    if (!contenido || enviando || !miUserId) return;
    setTexto("");
    setEnviando(true);
    await supabase.from("mensaje").insert({
      chat_id: id,
      usuario_id: miUserId,
      contenido,
    });
    setEnviando(false);
  }, [texto, id, enviando, miUserId]);

  // 6. Render item
  const renderItem = useCallback(
    ({ item, index }: { item: Mensaje; index: number }) => {
      // "Es mio" se compara por usuario_id, no por nombre
      const esMio = item.usuario_id === miUserId;
      const anterior = mensajes[index - 1];
      const mostrarFecha =
        !anterior || !mismaFecha(anterior.created_at, item.created_at);
      // Mostrar nombre si cambia el remitente (agrupa mensajes consecutivos del mismo)
      const mostrarNombre =
        !anterior || anterior.usuario_id !== item.usuario_id;

      return (
        <>
          {mostrarFecha && (
            <View style={styles.fechaSeparador}>
              <Text style={styles.fechaTexto}>
                {formatFecha(item.created_at)}
              </Text>
            </View>
          )}
          <Burbuja
            mensaje={item}
            esMio={esMio}
            mostrarNombre={mostrarNombre}
          />
        </>
      );
    },
    [mensajes, miUserId]
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
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={48}
                  color="#D1D5DB"
                />
                <Text style={styles.vacioTexto}>Sin mensajes aun</Text>
                <Text style={styles.vacioSub}>Se el primero en escribir!</Text>
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
          />
          <Pressable
            style={[
              styles.sendBtn,
              (!texto.trim() || enviando) && styles.sendBtnDisabled,
            ]}
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
  safe: { flex: 1, backgroundColor: "#ECE5DD" }, // fondo estilo WhatsApp

  // Header
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
  lista: { paddingHorizontal: 10, paddingVertical: 12, flexGrow: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Fecha separador
  fechaSeparador: { alignItems: "center", marginVertical: 10 },
  fechaTexto: {
    fontSize: 11,
    color: "#5C5C5C",
    backgroundColor: "#D1F2E1",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },

  // Contenedor de cada burbuja
  burbujaWrap: {
    marginBottom: 3,
    maxWidth: "78%",
  },
  wrapLeft: {
    alignSelf: "flex-start",
    marginLeft: 4,
  },
  wrapRight: {
    alignSelf: "flex-end",
    marginRight: 4,
  },

  // Nombre del autor (solo mensajes ajenos)
  autorNombre: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
    marginLeft: 10,
  },

  // Burbuja
  burbuja: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 4,
  },
  burbujaPropia: {
    backgroundColor: "#DCF8C6", // verde WhatsApp
    borderTopRightRadius: 2,
  },
  burbujaAjena: {
    backgroundColor: "white",
    borderTopLeftRadius: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },

  burbujaTexto: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
    marginRight: 36, // espacio para la hora
  },

  // Hora dentro de la burbuja, esquina inferior derecha
  horaInterna: {
    fontSize: 10,
    color: "#9CA3AF",
    textAlign: "right",
    marginTop: -6,
  },

  // Vacio
  vacio: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  vacioTexto: { fontSize: 16, fontWeight: "700", color: "#9CA3AF" },
  vacioSub: { fontSize: 13, color: "#D1D5DB" },

  // Input
  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#F0F0F0",
  },
  input: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2937",
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2F67E8",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#93C5FD" },
});