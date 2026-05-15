// app/(tabs)/incidencias.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomTabBar, { TAB_BAR_HEIGHT } from "../../components/BottomTabBar";
import { supabase } from "../../src/lib/supabase";

type Incidencia = {
  id: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  prioridad: number;
  created_at: string;
};

type UsuarioSesion = { id: string; rol: string; comunidad_id: string };

function estadoColor(e: string) {
  return { ABIERTA: "#DC2626", EN_PROCESO: "#D97706", RESUELTA: "#16A34A", CERRADA: "#6B7280" }[e] ?? "#6B7280";
}
function estadoLabel(e: string) {
  return { ABIERTA: "Abierta", EN_PROCESO: "En proceso", RESUELTA: "Resuelta", CERRADA: "Cerrada" }[e] ?? e;
}
function prioridadLabel(p: number) {
  return { 1: "Baja", 2: "Media", 3: "Alta" }[p] ?? "Media";
}
function prioridadColor(p: number) {
  return { 1: "#6B7280", 2: "#D97706", 3: "#DC2626" }[p] ?? "#D97706";
}

export default function IncidenciasScreen() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargandoUsuario, setCargandoUsuario] = useState(true);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const cargarIncidencias = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    const { data } = await supabase
      .from("incidencia")
      .select("id, titulo, descripcion, estado, prioridad, created_at")
      .eq("comunidad_id", usuario.comunidad_id)
      .order("created_at", { ascending: false });
    setIncidencias(data ?? []);
    setCargando(false);
  }, [usuario]);

  useEffect(() => { if (usuario) cargarIncidencias(); }, [usuario, cargarIncidencias]);

  const onRefresh = async () => { setRefreshing(true); await cargarIncidencias(); setRefreshing(false); };

  if (cargandoUsuario) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}><Text style={styles.headerTitle}>Incidencias</Text></View>
        <View style={styles.centered}><ActivityIndicator size="large" color="#2F67E8" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>Incidencias</Text>
        <View style={{ flex: 1 }} />
        <Pressable style={styles.nuevoBtn} onPress={() => router.push("/nueva-incidencia")}>
          <Ionicons name="add" size={16} color="white" />
          <Text style={styles.nuevoBtnText}>Nueva</Text>
        </Pressable>
      </View>

      {cargando ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#2F67E8" /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 14, paddingBottom: TAB_BAR_HEIGHT + 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2F67E8" />}
        >
          {incidencias.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="checkmark-circle-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No hay incidencias</Text>
              <Text style={styles.emptySub}>Todo esta en orden en tu comunidad</Text>
            </View>
          ) : (
            incidencias.map((inc) => (
              <View key={inc.id} style={[styles.card, { borderLeftColor: estadoColor(inc.estado) }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.badge, { backgroundColor: estadoColor(inc.estado) + "18" }]}>
                    <Text style={[styles.badgeText, { color: estadoColor(inc.estado) }]}>{estadoLabel(inc.estado)}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: prioridadColor(inc.prioridad) + "18" }]}>
                    <Text style={[styles.badgeText, { color: prioridadColor(inc.prioridad) }]}>
                      {prioridadLabel(inc.prioridad)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardTitle}>{inc.titulo}</Text>
                {inc.descripcion && <Text style={styles.cardDesc}>{inc.descripcion}</Text>}
                <Text style={styles.cardDate}>
                  {new Date(inc.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <BottomTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4FB" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    height: 64, backgroundColor: "#2F67E8",
    flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 6,
  },
  backBtn: { width: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "700" },
  nuevoBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)", borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)", paddingVertical: 7,
    paddingHorizontal: 11, borderRadius: 20,
  },
  nuevoBtnText: { color: "white", fontSize: 13, fontWeight: "700" },
  emptyBox: { alignItems: "center", paddingVertical: 50, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "700", color: "#9CA3AF" },
  emptySub: { fontSize: 13, color: "#D1D5DB" },
  card: {
    backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 10,
    borderLeftWidth: 3,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: "row", gap: 8, marginBottom: 8 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  cardDesc: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  cardDate: { fontSize: 11, color: "#9CA3AF", marginTop: 8 },
});