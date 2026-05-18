import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { StatusTracker } from "@/src/components/StatusTracker";
import { FinancialBreakdown, money } from "@/src/components/FinancialBreakdown";
import { orderStore } from "@/src/data/orderStore";
import { Order } from "@/src/data/mock";

export default function Tracking() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    const refresh = async () => {
      const o = await orderStore.getById(orderId as string);
      setOrder(o ?? null);
    };
    refresh();
    return orderStore.subscribe(refresh);
  }, [orderId]);

  if (!order) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Header title="Acompanhar Pedido" />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Pedido não encontrado.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header title="Acompanhar Pedido" subtitle={order.storeName} />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Confirmation code highlight */}
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Código de confirmação</Text>
          <Text style={styles.code} testID="confirmation-code">{order.confirmationCode}</Text>
          <Text style={styles.codeHint}>
            Informe ao entregador no momento da entrega para liberar o pagamento.
          </Text>
        </View>

        {/* Status timeline */}
        <Text style={styles.sectionTitle}>Status</Text>
        <StatusTracker current={order.status} />

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push(`/client/chat/${order.id}`)}
            testID="tracking-chat-button"
          >
            <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
            <Text style={styles.actionText}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push("/client/history")}
            testID="tracking-history-button"
          >
            <Ionicons name="time" size={20} color={colors.primary} />
            <Text style={styles.actionText}>Histórico</Text>
          </TouchableOpacity>
        </View>

        {/* Order details */}
        <Text style={styles.sectionTitle}>Detalhes do Pedido</Text>
        <View style={styles.card}>
          <Text style={styles.itemsTitle}>Itens</Text>
          <Text style={styles.itemsText}>{order.items}</Text>
          {order.notes ? (
            <>
              <Text style={styles.itemsTitle}>Observações</Text>
              <Text style={styles.itemsText}>{order.notes}</Text>
            </>
          ) : null}
        </View>

        <FinancialBreakdown
          rows={[
            { label: "Valor estimado", value: order.estimatedValue },
            { label: "Margem de segurança", value: order.safetyMargin },
            { label: "Taxa de entrega", value: order.deliveryFee },
            { label: "Taxa da plataforma", value: order.platformFee },
            ...(order.discount > 0 ? [{ label: `Cupom ${order.couponCode}`, value: -order.discount }] : []),
          ]}
          total={order.total}
          totalLabel="Total pago"
        />

        {order.actualValue !== undefined && (
          <View style={styles.refundBox}>
            <Ionicons name="cash" size={18} color={colors.primary} />
            <Text style={styles.refundText}>
              Valor real informado: {money(order.actualValue)}
              {"\n"}Sobra a devolver: {money(Math.max(0, order.estimatedValue + order.safetyMargin - order.actualValue))}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.textSecondary },
  codeBox: {
    backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg,
    alignItems: "center", gap: 4,
  },
  codeLabel: { color: "rgba(255,255,255,0.85)", fontSize: fontSize.small, fontWeight: "600" },
  code: { color: colors.white, fontSize: 44, fontWeight: "800", letterSpacing: 8 },
  codeHint: {
    color: "rgba(255,255,255,0.9)", textAlign: "center",
    fontSize: fontSize.small, marginTop: 4, lineHeight: 18,
  },
  sectionTitle: { fontSize: fontSize.h4, fontWeight: "700", color: colors.textPrimary },
  actionsRow: { flexDirection: "row", gap: spacing.sm },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  actionText: { color: colors.primary, fontWeight: "700", fontSize: fontSize.body },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.borderLight, gap: 6,
  },
  itemsTitle: { fontSize: fontSize.small, fontWeight: "700", color: colors.textSecondary, marginTop: spacing.xs },
  itemsText: { fontSize: fontSize.body, color: colors.textPrimary, lineHeight: 20 },
  refundBox: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.primarySoft, padding: spacing.sm, borderRadius: radius.md,
  },
  refundText: { flex: 1, color: colors.primaryDark, fontSize: fontSize.small, lineHeight: 18 },
});
