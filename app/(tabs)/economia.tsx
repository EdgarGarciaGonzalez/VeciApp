// app/(tabs)/economia.tsx
import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import TabButton from "../../src/components/TabButton";

const TAB_BAR_HEIGHT = 72;

export default function EconomiaScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>Economia</Text>
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
          <Text style={styles.sectionTitle}>Estado de cuotas</Text>

          <Pressable style={styles.card} onPress={() => {}}>
            <Ionicons name="cash-outline" size={18} color="#2E7D32" />
            <Text style={styles.cardText}>Mensualidad</Text>
          </Pressable>

          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
            Presupuestos
          </Text>

          <Pressable style={styles.card} onPress={() => {}}>
            <Ionicons name="cash-outline" size={18} color="#2E7D32" />
            <Text style={styles.cardText}>Ascensor nuevo</Text>
          </Pressable>

          <Pressable style={styles.card} onPress={() => {}}>
            <Ionicons name="cash-outline" size={18} color="#2E7D32" />
            <Text style={styles.cardText}>Cambio de luces</Text>
          </Pressable>

          <Pressable style={styles.card} onPress={() => {}}>
            <Ionicons name="cash-outline" size={18} color="#2E7D32" />
            <Text style={styles.cardText}>Puerta de Portal</Text>
          </Pressable>

          <Pressable style={styles.card} onPress={() => {}}>
            <Ionicons name="cash-outline" size={18} color="#2E7D32" />
            <Text style={styles.cardText}>Telefonillo electrico</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* TAB BAR */}
      <View style={[styles.tabBar, { height: TAB_BAR_HEIGHT }]}>
        <TabButton
          icon="home-outline"
          label="Inicio"
          onPress={() => router.push("/(tabs)")}
        />
        <TabButton
          icon="chatbubble-ellipses-outline"
          label="Chats"
          onPress={() => {}}
        />
        <TabButton
          icon="bar-chart-outline"
          label="Economía"
          onPress={() => router.push("/(tabs)/economia")}
          active
        />
        <TabButton
          icon="call-outline"
          label="Contactos"
          onPress={() => {}}
        />
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
      <Text
        style={[
          styles.tabLabel,
          active && { color: "#0B3CCF", fontWeight: "700" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#D8DEE8",
  },

  header: {
    height: 64,
    backgroundColor: "#2F67E8",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  backButton: {
    width: 32,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  headerTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "500",
  },

  content: {
    padding: 14,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "400",
    color: "#1F2937",
    marginBottom: 8,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  cardText: {
    fontSize: 14,
    color: "#111827",
  },

  tabBar: {
    borderTopWidth: 1,
    borderTopColor: "#D1D5DB",
    flexDirection: "row",
    backgroundColor: "white",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
  },
});