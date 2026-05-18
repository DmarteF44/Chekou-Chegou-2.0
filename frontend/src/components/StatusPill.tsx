import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing, fontSize } from "@/src/theme/colors";
import { OrderStatus } from "@/src/data/mock";

const COLOR_MAP: Record<OrderStatus, { bg: string; fg: string }> = {
  "Aguardando entregador": { bg: colors.warningSoft, fg: colors.warning },
  "Entregador aceitou": { bg: colors.infoSoft, fg: colors.info },
  "Indo ao estabelecimento": { bg: colors.infoSoft, fg: colors.info },
  "Comprando produtos": { bg: colors.primarySoft, fg: colors.primaryDark },
  "A caminho do cliente": { bg: colors.primarySoft, fg: colors.primaryDark },
  Entregue: { bg: colors.primarySoft, fg: colors.success },
};

export function StatusPill({ status, testID }: { status: OrderStatus; testID?: string }) {
  const c = COLOR_MAP[status];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]} testID={testID}>
      <Text style={[styles.text, { color: c.fg }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: fontSize.small,
    fontWeight: "600",
  },
});
