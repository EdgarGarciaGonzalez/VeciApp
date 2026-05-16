// app/(tabs)/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CalendarioComunidad from "../../components/CalendarioComunidad";
import BottomTabBar, { TAB_BAR_HEIGHT } from "../../components/BottomTabBar";
import { supabase } from "../../src/lib/supabase";

type Anuncio = {
  id: string;
  titulo: string;
  descripcion: string | null;
  created_at: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [comunidadId, setComunidadId] = useState<string | null>(null);
  const [rol, setRol] = useState<string>("");
  const [cargandoRol, setCargandoRol] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      setCargandoRol(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      const { data } = await supabase
        .from("usuario").select("comunidad_id, rol")
        .eq("email", user.email).single();
      if (data?.comunidad_id) setComunidadId(data.comunidad_id);
      if (data?.rol) setRol(data.rol);
      setCargandoRol(false);
    };
    cargar();
  }, []);

  const esTrabajador = rol === "TRABAJADOR";

  useEffect(() => {
    if (!comunidadId) return;
    const cargarDatos = async () => {
      const { data } = await supabase
        .from("anuncio")
        .select("id,titulo,descripcion,created_at")
        .eq("comunidad_id", comunidadId)
        .order("created_at", { ascending: false })
        .limit(3);
      setAnuncios(data ?? []);
    };
    cargarDatos();
  }, [comunidadId]);

  if (cargandoRol) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.header}>
          <Text style={s.headerTitle}>VeciApp</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>VeciApp</Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => router.push("/ajustes")} style={s.headerBtn}>
          <Ionicons name="settings-outline" size={22} color="white" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 14, paddingBottom: TAB_BAR_HEIGHT + 20 }}
      >
        {/* TABLON — no visible para TRABAJADOR */}
        {!esTrabajador && (
          <>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Tablon de anuncios</Text>
              <Pressable style={s.addBtn} onPress={() => router.push("/nuevo-anuncio")}>
                <Ionicons name="add" size={16} color="white" />
                <Text style={s.addBtnText}>Nuevo</Text>
              </Pressable>
            </View>

            <View style={s.card}>
              {anuncios.length === 0 ? (
                <View style={s.emptyBox}>
                  <Ionicons name="megaphone-outline" size={28} color="#D1D5DB" />
                  <Text style={s.emptyText}>No hay anuncios publicados</Text>
                </View>
              ) : (
                anuncios.map((a, i) => (
                  <View key={a.id} style={[s.anuncioRow, i < anuncios.length - 1 && s.anuncioDivider]}>
                    <View style={s.anuncioIcon}>
                      <Ionicons name="megaphone" size={16} color="#2F67E8" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.anuncioTitle}>{a.titulo}</Text>
                      {a.descripcion && <Text style={s.anuncioDesc}>{a.descripcion}</Text>}
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* CALENDARIO */}
        <Text style={[s.sectionTitle, { marginTop: 16 }]}>Calendario</Text>
        <View style={s.card}>
          <CalendarioComunidad />
        </View>

        {/* ACCESOS RAPIDOS */}
        <Text style={[s.sectionTitle, { marginTop: 16 }]}>Accesos rapidos</Text>

        <View style={s.quickGrid}>
          <Pressable style={s.quickCard} onPress={() => router.push("/(tabs)/incidencias")}>
            <View style={[s.quickIcon, { backgroundColor: "#FEE2E2" }]}>
              <Ionicons name="warning-outline" size={22} color="#DC2626" />
            </View>
            <Text style={s.quickLabel}>Incidencias</Text>
          </Pressable>

          {!esTrabajador && (
            <Pressable style={s.quickCard} onPress={() => router.push("/(tabs)/economia")}>
              <View style={[s.quickIcon, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="card-outline" size={22} color="#16A34A" />
              </View>
              <Text style={s.quickLabel}>Pagos</Text>
            </Pressable>
          )}

          {!esTrabajador && (
            <Pressable style={s.quickCard} onPress={() => router.push("/(tabs)/votaciones")}>
              <View style={[s.quickIcon, { backgroundColor: "#EEF2FF" }]}>
                <Ionicons name="checkmark-done-outline" size={22} color="#2F67E8" />
              </View>
              <Text style={s.quickLabel}>Votaciones</Text>
            </Pressable>
          )}

          <Pressable style={s.quickCard} onPress={() => router.push("/(tabs)/documentos")}>
            <View style={[s.quickIcon, { backgroundColor: "#F5F3FF" }]}>
              <Ionicons name="document-text-outline" size={22} color="#7C3AED" />
            </View>
            <Text style={s.quickLabel}>Documentos</Text>
          </Pressable>
        </View>
      </ScrollView>

      <BottomTabBar />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4FB" },
  header: {
    height: 64, backgroundColor: "#2F67E8",
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 8,
  },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "800" },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },

  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#2F67E8", paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20,
  },
  addBtnText: { color: "white", fontSize: 13, fontWeight: "700" },

  card: {
    backgroundColor: "white", borderRadius: 14, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },

  emptyBox: { alignItems: "center", paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 13, color: "#9CA3AF" },

  anuncioRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 10 },
  anuncioDivider: { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  anuncioIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", marginTop: 2,
  },
  anuncioTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  anuncioDesc: { fontSize: 13, color: "#6B7280", marginTop: 3, lineHeight: 18 },

  quickGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 10,
  },
  quickCard: {
    width: "48%", backgroundColor: "white", borderRadius: 14,
    padding: 18, alignItems: "center", gap: 10,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  quickIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  quickLabel: { fontSize: 13, fontWeight: "700", color: "#374151" },
});