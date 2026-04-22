// app/(tabs)/chats.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import TabButton from "../../src/components/TabButton";

const TAB_BAR_HEIGHT = 72;

type Chat = {
  id: string;
  nombre: string;
  icon: any;
  iconColor: string;
  ultimoMensaje?: string;
  hora?: string;
  noLeidos?: number;
  tipo: "personal" | "grupo" | "edificio" | "servicio" | "urgente";
};

const CHATS: Chat[] = [
  {
    id: "vecino_901",
    nombre: "Vecino 9º1",
    icon: "people",
    iconColor: "#2F67E8",
    ultimoMensaje: "Hola, ¿puedes bajar la música?",
    hora: "10:32",
    noLeidos: 2,
    tipo: "personal",
  },
  {
    id: "2",
    nombre: "Comunidad",
    icon: "people",
    iconColor: "#2F67E8",
    ultimoMensaje: "Reunión el próximo martes a las 19h",
    hora: "09:15",
    noLeidos: 5,
    tipo: "grupo",
  },
  {
    id: "escalera_1",
    nombre: "Escalera 1",
    icon: "business",
    iconColor: "#2F67E8",
    ultimoMensaje: "La luz del rellano está arreglada",
    hora: "Ayer",
    tipo: "edificio",
  },
  {
    id: "escalera_2",
    nombre: "Escalera 2",
    icon: "business",
    iconColor: "#2F67E8",
    ultimoMensaje: "¿Alguien ha visto las llaves del trastero?",
    hora: "Ayer",
    noLeidos: 1,
    tipo: "edificio",
  },
  {
    id: "mantenimiento",
    nombre: "Mantenimiento",
    icon: "construct",
    iconColor: "#2F67E8",
    ultimoMensaje: "Revisión del ascensor el viernes",
    hora: "Lun",
    tipo: "servicio",
  },
  {
    id: "administrador",
    nombre: "Administrador",
    icon: "person",
    iconColor: "#2F67E8",
    ultimoMensaje: "Las cuentas del trimestre están listas",
    hora: "Lun",
    tipo: "personal",
  },
  {
    id: "zonas_comunes",
    nombre: "Zonas comunes",
    icon: "business-outline",
    iconColor: "#2F67E8",
    ultimoMensaje: "La piscina abre el 1 de junio",
    hora: "Dom",
    tipo: "grupo",
  },
  {
    id: "avisos_urgentes",
    nombre: "Avisos urgentes",
    icon: "alert-circle",
    iconColor: "#DC2626",
    ultimoMensaje: "Corte de agua mañana de 9h a 13h",
    hora: "Dom",
    noLeidos: 3,
    tipo: "urgente",
  },
];

export default function ChatsScreen() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");

  const chatsFiltrados = CHATS.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={{ flex: 1 }} />
        <Pressable style={styles.headerAction}>
          <Ionicons name="create-outline" size={22} color="white" />
        </Pressable>
      </View>

      {/* BUSCADOR */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={16} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar chats..."
          placeholderTextColor="#9CA3AF"
          value={busqueda}
          onChangeText={setBusqueda}
        />
        {busqueda.length > 0 && (
          <Pressable onPress={() => setBusqueda("")}>
            <Ionicons name="close-circle" size={16} color="#9CA3AF" />
          </Pressable>
        )}
      </View>

      {/* LISTA DE CHATS */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 18 }}
      >
        {chatsFiltrados.map((chat) => (
          <Pressable key={chat.id} style={styles.chatRow} onPress={() => router.push({ pathname: "/chat/id", params: { id: chat.id, nombre: chat.nombre } })}>
            {/* Avatar / Icono */}
            <View
              style={[
                styles.avatar,
                chat.tipo === "urgente"
                  ? styles.avatarUrgente
                  : styles.avatarNormal,
              ]}
            >
              <Ionicons name={chat.icon} size={22} color={chat.iconColor} />
            </View>

            {/* Info */}
            <View style={styles.chatInfo}>
              <Text style={styles.chatNombre}>{chat.nombre}</Text>
              {chat.ultimoMensaje && (
                <Text style={styles.chatUltimo} numberOfLines={1}>
                  {chat.ultimoMensaje}
                </Text>
              )}
            </View>

            {/* Derecha */}
            <View style={styles.chatRight}>
              {chat.hora && (
                <Text style={styles.chatHora}>{chat.hora}</Text>
              )}
              <View style={styles.chatRightBottom}>
                {chat.noLeidos ? (
                  <View style={[
                    styles.badge,
                    chat.tipo === "urgente" && styles.badgeUrgente,
                  ]}>
                    <Text style={styles.badgeText}>{chat.noLeidos}</Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </View>
            </View>
          </Pressable>
        ))}

        {chatsFiltrados.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="chatbubble-ellipses-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>No se encontraron chats</Text>
          </View>
        )}
      </ScrollView>

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
          onPress={() => router.push("/(tabs)/chats")}
          active
        />
        <TabButton
          icon="bar-chart-outline"
          label="Economía"
          onPress={() => router.push("/(tabs)/economia")}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4FB" },

  // Header
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
  headerTitle: { color: "white", fontSize: 20, fontWeight: "700" },
  headerAction: { width: 36, alignItems: "center" },

  // Buscador
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8ECF4",
    marginHorizontal: 14,
    marginVertical: 12,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  searchIcon: { marginRight: 2 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
  },

  // Chat rows
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarNormal: { backgroundColor: "#EEF2FF" },
  avatarUrgente: { backgroundColor: "#FEE2E2" },

  chatInfo: { flex: 1 },
  chatNombre: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 2 },
  chatUltimo: { fontSize: 12, color: "#6B7280" },

  chatRight: { alignItems: "flex-end", gap: 4 },
  chatHora: { fontSize: 11, color: "#9CA3AF" },
  chatRightBottom: { flexDirection: "row", alignItems: "center", gap: 4 },

  badge: {
    backgroundColor: "#2F67E8",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeUrgente: { backgroundColor: "#DC2626" },
  badgeText: { color: "white", fontSize: 10, fontWeight: "700" },

  // Empty state
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: "#9CA3AF" },

  // Tab bar
  tabBar: {
    borderTopWidth: 1,
    borderTopColor: "#D1D5DB",
    flexDirection: "row",
    backgroundColor: "white",
  },
});