import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {
  const actas = [
    "Acta Junta Ordinaria 15/03/2024",
    "Acta Junta Ordinaria 20/03/2023",
    "Acta Junta Ordinaria aprobación de cuentas 2022",
  ];

  const tabs = [
    { key: "inicio", label: "Inicio", icon: "home-outline", active: true },
    { key: "chats", label: "Chats", icon: "chatbubble-ellipses-outline" },
    { key: "economia", label: "Economía", icon: "bar-chart-outline" },
    { key: "contactos", label: "Contactos", icon: "people-outline" },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VeciApp</Text>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Alertas */}
        <Text style={styles.sectionTitle}>Alertas</Text>

        <View style={styles.rowItem}>
          <Ionicons name="alert-circle-outline" size={18} />
          <Text style={styles.rowText}>Fuga de agua</Text>
        </View>

        <View style={styles.rowItem}>
          <Ionicons name="cash-outline" size={18} />
          <Text style={styles.rowText}>Mensualidad</Text>
        </View>

        {/* Actas digitales */}
        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
          Actas digitales
        </Text>

        <View style={styles.chipsWrap}>
          {actas.map((t) => (
            <Pressable key={t} style={styles.chip} onPress={() => {}}>
              <Text style={styles.chipText}>{t}</Text>
            </Pressable>
          ))}
        </View>

        {/* Accesos rápidos */}
        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
          Accesos rápidos
        </Text>

        <View style={styles.quickRow}>
          <Pressable style={styles.quickItem} onPress={() => {}}>
            <Ionicons name="document-text-outline" size={18} />
            <Text style={styles.quickText}>Docs</Text>
          </Pressable>

          <Pressable style={styles.quickItem} onPress={() => {}}>
            <Ionicons name="build-outline" size={18} />
            <Text style={styles.quickText}>Incidencias</Text>
          </Pressable>

          <Pressable style={styles.quickItem} onPress={() => {}}>
            <Ionicons name="people-outline" size={18} />
            <Text style={styles.quickText}>Juntas</Text>
          </Pressable>
        </View>

        {/* espacio para que no tape el tab bar */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {tabs.map((t) => (
          <Pressable key={t.key} style={styles.tabItem} onPress={() => {}}>
            <Ionicons name={t.icon} size={22} />
            <Text style={styles.tabLabel}>{t.label}</Text>
          </Pressable>
        ))}
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

  scroll: { flex: 1 },
  content: { padding: 18 },

  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },

  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  rowText: { fontSize: 15 },

  chipsWrap: { gap: 10 },
  chip: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#C9CED6",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "white",
  },
  chipText: { fontSize: 13 },

  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  quickItem: {
    width: "32%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    gap: 6,
  },
  quickText: { fontSize: 12 },

  tabBar: {
    height: 68,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    backgroundColor: "white",
    paddingBottom: 8,
    paddingTop: 8,
    paddingHorizontal: 10,
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  tabLabel: { fontSize: 11, color: "#111827" },
});
