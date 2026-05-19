import React, { useEffect, useState } from "react";
import { Alert, View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { Button } from "@/src/components/Button";
import { DemoNotice } from "@/src/components/DemoNotice";
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

  const currentOrder = order;
  const currentLimit = currentOrder.authorizedPurchaseLimit ?? currentOrder.estimatedValue + currentOrder.safetyMargin;
  const complementAmount = currentOrder.actualValue !== undefined ? Math.max(0, currentOrder.actualValue - currentLimit) : 0;

  async function approveComplement() {
    if (!currentOrder.actualValue || complementAmount <= 0) {
      Alert.alert("Sem complemento", "O valor real ainda não ultrapassou o limite autorizado.");
      return;
    }
    await orderStore.update(currentOrder.id, {
      authorizedPurchaseLimit: currentOrder.actualValue,
      complementAmount,
      complementApprovedAt: Date.now(),
      total: +(currentOrder.total + complementAmount).toFixed(2),
      status: "Comprando produtos",
    });
    Alert.alert("Complemento aprovado", `Complemento local de ${money(complementAmount)} autorizado.`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header title="Acompanhar Pedido" subtitle={order.storeName} />
      <ScrollView contentContainerStyle={styles.container}>
        <DemoNotice />
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

        {order.status === "Aguardando complemento do cliente" && (
          <View style={styles.complementBox}>
            <Ionicons name="alert-circle" size={20} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.complementTitle}>Complemento pendente</Text>
              <Text style={styles.complementText}>
                O valor real informado foi {money(order.actualValue ?? 0)}. Autorize {money(complementAmount)} para liberar o andamento.
              </Text>
            </View>
            <Button title="Aprovar" onPress={approveComplement} testID="client-approve-complement" style={styles.complementButton} />
          </View>
        )}

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
          {(order.orderItems ?? []).length > 0 ? (
            order.orderItems.map((item, index) => (
              <View key={`${item.name}-${index}`} style={styles.itemRow}>
                <Text style={styles.itemsText}>{item.quantity}x {item.name}</Text>
                <Text style={styles.itemPrice}>{money(item.total)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.itemsText}>{order.items}</Text>
          )}
          {order.notes ? (
            <>
              <Text style={styles.itemsTitle}>Observações</Text>
              <Text style={styles.itemsText}>{order.notes}</Text>
            </>
          ) : null}
        </View>

        <FinancialBreakdown
          rows={[
            { label: "Subtotal produtos", value: order.subtotal ?? order.estimatedValue },
            { label: "Margem de segurança", value: order.safetyMargin },
            { label: "Limite autorizado", value: order.authorizedPurchaseLimit ?? order.estimatedValue + order.safetyMargin },
            ...(order.complementAmount ? [{ label: "Complemento aprovado", value: order.complementAmount }] : []),
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
  itemRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  itemPrice: { color: colors.primary, fontWeight: "800" },
  refundBox: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.primarySoft, padding: spacing.sm, borderRadius: radius.md,
  },
  refundText: { flex: 1, color: colors.primaryDark, fontSize: fontSize.small, lineHeight: 18 },
  complementBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  complementTitle: { color: colors.warning, fontWeight: "800", fontSize: fontSize.body },
  complementText: { color: colors.textSecondary, fontSize: fontSize.small, lineHeight: 18, marginTop: 2 },
  complementButton: { minHeight: 42, paddingHorizontal: spacing.md },
});
