// src/components/BottomTabBar.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";

const TABS = [
  { key: "/(tabs)",            icon: "home-outline",                label: "Inicio" },
  { key: "/(tabs)/chat",       icon: "chatbubble-ellipses-outline", label: "Chats" },
  { key: "/(tabs)/economia",   icon: "bar-chart-outline",           label: "Economia" },
  { key: "/(tabs)/contactos",  icon: "people-outline",              label: "Contactos" },
] as const;

const TAB_BAR_HEIGHT = 72;

export default function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  const esActivo = (key: string) => {
    if (key === "/(tabs)") return pathname === "/" || pathname === "/(tabs)" || pathname === "/index";
    return pathname.startsWith(key.replace("/(tabs)", ""));
  };

  return (
    <View style={styles.bar}>
      {TABS.map((t) => {
        const activo = esActivo(t.key);
        return (
          <Pressable
            key={t.key}
            style={styles.tab}
            onPress={() => router.push(t.key as any)}
          >
            <Ionicons
              name={t.icon as any}
              size={22}
              color={activo ? "#2F67E8" : "#9CA3AF"}
            />
            <Text style={[styles.label, activo && styles.labelActivo]}>
              {t.label}
            </Text>
            {activo && <View style={styles.indicator} />}
          </Pressable>
        );
      })}
    </View>
  );
}

export { TAB_BAR_HEIGHT };

const styles = StyleSheet.create({
  bar: {
    height: TAB_BAR_HEIGHT,
    flexDirection: "row",
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    position: "relative",
  },
  label: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  labelActivo: {
    color: "#2F67E8",
    fontWeight: "700",
  },
  indicator: {
    position: "absolute",
    top: 0,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#2F67E8",
  },
});