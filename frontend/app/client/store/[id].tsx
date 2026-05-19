import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, Image, KeyboardAvoidingView, Platform, TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { Button } from "@/src/components/Button";
import { money } from "@/src/components/FinancialBreakdown";
import { catalogService, Product, Store } from "@/src/services/catalogService";
import { OrderItem } from "@/src/data/mock";

export default function StoreOrder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [customText, setCustomText] = useState("");
  const [customValue, setCustomValue] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const refresh = async () => {
      const storeId = String(id ?? "");
      const s = await catalogService.getStore(storeId);
      setStore(s ?? null);
      setProducts(await catalogService.listProducts({ storeId, activeOnly: true }));
    };
    refresh();
    return catalogService.subscribe(refresh);
  }, [id]);

  const selectedItems = useMemo<OrderItem[]>(() => {
    return products
      .map((p) => {
        const quantity = quantities[p.id] ?? 0;
        const unitPrice = p.promoPrice ?? p.price;
        return {
          productId: p.id,
          name: p.name,
          quantity,
          unitPrice,
          total: +(quantity * unitPrice).toFixed(2),
        };
      })
      .filter((item) => item.quantity > 0);
  }, [products, quantities]);

  const customSubtotal = Math.max(0, Number(customValue.replace(",", ".")) || 0);
  const cartSubtotal = selectedItems.reduce((acc, item) => acc + item.total, 0);
  const hasCustom = customText.trim().length > 0 && customSubtotal > 0;
  const valid = !!store && (selectedItems.length > 0 || hasCustom);
  const isPharmacy = store?.category?.toLowerCase().includes("farmácia") || store?.id === "farmacia-parceira";

  function changeQty(productId: string, delta: number) {
    setQuantities((current) => ({
      ...current,
      [productId]: Math.max(0, (current[productId] ?? 0) + delta),
    }));
  }

  function next() {
    if (!store) return;
    const orderItems = [...selectedItems];
    if (hasCustom) {
      orderItems.push({
        name: customText.trim(),
        quantity: 1,
        unitPrice: customSubtotal,
        total: customSubtotal,
        custom: true,
      });
    }
    router.push({
      pathname: "/client/checkout",
      params: {
        storeId: store.id,
        storeName: store.name,
        deliveryFee: String(store.baseFee),
        itemsJson: JSON.stringify(orderItems),
        notes,
      },
    });
  }

  if (!store) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Header title="Criar Pedido" />
        <View style={{ padding: spacing.md }}>
          <Text>Estabelecimento não encontrado.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header title="Criar Pedido" subtitle={store.name} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.storeHeader}>
            {store.image ? (
              <Image source={{ uri: store.image }} style={styles.storeImg} />
            ) : (
              <View style={styles.storeImgFallback}><Ionicons name="storefront" size={24} color={colors.primary} /></View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.storeName}>{store.name}</Text>
              <Text style={styles.storeDesc}>{store.description}</Text>
              <Text style={styles.storeFee}>Entrega base {money(store.baseFee)}</Text>
            </View>
          </View>

          {isPharmacy && (
            <View style={styles.pharmacyWarn} testID="pharmacy-warning">
              <Ionicons name="warning" size={18} color={colors.warning} />
              <Text style={styles.pharmacyText}>
                Medicamentos controlados ou itens com retenção de receita não entram no MVP local.
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Produtos disponíveis</Text>
          {products.length === 0 ? (
            <View style={styles.emptyBox}><Text style={styles.hint}>Nenhum produto ativo neste estabelecimento.</Text></View>
          ) : products.map((p) => {
            const qty = quantities[p.id] ?? 0;
            const unitPrice = p.promoPrice ?? p.price;
            return (
              <View key={p.id} style={[styles.productCard, qty > 0 && styles.productSelected]}>
                <TouchableOpacity style={styles.productMain} onPress={() => changeQty(p.id, qty > 0 ? -qty : 1)} testID={`product-select-${p.id}`}>
                  <View style={[styles.check, qty > 0 && styles.checkOn]}>
                    {qty > 0 ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{p.name}</Text>
                    <Text style={styles.productCat}>{p.category}</Text>
                    {p.notes ? <Text style={styles.hint}>{p.notes}</Text> : null}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    {p.promoPrice ? <Text style={styles.oldPrice}>{money(p.price)}</Text> : null}
                    <Text style={styles.price}>{money(unitPrice)}</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.qtyRow}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQty(p.id, -1)} testID={`product-minus-${p.id}`}>
                    <Ionicons name="remove" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.qty}>{qty}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQty(p.id, 1)} testID={`product-plus-${p.id}`}>
                    <Ionicons name="add" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <Text style={styles.sectionTitle}>Item personalizado opcional</Text>
          <View style={styles.card}>
            <TextInput
              value={customText}
              onChangeText={setCustomText}
              placeholder="Ex.: fruta da estação, marca específica..."
              placeholderTextColor={colors.textTertiary}
              multiline
              style={[styles.input, styles.textareaSm]}
              testID="custom-item-input"
            />
            <View style={styles.currencyRow}>
              <Text style={styles.currencyPrefix}>R$</Text>
              <TextInput
                value={customValue}
                onChangeText={setCustomValue}
                placeholder="Valor estimado"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                style={[styles.input, { flex: 1 }]}
                testID="custom-item-value"
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Observações</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Marcas preferidas, substituições aceitas, endereço complementar."
            placeholderTextColor={colors.textTertiary}
            multiline
            style={[styles.input, styles.textareaSm]}
            testID="order-notes-input"
          />

          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>Subtotal produtos</Text>
            <Text style={styles.summaryValue}>{money(cartSubtotal)}</Text>
            {customSubtotal > 0 ? (
              <>
                <Text style={styles.summaryLabel}>Subtotal personalizado</Text>
                <Text style={styles.summaryValue}>{money(customSubtotal)}</Text>
              </>
            ) : null}
          </View>

          <Button
            title="Revisar pedido"
            onPress={next}
            disabled={!valid}
            testID="order-review-button"
            icon={<Ionicons name="arrow-forward" size={18} color={colors.white} />}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  storeHeader: {
    flexDirection: "row", gap: spacing.sm, backgroundColor: colors.surface,
    padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight,
    alignItems: "center",
  },
  storeImg: { width: 56, height: 56, borderRadius: radius.md },
  storeImgFallback: {
    width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.primarySoft,
    alignItems: "center", justifyContent: "center",
  },
  storeName: { fontSize: fontSize.bodyLarge, fontWeight: "700", color: colors.textPrimary },
  storeDesc: { fontSize: fontSize.small, color: colors.textSecondary, marginTop: 2 },
  storeFee: { fontSize: fontSize.small, color: colors.primary, marginTop: 4, fontWeight: "700" },
  sectionTitle: { fontSize: fontSize.bodyLarge, fontWeight: "800", color: colors.textPrimary },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.borderLight },
  productCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.borderLight },
  productSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  productMain: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  productName: { color: colors.textPrimary, fontWeight: "800", fontSize: fontSize.bodyLarge },
  productCat: { color: colors.textSecondary, fontSize: fontSize.small, marginTop: 2 },
  price: { color: colors.primary, fontWeight: "800", fontSize: fontSize.bodyLarge },
  oldPrice: { color: colors.textTertiary, textDecorationLine: "line-through", fontSize: fontSize.small },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  qtyRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: spacing.sm },
  qtyBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.primary, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  qty: { minWidth: 24, textAlign: "center", color: colors.textPrimary, fontWeight: "800", fontSize: fontSize.bodyLarge },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    backgroundColor: colors.surface, padding: spacing.md, fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  textareaSm: { minHeight: 80, textAlignVertical: "top" },
  currencyRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  currencyPrefix: { fontSize: fontSize.h4, fontWeight: "700", color: colors.textSecondary },
  summary: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.borderLight, gap: 4 },
  summaryLabel: { color: colors.textSecondary, fontSize: fontSize.small, fontWeight: "700" },
  summaryValue: { color: colors.primary, fontSize: fontSize.h4, fontWeight: "800" },
  hint: { fontSize: fontSize.small, color: colors.textTertiary, marginTop: 2 },
  emptyBox: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight },
  pharmacyWarn: {
    flexDirection: "row", gap: 8, alignItems: "flex-start",
    backgroundColor: colors.warningSoft, padding: spacing.sm, borderRadius: radius.md,
  },
  pharmacyText: { flex: 1, color: colors.warning, fontSize: fontSize.small, lineHeight: 18 },
});
