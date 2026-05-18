import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { Button } from "@/src/components/Button";
import { orderStore } from "@/src/data/orderStore";
import { ESTABLISHMENTS, COUPONS, PROMOTIONS, Order } from "@/src/data/mock";
import { StatusPill } from "@/src/components/StatusPill";
import { money } from "@/src/components/FinancialBreakdown";

const TABS = ["Pedidos", "Usuários", "Entregadores", "Lojas", "Cupons", "Promoções", "Disputas"] as const;
type Tab = typeof TABS[number];

export default function AdminPanel() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Pedidos");
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const refresh = async () => setOrders(await orderStore.getAll());
    refresh();
    return orderStore.subscribe(refresh);
  }, []);

  const inProgress = orders.filter((o) => o.status !== "Entregue");

  async function reset() {
    Alert.alert("Resetar dados", "Apagar todos os pedidos simulados?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Apagar", style: "destructive", onPress: async () => { await orderStore.clearAll(); } },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header title="Painel Admin" right={
        <TouchableOpacity onPress={reset} testID="admin-reset">
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      } />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
            testID={`admin-tab-${t}`}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.body}>
        {tab === "Pedidos" && (
          <>
            <StatRow stats={[
              { label: "Em andamento", value: inProgress.length },
              { label: "Concluídos", value: orders.length - inProgress.length },
              { label: "GMV (R$)", value: orders.reduce((a, o) => a + o.total, 0).toFixed(0) },
            ]} />
            {orders.map((o) => (
              <TouchableOpacity
                key={o.id}
                style={styles.card}
                onPress={() => router.push(`/client/tracking/${o.id}`)}
                testID={`admin-order-${o.id}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{o.storeName}</Text>
                  <Text style={styles.muted}>{new Date(o.createdAt).toLocaleString("pt-BR")}</Text>
                  <View style={{ marginTop: 4 }}><StatusPill status={o.status} /></View>
                </View>
                <Text style={styles.amount}>{money(o.total)}</Text>
              </TouchableOpacity>
            ))}
            {orders.length === 0 && <Empty text="Nenhum pedido ainda." />}
          </>
        )}

        {tab === "Usuários" && (
          <>
            <Card title="Maria Cliente" subtitle="cliente@chekou.com" badge="Cliente" />
            <Card title="José Compras" subtitle="jose@chekou.com" badge="Cliente" />
            <Card title="Ana Silva" subtitle="ana@chekou.com" badge="Cliente" />
          </>
        )}

        {tab === "Entregadores" && (
          <>
            <Card title="João Entregador" subtitle="Moto • Ativo" badge="Online" />
            <Card title="Carlos Mota" subtitle="Bicicleta • Ativo" badge="Online" />
            <Card title="Pedro Lima" subtitle="Moto • Inativo" badge="Offline" badgeColor={colors.textTertiary} />
          </>
        )}

        {tab === "Lojas" && (
          <>
            {ESTABLISHMENTS.map((e) => (
              <Card key={e.id} title={e.name} subtitle={`${e.category} • ${e.deliveryTime}`} badge="Ativa" />
            ))}
          </>
        )}

        {tab === "Cupons" && (
          <>
            {COUPONS.map((c) => (
              <Card key={c.code} title={c.code} subtitle={c.description} badge={c.type === "delivery" ? "Entrega" : "Pedido"} />
            ))}
            <Button title="Criar novo cupom" variant="secondary"
              onPress={() => Alert.alert("Em breve", "Criação de cupons disponível na próxima versão.")}
              testID="admin-new-coupon" />
          </>
        )}

        {tab === "Promoções" && (
          <>
            {PROMOTIONS.map((p) => (
              <Card key={p.id} title={p.title} subtitle={`${p.storeName} • ${p.discount}`} badge="Ativa" />
            ))}
          </>
        )}

        {tab === "Disputas" && (
          <Empty text="Nenhuma disputa em aberto. 🎉" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatRow({ stats }: { stats: { label: string; value: number | string }[] }) {
  return (
    <View style={styles.statsRow}>
      {stats.map((s) => (
        <View key={s.label} style={styles.stat}>
          <Text style={styles.statValue}>{s.value}</Text>
          <Text style={styles.statLabel}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

function Card({ title, subtitle, badge, badgeColor = colors.primary }: { title: string; subtitle: string; badge?: string; badgeColor?: string }) {
  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.muted}>{subtitle}</Text>
      </View>
      {badge && (
        <View style={[styles.badge, { backgroundColor: badgeColor + "22" }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
        </View>
      )}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="folder-open-outline" size={40} color={colors.textTertiary} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  tabs: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingVertical: spacing.sm },
  tab: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, height: 36 },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textSecondary, fontWeight: "600", fontSize: fontSize.small },
  tabTextActive: { color: colors.white },
  body: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  title: { color: colors.textPrimary, fontSize: fontSize.bodyLarge, fontWeight: "700" },
  muted: { color: colors.textSecondary, fontSize: fontSize.small, marginTop: 2 },
  amount: { color: colors.primary, fontSize: fontSize.bodyLarge, fontWeight: "800" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { fontWeight: "700", fontSize: fontSize.small },
  statsRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, alignItems: "center" },
  statValue: { fontSize: fontSize.h3, fontWeight: "800", color: colors.primary },
  statLabel: { fontSize: fontSize.small, color: colors.textSecondary, marginTop: 2 },
  empty: { alignItems: "center", gap: 8, padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.lg },
  emptyText: { color: colors.textSecondary },
});
