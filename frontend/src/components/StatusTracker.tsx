import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { ORDER_STATUSES, OrderStatus } from "@/src/data/mock";

export function StatusTracker({ current }: { current: OrderStatus }) {
  const currentIdx = ORDER_STATUSES.indexOf(current);

  return (
    <View style={styles.container}>
      {ORDER_STATUSES.map((s, i) => {
        const done = i <= currentIdx;
        const active = i === currentIdx;
        const isLast = i === ORDER_STATUSES.length - 1;
        return (
          <View key={s} style={styles.row}>
            <View style={styles.iconCol}>
              <View
                style={[
                  styles.dot,
                  done && styles.dotDone,
                  active && styles.dotActive,
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                ) : (
                  <View style={styles.innerDot} />
                )}
              </View>
              {!isLast && (
                <View style={[styles.line, done && i < currentIdx && styles.lineDone]} />
              )}
            </View>
            <View style={styles.textCol}>
              <Text
                style={[
                  styles.label,
                  done && styles.labelDone,
                  active && styles.labelActive,
                ]}
              >
                {s}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconCol: {
    alignItems: "center",
    width: 28,
  },
  textCol: {
    flex: 1,
    paddingLeft: spacing.md,
    paddingBottom: spacing.lg,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textTertiary,
  },
  dotDone: { backgroundColor: colors.primary },
  dotActive: { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 8 },
  line: {
    flex: 1,
    width: 2,
    minHeight: 28,
    backgroundColor: colors.borderLight,
    marginTop: 2,
  },
  lineDone: { backgroundColor: colors.primary },
  label: {
    fontSize: fontSize.body,
    color: colors.textTertiary,
    fontWeight: "500",
  },
  labelDone: { color: colors.textSecondary },
  labelActive: { color: colors.primary, fontWeight: "700" },
});
