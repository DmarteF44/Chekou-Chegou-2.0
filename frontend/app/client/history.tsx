import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { StatusPill } from "@/src/components/StatusPill";
import { money } from "@/src/components/FinancialBreakdown";
import { orderStore } from "@/src/data/orderStore";
import { Order } from "@/src/data/mock";

export default function History() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const refresh = async () => setOrders(await orderStore.getAll());
    refresh();
    return orderStore.subscribe(refresh);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header title="Histórico de Pedidos" />
      <ScrollView contentContainerStyle={styles.container}>
        {orders.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Nenhum pedido ainda</Text>
            <Text style={styles.emptyText}>Seus pedidos aparecerão aqui.</Text>
          </View>
        ) : (
          orders.map((o) => (
            <TouchableOpacity
              key={o.id}
              style={styles.card}
              onPress={() => router.push(`/client/tracking/${o.id}`)}
              testID={`history-order-${o.id}`}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.storeName}>{o.storeName}</Text>
                <Text style={styles.date}>{new Date(o.createdAt).toLocaleString("pt-BR")}</Text>
                <View style={{ marginTop: 6 }}>
                  <StatusPill status={o.status} />
                </View>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={styles.total}>{money(o.total)}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.sm },
  empty: { alignItems: "center", marginTop: spacing.xxl, gap: 8 },
  emptyTitle: { fontSize: fontSize.h4, fontWeight: "700", color: colors.textPrimary },
  emptyText: { color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.borderLight, flexDirection: "row", alignItems: "center", gap: spacing.sm,
  },
  storeName: { fontSize: fontSize.bodyLarge, fontWeight: "700", color: colors.textPrimary },
  date: { fontSize: fontSize.small, color: colors.textSecondary, marginTop: 2 },
  total: { fontSize: fontSize.bodyLarge, fontWeight: "800", color: colors.primary },
});
