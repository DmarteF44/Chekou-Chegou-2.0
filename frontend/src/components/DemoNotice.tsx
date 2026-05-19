import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontSize, radius, spacing } from "@/src/theme/colors";

export function DemoNotice({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.wrap, compact && styles.compact]} testID="demo-local-notice">
      <Ionicons name="phone-portrait-outline" size={14} color={colors.primaryDark} />
      <Text style={styles.text}>Versão demonstrativa local</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  compact: {
    alignSelf: "center",
  },
  text: {
    color: colors.primaryDark,
    fontSize: fontSize.small,
    fontWeight: "800",
  },
});
