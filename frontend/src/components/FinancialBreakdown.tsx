import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing, fontSize } from "@/src/theme/colors";

export function money(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

type Row = { label: string; value: number; hint?: string };

export function FinancialBreakdown({
  rows,
  total,
  totalLabel = "Total a pagar",
  testID,
}: {
  rows: Row[];
  total: number;
  totalLabel?: string;
  testID?: string;
}) {
  return (
    <View style={styles.container} testID={testID}>
      {rows.map((r) => (
        <View key={r.label} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{r.label}</Text>
            {r.hint ? <Text style={styles.hint}>{r.hint}</Text> : null}
          </View>
          <Text style={styles.value}>{money(r.value)}</Text>
        </View>
      ))}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>{totalLabel}</Text>
        <Text style={styles.totalValue}>{money(total)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
  },
  hint: {
    color: colors.textTertiary,
    fontSize: fontSize.small,
    marginTop: 2,
  },
  value: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    fontWeight: "600",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.bodyLarge,
    fontWeight: "700",
  },
  totalValue: {
    color: colors.primary,
    fontSize: fontSize.h4,
    fontWeight: "800",
  },
});
