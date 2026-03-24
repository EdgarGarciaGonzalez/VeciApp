import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  icon: any;
  label: string;
  onPress: () => void;
  active?: boolean;
};

export default function TabButton({
  icon,
  label,
  onPress,
  active,
}: Props) {
  return (
    <Pressable style={styles.tabItem} onPress={onPress}>
      <Ionicons
        name={icon}
        size={22}
        color={active ? "#0B3CCF" : "#111827"}
      />
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
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
  },
});