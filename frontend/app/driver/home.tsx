import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { orderStore } from "@/src/data/orderStore";
import { Order, DEFAULT_DRIVER_NAME } from "@/src/data/mock";
import { money } from "@/src/components/FinancialBreakdown";
import { StatusPill } from "@/src/components/StatusPill";
import { authService, User } from "@/src/services/authService";
import { driverService, DRIVER_LEVELS, DriverLevel } from "@/src/services/driverService";

export default function DriverHome() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [available, setAvailable] = useState<Order[]>([]);
  const [active, setActive] = useState<Order[]>([]);
  const [completed, setCompleted] = useState<Order[]>([]);

  useEffect(() => {
    const refresh = async () => {
      const u = await authService.getSession();
      if (!u || u.role !== "driver") { router.replace("/"); return; }
      if (u.driverStatus === "blocked") { router.replace("/driver/blocked"); return; }
      if (u.driverStatus !== "approved") { router.replace("/driver/pending"); return; }
      setMe(u);
      setAvailable(await orderStore.getAvailable());
      setActive(await orderStore.getDriverActive(u.id));
      setCompleted(await orderStore.getDriverHistory(u.id));
    };
    refresh();
    const a = orderStore.subscribe(refresh);
    const b = authService.subscribe(refresh);
    return () => { a(); b(); };
  }, [router]);

  async function logout() {
    await authService.logout();
    router.replace("/auth/login");
  }

  if (!me) return null;
  const level = (me.driverLevel ?? 1) as DriverLevel;
  const levelInfo = DRIVER_LEVELS[level];

  const todayEarnings = completed
    .filter((o) => new Date(o.createdAt).toDateString() === new Date().toDateString())
    .reduce((acc, o) => acc + o.deliveryFee, 0);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {/* Top */}
        <View style={styles.topBar}>
          <View style={styles.avatar}>
            <Ionicons name="bicycle" size={22} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.greet}>Olá, {me.name.split(" ")[0]}</Text>
            <Text style={styles.subtitle}>Área do Motorista Parceiro</Text>
          </View>
          <TouchableOpacity
            onPress={logout}
            style={styles.profileBtn}
            testID="driver-logout"
          >
            <Ionicons name="log-out-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Level strip */}
        <View style={[styles.levelStrip, { borderColor: levelInfo.color }]}>
          <Ionicons name="medal" size={20} color={levelInfo.color} />
          <View style={{ flex: 1 }}>
            <Text style={styles.levelTitle} testID="driver-level-name">Nível {level} • {levelInfo.name}</Text>
            <Text style={styles.levelHint} testID="driver-level-limit">Limite operacional: até R$ {levelInfo.limit}</Text>
          </View>
        </View>

        {/* Earnings */}
        <View style={styles.earningCard}>
          <Text style={styles.earningLabel}>Saldo do dia</Text>
          <Text style={styles.earningValue} testID="driver-today-earnings">{money(todayEarnings)}</Text>
          <View style={styles.earningRow}>
            <View style={styles.miniStat}>
              <Text style={styles.miniValue}>{completed.length}</Text>
              <Text style={styles.miniLabel}>Entregues</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={styles.miniValue}>{active.length}</Text>
              <Text style={styles.miniLabel}>Ativos</Text>
            </View>
            <TouchableOpacity
              style={styles.miniStat}
              onPress={() => router.push("/driver/earnings")}
              testID="driver-earnings-button"
            >
              <Ionicons name="wallet" size={18} color={colors.white} />
              <Text style={styles.miniLabel}>Saldo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active */}
        {active.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Em andamento</Text>
            <View style={styles.sectionWrap}>
              {active.map((o) => (
                <TouchableOpacity
                  key={o.id}
                  style={styles.orderCard}
                  onPress={() => router.push(`/driver/order/${o.id}`)}
                  testID={`driver-active-${o.id}`}
                >
                  <Ionicons name="cube" size={22} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderStore}>{o.storeName}</Text>
                    <View style={{ marginTop: 4 }}><StatusPill status={o.status} /></View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Available */}
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Pedidos disponíveis</Text>
          <Text style={styles.count}>{available.length}</Text>
        </View>
        <View style={styles.sectionWrap}>
          {available.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="hourglass-outline" size={36} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>Nenhum pedido por enquanto</Text>
              <Text style={styles.emptyText}>Assim que um cliente fizer um pedido, ele aparecerá aqui.</Text>
            </View>
          ) : (
            available.map((o) => (
              <TouchableOpacity
                key={o.id}
                style={styles.availCard}
                onPress={() => router.push(`/driver/order/${o.id}`)}
                testID={`driver-available-${o.id}`}
              >
                <View style={styles.availTop}>
                  <Text style={styles.orderStore}>{o.storeName}</Text>
                  <Text style={styles.fee}>{money(o.deliveryFee)}</Text>
                </View>
                <Text numberOfLines={2} style={styles.itemsPreview}>{o.items}</Text>
                <View style={styles.availFoot}>
                  <View style={styles.metaItem}>
                    <Ionicons name="cash-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.metaText}>Compra estim. {money(o.estimatedValue)}</Text>
                  </View>
                  <Text style={styles.tapHint}>Ver detalhes →</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    padding: spacing.md,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  greet: { fontSize: fontSize.h4, fontWeight: "700", color: colors.textPrimary },
  subtitle: { fontSize: fontSize.small, color: colors.primary, marginTop: 2, fontWeight: "600" },
  profileBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft,
    alignItems: "center", justifyContent: "center",
  },
  earningCard: {
    marginHorizontal: spacing.md, padding: spacing.lg, borderRadius: radius.xl,
    backgroundColor: colors.primary, gap: 4,
  },
  earningLabel: { color: "rgba(255,255,255,0.85)", fontSize: fontSize.body, fontWeight: "600" },
  earningValue: { color: colors.white, fontSize: 38, fontWeight: "800", letterSpacing: -0.5 },
  earningRow: { flexDirection: "row", marginTop: spacing.md, gap: spacing.sm },
  miniStat: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.18)", padding: spacing.sm,
    borderRadius: radius.md, alignItems: "center", gap: 2,
  },
  miniValue: { color: colors.white, fontSize: fontSize.h4, fontWeight: "800" },
  miniLabel: { color: "rgba(255,255,255,0.9)", fontSize: fontSize.small, fontWeight: "600" },

  headerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: fontSize.h4, fontWeight: "700", color: colors.textPrimary, marginHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm },
  count: {
    backgroundColor: colors.primarySoft, color: colors.primaryDark,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill,
    fontWeight: "700", fontSize: fontSize.small,
  },
  sectionWrap: { paddingHorizontal: spacing.md, gap: spacing.sm },
  orderCard: {
    backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg,
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  orderStore: { fontSize: fontSize.bodyLarge, fontWeight: "700", color: colors.textPrimary },

  availCard: {
    backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg,
    gap: 6, borderWidth: 1, borderColor: colors.borderLight,
  },
  availTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fee: { color: colors.primary, fontWeight: "800", fontSize: fontSize.bodyLarge },
  itemsPreview: { color: colors.textSecondary, fontSize: fontSize.small },
  availFoot: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: fontSize.small, color: colors.textSecondary },
  tapHint: { color: colors.primary, fontWeight: "700", fontSize: fontSize.small },

  empty: {
    alignItems: "center", padding: spacing.xl, gap: 6,
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight,
  },
  emptyTitle: { fontSize: fontSize.bodyLarge, fontWeight: "700", color: colors.textPrimary, marginTop: spacing.sm },
  emptyText: { color: colors.textSecondary, textAlign: "center", fontSize: fontSize.small },
  levelStrip: {
    marginHorizontal: spacing.md, marginBottom: spacing.md, padding: spacing.sm,
    borderRadius: radius.lg, borderWidth: 1.5, flexDirection: "row",
    alignItems: "center", gap: spacing.sm, backgroundColor: colors.surface,
  },
  levelTitle: { fontWeight: "800", color: colors.textPrimary, fontSize: fontSize.body },
  levelHint: { color: colors.textSecondary, fontSize: fontSize.small, marginTop: 2 },
});
