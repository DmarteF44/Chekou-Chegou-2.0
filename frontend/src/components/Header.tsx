import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, spacing, fontSize } from "@/src/theme/colors";

export function Header({
  title,
  subtitle,
  back = true,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      {back ? (
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="header-back-button"
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.backBtn} />
      )}
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View style={styles.right}>{right ?? <View style={{ width: 26 }} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: { width: 36, height: 36, alignItems: "flex-start", justifyContent: "center" },
  titleWrap: { flex: 1, alignItems: "center" },
  title: {
    fontSize: fontSize.h4,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.small,
    color: colors.textTertiary,
    marginTop: 2,
  },
  right: { width: 36, alignItems: "flex-end" },
});
