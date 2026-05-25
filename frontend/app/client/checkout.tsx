import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { Button } from "@/src/components/Button";
import { DemoNotice } from "@/src/components/DemoNotice";
import { FinancialBreakdown, money } from "@/src/components/FinancialBreakdown";
import { Order, OrderItem } from "@/src/data/mock";
import { orderStore, generateCode, generateId } from "@/src/data/orderStore";
import { paymentService } from "@/src/services/paymentService";
import { authService } from "@/src/services/authService";
import { marketingService } from "@/src/services/marketingService";
import { USE_SUPABASE } from "@/src/config/runtime";
import { catalogService } from "@/src/services/catalogService";
import { AppSettings, DEFAULT_SETTINGS, settingsService } from "@/src/services/settingsService";

function parseItems(raw?: string | string[]): OrderItem[] {
  try {
    const parsed = JSON.parse(String(raw ?? "[]")) as OrderItem[];
    return Array.isArray(parsed)
      ? parsed.filter((item) => !item.custom && Boolean(item.productId) && item.quantity > 0 && item.total >= 0)
      : [];
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
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const productSubtotal = +items.reduce((acc, item) => acc + item.total, 0).toFixed(2);
  const subtotal = productSubtotal;
  const safety = +Math.max(subtotal * (settings.safetyMarginPercent / 100), settings.minimumSafetyMargin).toFixed(2);
  const authorizedPurchaseLimit = +(subtotal + safety).toFixed(2);
  let deliveryFee = Math.max(0, Number(String(p.deliveryFee ?? "").replace(",", ".")) || settings.defaultDeliveryFee);
  const platformFee = +Math.max(subtotal * (settings.platformFeePercent / 100), settings.platformMinimumFee).toFixed(2);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; type: string } | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    settingsService.get().then(setSettings).catch(() => setSettings(DEFAULT_SETTINGS));
  }, []);

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

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    try {
      const found = await marketingService.getCoupon(code);
      if (!found) {
        Alert.alert("Cupom inválido", "Esse cupom não existe ou não está ativo.");
        return;
      }
      setAppliedCoupon(found);
      Alert.alert("Cupom aplicado", `${found.code} • ${found.description}`);
    } catch (error) {
      Alert.alert("Não foi possível aplicar cupom", error instanceof Error ? error.message : "Tente novamente.");
    }
  }

  async function pay() {
    setPaying(true);
    try {
      const client = await authService.getSession();
      if (!client) {
        router.replace("/auth/login");
        return;
      }
      if (subtotal < settings.minimumOrderValue) {
        Alert.alert("Pedido mínimo", `O subtotal mínimo para concluir é ${money(settings.minimumOrderValue)}.`);
        return;
      }
      const currentStore = await catalogService.getStore(String(p.storeId ?? ""));
      if (!currentStore?.active || currentStore.type === "em_breve") {
        Alert.alert("Estabelecimento indisponível", "Este estabelecimento não aceita novos pedidos agora.");
        return;
      }
      const activeProducts = await catalogService.listProducts({ storeId: String(p.storeId ?? ""), activeOnly: true });
      if (items.some((item) => {
        const product = activeProducts.find((current) => current.id === item.productId);
        return !product || Math.abs((product.promoPrice ?? product.price) - item.unitPrice) > 0.001;
      })) {
        Alert.alert("Carrinho atualizado", "Um produto ou preço mudou. Volte ao catálogo e revise o pedido.");
        return;
      }
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
      customSubtotal: 0,
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
      router.replace(`/client/tracking/${order.id}`);
    } catch (error) {
      Alert.alert("Pedido não concluído", error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      setPaying(false);
    }
  }

  const rows = [
    { label: "Subtotal produtos", value: productSubtotal },
    { label: "Margem de segurança", value: safety, hint: `Maior entre ${settings.safetyMarginPercent}% e ${money(settings.minimumSafetyMargin)}` },
    { label: "Limite autorizado de compra", value: authorizedPurchaseLimit },
    { label: "Taxa de entrega", value: deliveryFee },
    { label: `Taxa da plataforma (${settings.platformFeePercent}%)`, value: platformFee },
  ];
  if (discount > 0) rows.push({ label: `Cupom ${appliedCoupon?.code}`, value: -discount });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header title="Revisão do Pedido" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <DemoNotice />
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

        <FinancialBreakdown rows={rows} total={total} totalLabel="Total autorizado" testID="checkout-breakdown" />

        <View style={styles.securityBox}>
          <Ionicons name="information-circle" size={18} color={colors.primary} />
          <Text style={styles.securityText}>
            O valor real pode variar dentro de uma faixa permitida. Se passar muito do estimado, você será consultado antes da compra continuar.
          </Text>
        </View>

        <View style={styles.securityBox}>
          <Ionicons name="lock-closed" size={18} color={colors.primary} />
          <Text style={styles.securityText}>
            Pagamento simulado. {USE_SUPABASE ? "O pedido será salvo na sua conta." : "O pedido será salvo localmente."} Nenhuma API de pagamento será chamada.
          </Text>
        </View>

        <Button
          title={`Simular pagamento • ${money(total)}`}
          onPress={pay}
          loading={paying}
          disabled={items.length === 0 || subtotal < settings.minimumOrderValue}
          testID="checkout-pay-button"
          icon={<Ionicons name="card" size={20} color={colors.white} />}
        />
        {subtotal < settings.minimumOrderValue ? (
          <Text style={styles.minimumHint}>Pedido mínimo: {money(settings.minimumOrderValue)} em produtos.</Text>
        ) : null}
      </ScrollView>
      </KeyboardAvoidingView>
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
  minimumHint: { color: colors.warning, textAlign: "center", fontWeight: "700", fontSize: fontSize.small },
});
