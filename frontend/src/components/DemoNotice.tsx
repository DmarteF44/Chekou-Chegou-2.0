import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontSize, radius, spacing } from "@/src/theme/colors";
import { runtime } from "@/src/config/runtime";
import { SUPABASE_AVAILABLE } from "@/src/lib/supabase";

export function DemoNotice({ compact = false }: { compact?: boolean }) {
  const text = SUPABASE_AVAILABLE
    ? "Dados conectados - pagamento simulado"
    : runtime.supabaseConfigError ?? "Versão demonstrativa local";
  return (
    <View style={[styles.wrap, compact && styles.compact]} testID="demo-local-notice">
      <Ionicons name={SUPABASE_AVAILABLE ? "cloud-done-outline" : "phone-portrait-outline"} size={14} color={colors.primaryDark} />
      <Text style={styles.text}>{text}</Text>
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
