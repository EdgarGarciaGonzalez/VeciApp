import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CalendarioComunidad from "../../components/CalendarioComunidad";
import TabButton from "../../src/components/TabButton";
import { supabase } from "../../src/lib/supabase";

const TAB_BAR_HEIGHT = 72;

type Anuncio = {
  id: string;
  titulo: string;
  descripcion: string | null;
  created_at: string;
};

export default function HomeScreen() {
  const router = useRouter();

  const actas = [
    "Acta Junta Ordinaria 15/03/2024",
    "Acta Junta Ordinaria 20/03/2023",
    "Acta Junta Ordinaria aprobación de cuentas 2022",
  ];

  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);

  useEffect(() => {
    const cargarDatos = async () => {
      const { data: dataAnuncios, error: errorAnuncios } = await supabase
        .from("anuncio")
        .select("id,titulo,descripcion,created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      if (errorAnuncios) {
        setAnuncios([]);
        return;
      }

      setAnuncios(dataAnuncios ?? []);
    };

    cargarDatos();
  }, []);

  const irAIncidencias = () => router.push("/(tabs)/incidencias");
  const irANuevoAnuncio = () => router.push("/nuevo-anuncio");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VeciApp</Text>
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

          {/* ACTAS */}
          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>
            Actas digitales
          </Text>

          <View style={styles.chipsWrap}>
            {actas.map((t) => (
              <Pressable key={t} style={styles.chip} onPress={() => {}}>
                <Text style={styles.chipText}>{t}</Text>
              </Pressable>
            ))}
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

      <View style={[styles.tabBar, { height: TAB_BAR_HEIGHT }]}>
        <TabButton
          icon="home-outline"
          label="Inicio"
          onPress={() => router.push("/(tabs)")}
          active
        />
        <TabButton
          icon="chatbubble-ellipses-outline"
          label="Chats"
onPress={() => router.push("/(tabs)/chat")}
          active        />
        <TabButton
          icon="bar-chart-outline"
          label="Economía"
          onPress={() => router.push("/(tabs)/economia")}
        />
        <TabButton
          icon="people-outline"
          label="Contactos"
          onPress={() => {}}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "white" },

  header: {
    height: 64,
    backgroundColor: "#0B3CCF",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "700" },

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