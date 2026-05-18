import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View, ViewStyle } from "react-native";
import { colors, radius, spacing, fontSize } from "@/src/theme/colors";

type Props = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
};

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  style,
  testID,
}: Props) {
  const isDisabled = disabled || loading;
  const styleByVariant = {
    primary: { container: styles.primary, text: styles.primaryText },
    secondary: { container: styles.secondary, text: styles.secondaryText },
    ghost: { container: styles.ghost, text: styles.ghostText },
    danger: { container: styles.danger, text: styles.primaryText },
  }[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[styles.base, styleByVariant.container, isDisabled && styles.disabled, style]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" || variant === "danger" ? colors.white : colors.primary} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.baseText, styleByVariant.text]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  baseText: { fontSize: fontSize.bodyLarge, fontWeight: "700" },
  primary: { backgroundColor: colors.primary },
  primaryText: { color: colors.white },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryText: { color: colors.primary },
  ghost: { backgroundColor: "transparent" },
  ghostText: { color: colors.textSecondary, fontWeight: "600" },
  danger: { backgroundColor: colors.error },
  disabled: { opacity: 0.5 },
});
