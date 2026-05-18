import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { Button } from "@/src/components/Button";
import { FinancialBreakdown, money } from "@/src/components/FinancialBreakdown";
import { COUPONS, Order } from "@/src/data/mock";
import { orderStore, generateCode, generateId } from "@/src/data/orderStore";

const DELIVERY_FEE = 8;
const PLATFORM_FEE_RATE = 0.07; // 7%

export default function Checkout() {
  const router = useRouter();
  const p = useLocalSearchParams<{
    storeId: string; storeName: string; items: string; notes: string; estimated: string;
  }>();

  const estValue = Math.max(0, Number(String(p.estimated || "0").replace(",", ".")) || 0);
  const safety = +(estValue * 0.1).toFixed(2); // 10% margem
  const platformFee = +(estValue * PLATFORM_FEE_RATE).toFixed(2);
  let deliveryFee = DELIVERY_FEE;

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; type: string } | null>(null);
  const [paying, setPaying] = useState(false);

  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === "delivery") {
      deliveryFee = Math.max(0, deliveryFee - appliedCoupon.discount);
      discount = Math.min(DELIVERY_FEE, appliedCoupon.discount);
    } else {
      discount = appliedCoupon.discount;
    }
  }

  const total = useMemo(
    () => +(estValue + safety + deliveryFee + platformFee - discount).toFixed(2),
    [estValue, safety, deliveryFee, platformFee, discount]
  );

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    const found = COUPONS.find((c) => c.code === code);
    if (!found) {
      Alert.alert("Cupom inválido", "Esse cupom não existe ou expirou.");
      return;
    }
    setAppliedCoupon(found);
    Alert.alert("Cupom aplicado", `${found.code} • ${found.description}`);
  }

  async function pay() {
    setPaying(true);
    // Simulated payment
    await new Promise((r) => setTimeout(r, 1200));
    const order: Order = {
      id: generateId(),
      storeId: p.storeId as string,
      storeName: p.storeName as string,
      items: (p.items as string) || "",
      notes: (p.notes as string) || "",
      estimatedValue: estValue,
      safetyMargin: safety,
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
      paid: true,
    };
    await orderStore.create(order);
    setPaying(false);
    router.replace(`/client/tracking/${order.id}`);
  }

  const rows = [
    { label: "Valor estimado da compra", value: estValue },
    { label: "Margem de segurança (10%)", value: safety, hint: "Devolvida se sobrar" },
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
          <Text style={styles.itemsTitle}>Itens</Text>
          <Text style={styles.itemsText}>{p.items}</Text>
          {p.notes ? (
            <>
              <Text style={styles.itemsTitle}>Observações</Text>
              <Text style={styles.itemsText}>{p.notes}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.couponLabel}>Cupom</Text>
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

        <FinancialBreakdown rows={rows} total={total} testID="checkout-breakdown" />

        <View style={styles.securityBox}>
          <Ionicons name="lock-closed" size={18} color={colors.primary} />
          <Text style={styles.securityText}>
            Pagamento simulado. O entregador só recebe a entrega após você informar o código de confirmação.
          </Text>
        </View>

        <Button
          title={`Pagar agora • ${money(total)}`}
          onPress={pay}
          loading={paying}
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
  itemsText: { fontSize: fontSize.body, color: colors.textPrimary, lineHeight: 20 },
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
