import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import TabButton from "../../src/components/TabButton";

const TAB_BAR_HEIGHT = 76;

export default function VotacionesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>Juntas y votaciones</Text>
      </View>

      {/* CONTENIDO */}
      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: TAB_BAR_HEIGHT + 22 },
          ]}
        >
          {/* CONVOCATORIAS */}
          <Text style={styles.sectionTitle}>Convocatorias</Text>

          <Pressable style={styles.chip} onPress={() => {}}>
            <Text style={styles.chipText}>20 de diciembre de 2025</Text>
          </Pressable>

          <Pressable style={styles.chip} onPress={() => {}}>
            <Text style={styles.chipText}>25 de marzo de 2026</Text>
          </Pressable>

          {/* VOTACIÓN ACTIVA */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            Votacion activa
          </Text>

          <Text style={styles.questionText}>Cambiar puerta del portal?</Text>

          <Pressable style={styles.voteCard} onPress={() => {}}>
            <View style={styles.voteLeft}>
              <View style={styles.voteNumberCircle}>
                <Text style={styles.voteNumber}>1</Text>
              </View>
              <Text style={styles.voteOption}>Si</Text>
            </View>
            <Text style={styles.voteCount}>Votos: 14</Text>
          </Pressable>

          <Pressable style={styles.voteCard} onPress={() => {}}>
            <View style={styles.voteLeft}>
              <View style={styles.voteNumberCircle}>
                <Text style={styles.voteNumber}>2</Text>
              </View>
              <Text style={styles.voteOption}>No</Text>
            </View>
            <Text style={styles.voteCount}>Votos: 6</Text>
          </Pressable>

          {/* VOTACIONES ANTERIORES */}
          <Text style={[styles.sectionTitle, { marginTop: 30 }]}>
            Votaciones anteriores
          </Text>

          <View style={styles.previousBox}>
            <Text style={styles.previousTitle}>Cambio compañia luz</Text>
            <Text style={styles.previousResult}>Resolucion: Si</Text>
          </View>
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
  safe: {
    flex: 1,
    backgroundColor: "#D9E0EA",
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
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  headerTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "500",
  },

  content: {
    padding: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#111827",
    marginBottom: 12,
  },

  chip: {
    alignSelf: "flex-start",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  chipText: {
    fontSize: 16,
    color: "#222",
  },

  questionText: {
    fontSize: 15,
    color: "#111827",
    marginBottom: 14,
  },

  voteCard: {
    borderWidth: 1,
    borderColor: "#4B5563",
    borderRadius: 14,
    backgroundColor: "#F8F8F8",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  voteLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  voteNumberCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#18213B",
    alignItems: "center",
    justifyContent: "center",
  },
  voteNumber: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },

  voteOption: {
    fontSize: 17,
    color: "#111827",
  },

  voteCount: {
    fontSize: 12,
    color: "#444",
  },

  previousBox: {
    marginTop: 8,
  },
  previousTitle: {
    fontSize: 16,
    color: "#111827",
    marginBottom: 2,
  },
  previousResult: {
    fontSize: 16,
    color: "#111827",
  },

  tabBar: {
    borderTopWidth: 1,
    borderTopColor: "#9CA3AF",
    flexDirection: "row",
    backgroundColor: "white",
    paddingBottom: 6,
  },
});