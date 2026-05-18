import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { orderStore } from "@/src/data/orderStore";
import { Order } from "@/src/data/mock";
import { money } from "@/src/components/FinancialBreakdown";
import { StatusPill } from "@/src/components/StatusPill";
import { authService, User } from "@/src/services/authService";
import { driverService, DRIVER_LEVELS, DriverLevel } from "@/src/services/driverService";

export default function Earnings() {
  const [me, setMe] = useState<User | null>(null);
  const [history, setHistory] = useState<Order[]>([]);

  useEffect(() => {
    const refresh = async () => {
      const u = await authService.getSession();
      setMe(u);
      if (u) setHistory(await orderStore.getDriverHistory(u.id));
    };
    refresh();
    return orderStore.subscribe(refresh);
  }, []);

  const total = history.reduce((acc, o) => acc + o.deliveryFee, 0);
  const operational = history.reduce((acc, o) => acc + (o.actualValue ?? o.estimatedValue), 0);
  const platform = history.reduce((acc, o) => acc + o.platformFee, 0);
  const sobraTotal = history.reduce(
    (acc, o) =>
      acc + (o.actualValue !== undefined ? Math.max(0, o.estimatedValue + o.safetyMargin - o.actualValue) : 0),
    0
  );
  const level = (me?.driverLevel ?? 1) as DriverLevel;
  const levelInfo = DRIVER_LEVELS[level];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header title="Saldo e Histórico" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo disponível</Text>
          <Text style={styles.balanceValue}>{money(total)}</Text>
          <Text style={styles.balanceHint}>Liberado após confirmação por código</Text>
          <View style={styles.levelBadge}>
            <Ionicons name="medal" size={14} color={colors.white} />
            <Text style={styles.levelBadgeText}>Nível {level} • {levelInfo.name}</Text>
          </View>
        </View>

        <Text style={styles.section}>Resumo financeiro</Text>
        <View style={styles.statsRow}>
          <Stat icon="cash" label="Valor de compras" value={money(operational)} sub="Saldo operacional — não sacável" />
          <Stat icon="business" label="Taxa plataforma" value={money(platform)} sub="Já descontada" />
        </View>
        <View style={styles.statsRow}>
          <Stat icon="bicycle" label="Taxa de entrega" value={money(total)} sub="Sua receita" highlight />
          <Stat icon="refresh" label="Sobra devolvida" value={money(sobraTotal)} sub="Voltou ao cliente" />
        </View>

        <Text style={styles.section}>Entregas concluídas</Text>
        {history.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={36} color={colors.textTertiary} />
            <Text style={styles.emptyText}>Nenhuma entrega concluída ainda.</Text>
          </View>
        ) : (
          history.map((o) => (
            <View key={o.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.store}>{o.storeName}</Text>
                <Text style={styles.date}>{new Date(o.createdAt).toLocaleString("pt-BR")}</Text>
                <View style={{ marginTop: 4 }}><StatusPill status={o.status} /></View>
              </View>
              <Text style={styles.feeText}>+{money(o.deliveryFee)}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({
  icon, label, value, sub, highlight,
}: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <View style={[styles.stat, highlight && styles.statHighlight]}>
      <Ionicons name={icon} size={20} color={highlight ? colors.white : colors.primary} />
      <Text style={[styles.statLabel, highlight && { color: "rgba(255,255,255,0.85)" }]}>{label}</Text>
      <Text style={[styles.statValue, highlight && { color: colors.white }]}>{value}</Text>
      <Text style={[styles.statSub, highlight && { color: "rgba(255,255,255,0.85)" }]}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  balanceCard: { backgroundColor: colors.primary, padding: spacing.lg, borderRadius: radius.xl, alignItems: "center", gap: 4 },
  balanceLabel: { color: "rgba(255,255,255,0.85)" },
  balanceValue: { color: colors.white, fontSize: 38, fontWeight: "800" },
  balanceHint: { color: "rgba(255,255,255,0.9)", fontSize: fontSize.small },

  section: { fontSize: fontSize.h4, fontWeight: "700", color: colors.textPrimary, marginTop: spacing.sm },
  statsRow: { flexDirection: "row", gap: spacing.sm },
  stat: {
    flex: 1, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg,
    gap: 4, borderWidth: 1, borderColor: colors.borderLight,
  },
  statHighlight: { backgroundColor: colors.primary, borderColor: colors.primary },
  statLabel: { color: colors.textSecondary, fontSize: fontSize.small, fontWeight: "600" },
  statValue: { color: colors.textPrimary, fontSize: fontSize.h4, fontWeight: "800" },
  statSub: { color: colors.textTertiary, fontSize: fontSize.caption + 1 },

  row: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.borderLight,
  },
  store: { fontWeight: "700", color: colors.textPrimary, fontSize: fontSize.bodyLarge },
  date: { color: colors.textSecondary, fontSize: fontSize.small, marginTop: 2 },
  feeText: { color: colors.primary, fontSize: fontSize.bodyLarge, fontWeight: "800" },

  empty: { alignItems: "center", gap: 8, padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.lg },
  emptyText: { color: colors.textSecondary },
  levelBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    marginTop: spacing.sm, alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill,
  },
  levelBadgeText: { color: colors.white, fontWeight: "700", fontSize: fontSize.small },
});
