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

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      const { data } = await supabase
        .from("usuario").select("comunidad_id")
        .eq("email", user.email).single();
      if (data?.comunidad_id) setComunidadId(data.comunidad_id);
    };
    cargar();
  }, []);

  useEffect(() => {
    if (!comunidadId) return;
    const cargarDatos = async () => {
      const { data: dataAnuncios } = await supabase
        .from("anuncio")
        .select("id,titulo,descripcion,created_at")
        .eq("comunidad_id", comunidadId)
        .order("created_at", { ascending: false })
        .limit(3);

      setAnuncios(dataAnuncios ?? []);
    };

    cargarDatos();
  }, [comunidadId]);

  const irAIncidencias = () => router.push("/(tabs)/incidencias");
  const irANuevoAnuncio = () => router.push("/nuevo-anuncio");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VeciApp</Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => router.push("/ajustes")} style={styles.headerSettingsBtn}>
          <Ionicons name="settings-outline" size={22} color="white" />
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: TAB_BAR_HEIGHT + 18 },
          ]}
        >
          {/* TABLÓN DE ANUNCIOS */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionBigTitle}>Tablón de anuncios</Text>

            <Pressable style={styles.addButton} onPress={irANuevoAnuncio}>
              <Ionicons name="add" size={18} color="white" />
              <Text style={styles.addButtonText}>Añadir</Text>
            </Pressable>
          </View>

          <View style={styles.noticeBox}>
            {anuncios.length === 0 ? (
              <Text style={styles.noticeText}>No hay anuncios publicados.</Text>
            ) : (
              anuncios.map((anuncio) => (
                <View key={anuncio.id} style={styles.noticeItem}>
                  <Text style={styles.noticeTitle}>{anuncio.titulo}</Text>
                  {!!anuncio.descripcion && (
                    <Text style={styles.noticeText}>{anuncio.descripcion}</Text>
                  )}
                </View>
              ))
            )}
          </View>

          {/* CALENDARIO COMUNIDAD */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionBigTitle}>Calendario</Text>
          </View>
          <View style={styles.calendarioBox}>
            <CalendarioComunidad />
          </View>

          {/* ACCESOS RÁPIDOS */}
          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
            Accesos rápidos
          </Text>

          <Pressable
            style={[styles.quickCard, styles.quickPrimary]}
            onPress={irAIncidencias}
          >
            <Ionicons name="build-outline" size={20} color="#1E3A8A" />
            <Text style={styles.quickText}>Crear incidencia</Text>
          </Pressable>

          <Pressable
            style={[styles.quickCard, styles.quickSecondary]}
            onPress={() => router.push("/(tabs)/economia")}
          >
            <Ionicons name="card-outline" size={20} color="#1E40AF" />
            <Text style={styles.quickText}>Pagos mensuales</Text>
          </Pressable>

          <Pressable
            style={[styles.quickCard, styles.quickLight]}
            onPress={() => router.push("/(tabs)/votaciones")}
          >
            <Ionicons
              name="checkmark-done-outline"
              size={20}
              color="#1E40AF"
            />
            <Text style={styles.quickText}>Votaciones</Text>
          </Pressable>

          <Pressable
            style={[styles.quickCard, styles.quickNeutral]}
            onPress={() => router.push("/(tabs)/documentos")}
          >
            <Ionicons
              name="document-text-outline"
              size={20}
              color="#1E40AF"
            />
            <Text style={styles.quickText}>Documentos</Text>
          </Pressable>
        </ScrollView>
      </View>

      <BottomTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "white" },

  header: {
    height: 64,
    backgroundColor: "#2F67E8",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "700" },
  headerSettingsBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },

  content: { padding: 18 },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionBigTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#111827",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  addButtonText: {
    color: "white",
    fontWeight: "700",
  },

  noticeBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  noticeItem: {
    marginBottom: 12,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 14,
    color: "#475569",
  },

  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },

  alertHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  alertSeeAll: { flexDirection: "row", alignItems: "center", gap: 4 },
  alertSeeAllText: { color: "#1E40AF", fontWeight: "700" },

  alertTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  alertBox: {
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#1E40AF",
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  alertText: {
    fontSize: 15,
    fontWeight: "500",
  },

  chipsWrap: { gap: 10 },
  chip: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  chipText: { fontSize: 13 },

  quickCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  quickText: { fontSize: 15, fontWeight: "500" },

  calendarioBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickPrimary: { backgroundColor: "#E0E7FF" },
  quickSecondary: { backgroundColor: "#DBEAFE" },
  quickLight: { backgroundColor: "#EFF6FF" },
  quickNeutral: { backgroundColor: "#F1F5F9" },

  tabBar: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    backgroundColor: "white",
  },
});