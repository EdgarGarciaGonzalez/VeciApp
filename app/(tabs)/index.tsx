import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";

const TAB_BAR_HEIGHT = 72;

type Incidencia = {
  id: string;
  titulo: string;
  estado: string;
  prioridad: number;
  created_at: string;
};

export default function HomeScreen() {
  const router = useRouter();

  const actas = [
    "Acta Junta Ordinaria 15/03/2024",
    "Acta Junta Ordinaria 20/03/2023",
    "Acta Junta Ordinaria aprobación de cuentas 2022",
  ];

  const [ultimasIncidencias, setUltimasIncidencias] = useState<Incidencia[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const cargarUltimasIncidencias = async () => {
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("incidencia")
        .select("id,titulo,estado,prioridad,created_at")
        .order("created_at", { ascending: false })
        .limit(2);

      if (error) {
        setErrorMsg(error.message);
        setUltimasIncidencias([]);
        return;
      }

      setUltimasIncidencias(data ?? []);
    };

    cargarUltimasIncidencias();
  }, []);

  const irAIncidencias = () => router.push("/(tabs)/incidencias");
  const irAInicio = () => router.push("/(tabs)");

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
        >
          {/* ALERTAS */}
          <View style={styles.alertHeaderRow}>
            <Text style={styles.alertTitle}>Alertas importantes</Text>

            <Pressable onPress={irAIncidencias} style={styles.alertSeeAll}>
              <Text style={styles.alertSeeAllText}>Ver incidencias</Text>
              <Ionicons name="chevron-forward" size={16} color="#1E40AF" />
            </Pressable>
          </View>

          <View style={styles.alertBox}>
            {errorMsg ? (
              <Text style={{ color: "#991B1B" }}>Error: {errorMsg}</Text>
            ) : ultimasIncidencias.length === 0 ? (
              <Text style={styles.alertText}>No hay incidencias recientes.</Text>
            ) : (
              ultimasIncidencias.map((inc) => (
                <Pressable
                  key={inc.id}
                  style={styles.alertRow}
                  onPress={irAIncidencias}
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={20}
                    color="#1E3A8A"
                  />
                  <Text style={styles.alertText}>{inc.titulo}</Text>
                </Pressable>
              ))
            )}

            {/* Alerta fija (opcional) */}
            <Pressable style={styles.alertRow} onPress={() => {}}>
              <Ionicons name="cash-outline" size={20} color="#1E3A8A" />
              <Text style={styles.alertText}>Mensualidad pendiente</Text>
            </Pressable>
          </View>

          {/* ACTAS DIGITALES */}
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
            onPress={() => {}}
          >
            <Ionicons name="card-outline" size={20} color="#1E40AF" />
            <Text style={styles.quickText}>Pagos mensuales</Text>
          </Pressable>

          <Pressable
            style={[styles.quickCard, styles.quickLight]}
            onPress={() => {}}
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
            onPress={() => {}}
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

      {/* TAB BAR (visual) */}
      <View style={[styles.tabBar, { height: TAB_BAR_HEIGHT }]}>
        <Tab icon="home-outline" label="Inicio" onPress={irAInicio} />
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
}: {
  icon: any;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.tabItem} onPress={onPress}>
      <Ionicons name={icon} size={22} />
      <Text style={styles.tabLabel}>{label}</Text>
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

  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },

  // ALERTAS
  alertHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  alertSeeAll: { flexDirection: "row", alignItems: "center", gap: 4 },
  alertSeeAllText: { color: "#1E40AF", fontWeight: "700" },

  alertTitle: { fontSize: 18, fontWeight: "800" },
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
  alertText: { fontSize: 15, fontWeight: "500" },

  // ACTAS
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

  // ACCESOS RÁPIDOS
  quickCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  quickText: { fontSize: 15, fontWeight: "500" },

  quickPrimary: { backgroundColor: "#E0E7FF" },
  quickSecondary: { backgroundColor: "#DBEAFE" },
  quickLight: { backgroundColor: "#EFF6FF" },
  quickNeutral: { backgroundColor: "#F1F5F9" },

  // TAB BAR
  tabBar: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    backgroundColor: "white",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabLabel: { fontSize: 11 },
});