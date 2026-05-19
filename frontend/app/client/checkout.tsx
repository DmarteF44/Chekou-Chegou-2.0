import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { Button } from "@/src/components/Button";
import { FinancialBreakdown, money } from "@/src/components/FinancialBreakdown";
import { COUPONS, Order, OrderItem } from "@/src/data/mock";
import { orderStore, generateCode, generateId } from "@/src/data/orderStore";
import { paymentService } from "@/src/services/paymentService";
import { authService } from "@/src/services/authService";

const PLATFORM_FEE_RATE = 0.07;

function parseItems(raw?: string | string[]): OrderItem[] {
  try {
    const parsed = JSON.parse(String(raw ?? "[]")) as OrderItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function Checkout() {
  const router = useRouter();
  const p = useLocalSearchParams<{
    storeId: string; storeName: string; itemsJson?: string; notes?: string; deliveryFee?: string;
  }>();

  const items = useMemo(() => parseItems(p.itemsJson), [p.itemsJson]);
  const productSubtotal = items.filter((i) => !i.custom).reduce((acc, item) => acc + item.total, 0);
  const customSubtotal = items.filter((i) => i.custom).reduce((acc, item) => acc + item.total, 0);
  const subtotal = +(productSubtotal + customSubtotal).toFixed(2);
  const safety = +Math.max(subtotal * 0.15, 10).toFixed(2);
  const authorizedPurchaseLimit = +(subtotal + safety).toFixed(2);
  let deliveryFee = Math.max(0, Number(String(p.deliveryFee ?? "8").replace(",", ".")) || 8);
  const platformFee = +(subtotal * PLATFORM_FEE_RATE).toFixed(2);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; type: string } | null>(null);
  const [paying, setPaying] = useState(false);

  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === "delivery") {
      const originalFee = deliveryFee;
      deliveryFee = Math.max(0, deliveryFee - appliedCoupon.discount);
      discount = Math.min(originalFee, appliedCoupon.discount);
    } else {
      discount = Math.min(subtotal + platformFee, appliedCoupon.discount);
    }
  }

  const total = useMemo(
    () => +(authorizedPurchaseLimit + deliveryFee + platformFee - discount).toFixed(2),
    [authorizedPurchaseLimit, deliveryFee, platformFee, discount]
  );

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    const found = COUPONS.find((c) => c.code === code);
    if (!found) {
      Alert.alert("Cupom inválido", "Esse cupom não existe no modo local.");
      return;
    }
    setAppliedCoupon(found);
    Alert.alert("Cupom aplicado", `${found.code} • ${found.description}`);
  }

  async function pay() {
    const client = await authService.getSession();
    if (!client) {
      router.replace("/auth/login");
      return;
    }
    setPaying(true);
    const itemsText = items.map((item) => `${item.quantity}x ${item.name} - ${money(item.total)}`).join("\n");
    const draft: Order = {
      id: generateId(),
      clientId: client.id,
      storeId: String(p.storeId ?? ""),
      storeName: String(p.storeName ?? "Estabelecimento"),
      items: itemsText,
      orderItems: items,
      notes: String(p.notes ?? ""),
      subtotal,
      customSubtotal,
      estimatedValue: subtotal,
      safetyMargin: safety,
      authorizedPurchaseLimit,
      deliveryFee,
      platformFee,
      total,
      couponCode: appliedCoupon?.code,
      discount,
      status: "Aguardando entregador",
      createdAt: Date.now(),
      confirmationCode: generateCode(),
      invoicePhotoSent: false,
      goodsPhotoSent: false,
      chat: [],
      paid: false,
    };
    const intent = await paymentService.createPaymentIntent(draft);
    await new Promise((r) => setTimeout(r, 400));
    await paymentService.markPaymentAsApproved(intent);
    const order = { ...draft, paid: true };
    await orderStore.create(order);
    setPaying(false);
    router.replace(`/client/tracking/${order.id}`);
  }

  const rows = [
    { label: "Subtotal produtos", value: productSubtotal },
    { label: "Subtotal item personalizado", value: customSubtotal },
    { label: "Margem de segurança", value: safety, hint: "Maior entre 15% e R$ 10" },
    { label: "Limite autorizado de compra", value: authorizedPurchaseLimit },
    { label: "Taxa de entrega", value: deliveryFee },
    { label: "Taxa da plataforma (7%)", value: platformFee },
  ];
  if (discount > 0) rows.push({ label: `Cupom ${appliedCoupon?.code}`, value: -discount });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header title="Revisão do Pedido" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.storeName}>{p.storeName}</Text>
          <Text style={styles.itemsTitle}>Itens selecionados</Text>
          {items.length === 0 ? (
            <Text style={styles.itemsText}>Nenhum item no carrinho.</Text>
          ) : items.map((item, index) => (
            <View key={`${item.name}-${index}`} style={styles.itemRow}>
              <Text style={styles.itemsText}>{item.quantity}x {item.name}</Text>
              <Text style={styles.itemPrice}>{money(item.total)}</Text>
            </View>
          ))}
          {p.notes ? (
            <>
              <Text style={styles.itemsTitle}>Observações</Text>
              <Text style={styles.itemsText}>{p.notes}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.couponLabel}>Cupom local</Text>
          <View style={styles.couponRow}>
            <TextInput
              value={couponInput}
              onChangeText={setCouponInput}
              placeholder="Digite seu cupom"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
              style={styles.couponInput}
              testID="checkout-coupon-input"
            />
            <Button title="Aplicar" variant="secondary" onPress={applyCoupon} testID="checkout-coupon-apply" />
          </View>
          {appliedCoupon && (
            <View style={styles.appliedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={styles.appliedText}>{appliedCoupon.code} aplicado</Text>
            </View>
          )}
        </View>

        <FinancialBreakdown rows={rows} total={total} totalLabel="Total autorizado" testID="checkout-breakdown" />

        <View style={styles.securityBox}>
          <Ionicons name="lock-closed" size={18} color={colors.primary} />
          <Text style={styles.securityText}>
            Pagamento simulado e salvo localmente. Nenhuma API externa será chamada.
          </Text>
        </View>

        <Button
          title={`Simular pagamento • ${money(total)}`}
          onPress={pay}
          loading={paying}
          disabled={items.length === 0}
          testID="checkout-pay-button"
          icon={<Ionicons name="card" size={20} color={colors.white} />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.borderLight, gap: 6,
  },
  storeName: { fontSize: fontSize.h4, fontWeight: "700", color: colors.textPrimary, marginBottom: spacing.xs },
  itemsTitle: { fontSize: fontSize.small, fontWeight: "700", color: colors.textSecondary, marginTop: spacing.xs },
  itemsText: { fontSize: fontSize.body, color: colors.textPrimary, lineHeight: 20, flex: 1 },
  itemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  itemPrice: { color: colors.primary, fontWeight: "800" },
  couponLabel: { fontSize: fontSize.body, fontWeight: "700", color: colors.textPrimary },
  couponRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  couponInput: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.sm, fontSize: fontSize.body, color: colors.textPrimary, minHeight: 48,
  },
  appliedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.xs,
    alignSelf: "flex-start", backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill,
  },
  appliedText: { color: colors.primaryDark, fontWeight: "600", fontSize: fontSize.small },
  securityBox: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.primarySoft, padding: spacing.sm, borderRadius: radius.md,
  },
  securityText: { flex: 1, color: colors.primaryDark, fontSize: fontSize.small, lineHeight: 18 },
});
