import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";

const TAB_BAR_HEIGHT = 72;

type Incidencia = {
  id: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  prioridad: number;
  created_at: string;
};

export default function IncidenciasScreen() {
  const router = useRouter();
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cargarIncidencias = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("incidencia")
      .select("id,titulo,descripcion,estado,prioridad,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    setIncidencias(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargarIncidencias();
  }, [cargarIncidencias]);

  const irAInicio = () => router.push("/(tabs)");
  const irAIncidencias = () => router.push("/(tabs)/incidencias");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VeciApp</Text>
      </View>

      {/* CONTENIDO */}
      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: TAB_BAR_HEIGHT + 18 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={cargarIncidencias}
              tintColor="#1E40AF"
            />
          }
        >
          {/* TÍTULO + BOTÓN */}
          <View style={styles.topRow}>
            <Text style={styles.screenTitle}>Incidencias</Text>

            <Pressable
              onPress={() => router.push("/nueva-incidencia")}
              style={styles.newBtn}
            >
              <Text style={styles.newBtnText}>+ Nueva</Text>
            </Pressable>
          </View>

          {/* ERRORES */}
          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={{ fontWeight: "700" }}>Error:</Text>
              <Text>{errorMsg}</Text>
            </View>
          )}

          {/* LISTADO */}
          {incidencias.length === 0 ? (
            <Text>No hay incidencias todavía.</Text>
          ) : (
            incidencias.map((i) => (
              <View key={i.id} style={styles.card}>
                <Text style={styles.cardTitle}>{i.titulo}</Text>
                {!!i.descripcion && (
                  <Text style={{ marginTop: 6 }}>{i.descripcion}</Text>
                )}
                <Text style={styles.cardMeta}>
                  Estado: {i.estado} · Prioridad: {i.prioridad}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* TAB BAR (igual que Home) */}
      <View style={[styles.tabBar, { height: TAB_BAR_HEIGHT }]}>
        <Tab
          icon="home-outline"
          label="Inicio"
          onPress={irAInicio}
          active
        />
        <Tab icon="chatbubble-ellipses-outline" label="Chats" onPress={() => {}} />
        <Tab icon="bar-chart-outline" label="Economía" onPress={() => {}} />
        <Tab icon="people-outline" label="Contactos" onPress={() => {}} />
      </View>
    </SafeAreaView>
  );
}

function Tab({
  icon,
  label,
  onPress,
  active,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable style={styles.tabItem} onPress={onPress}>
      <Ionicons name={icon} size={22} color={active ? "#0B3CCF" : "#111827"} />
      <Text style={[styles.tabLabel, active && { color: "#0B3CCF", fontWeight: "700" }]}>
        {label}
      </Text>
    </Pressable>
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

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  screenTitle: { fontSize: 24, fontWeight: "800" },

  newBtn: {
    backgroundColor: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  newBtnText: { color: "white", fontWeight: "700" },

  // Caja estilo "Alertas" (misma estética que Home)
  alertBox: {
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#1E40AF",
  },
  alertRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  alertText: { fontSize: 15, fontWeight: "500" },

  errorBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fee2e2",
    marginBottom: 16,
  },

  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "white",
  },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  cardMeta: { marginTop: 8, color: "#555" },

  tabBar: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    backgroundColor: "white",
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  tabLabel: { fontSize: 11 },
});