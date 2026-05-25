import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { Button } from "@/src/components/Button";
import { StatusTracker } from "@/src/components/StatusTracker";
import { FinancialBreakdown, money } from "@/src/components/FinancialBreakdown";
import { DemoNotice } from "@/src/components/DemoNotice";
import { orderStore } from "@/src/data/orderStore";
import { Order, ORDER_STATUSES, OrderStatus } from "@/src/data/mock";
import { authService, User } from "@/src/services/authService";
import { driverService } from "@/src/services/driverService";
import { AppSettings, DEFAULT_SETTINGS, settingsService } from "@/src/services/settingsService";
import { validateActualPurchaseValue } from "@/src/utils/purchaseValidation";

export default function DriverOrder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [actualValue, setActualValue] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const refresh = async () => {
      try {
        const session = await authService.getSession();
        if (!session || session.role !== "driver") {
          router.replace("/auth/login");
          return;
        }
        if (session.driverStatus === "blocked") {
          router.replace("/driver/blocked");
          return;
        }
        if (session.driverStatus !== "approved") {
          router.replace("/driver/pending");
          return;
        }
        setMe(session);
        const [o, appSettings] = await Promise.all([orderStore.getById(id as string), settingsService.get()]);
        setOrder(o ?? null);
        setSettings(appSettings);
        setLoadError("");
        if (o?.actualValue !== undefined) setActualValue(String(o.actualValue));
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Não foi possível carregar o pedido.");
      }
    };
    refresh();
    const a = orderStore.subscribe(refresh);
    const b = authService.subscribe(refresh);
    const c = settingsService.subscribe(refresh);
    return () => { a(); b(); c(); };
  }, [id, router]);

  if (!order) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Header title="Pedido" />
        <View style={styles.empty}><Text>Carregando...</Text></View>
      </SafeAreaView>
    );
  }

  const isMine = order.driverId === me?.id;
  const canAccept = order.status === "Aguardando entregador" && !!me && me.role === "driver" && me.driverStatus === "approved";

  async function acceptOrder() {
    if (!me) { Alert.alert("Atenção", "Faça login como entregador."); return; }
    const check = driverService.canAcceptOrder(me, order!.authorizedPurchaseLimit ?? order!.estimatedValue);
    if (!check.ok) {
      Alert.alert("Limite operacional", check.reason ?? "Você não pode aceitar este pedido.");
      return;
    }
    try {
      await orderStore.update(order!.id, { driverId: me.id, status: "Entregador aceitou" });
      Alert.alert("Pedido aceito!", "Siga ao estabelecimento.");
    } catch (error) {
      Alert.alert("Não foi possível aceitar", error instanceof Error ? error.message : "Tente novamente.");
    }
  }

  async function nextStatus() {
    const idx = ORDER_STATUSES.indexOf(order!.status);
    if (idx < 0 || idx >= ORDER_STATUSES.length - 1) return;
    const candidate = ORDER_STATUSES[idx + 1];
    const next: OrderStatus = candidate === "Aguardando complemento do cliente" ? "A caminho do cliente" : candidate;
    try {
      await orderStore.setStatus(order!.id, next);
    } catch (error) {
      Alert.alert("Não foi possível atualizar", error instanceof Error ? error.message : "Tente novamente.");
    }
  }

  async function saveActualValue() {
    const v = Number(actualValue.replace(",", "."));
    if (!(v > 0)) {
      Alert.alert("Valor inválido", "Informe o valor real da compra.");
      return;
    }
    const validation = validateActualPurchaseValue(order!, v, settings);
    const nextPatch: Partial<Order> = { actualValue: v };
    if (validation.status === "needs_complement") nextPatch.status = "Aguardando complemento do cliente";
    if (validation.status === "blocked_review") nextPatch.status = "Aguardando revisão do Admin";
    if (
      (validation.status === "ok" || validation.status === "warning_low")
      && (order!.status === "Aguardando complemento do cliente" || order!.status === "Aguardando revisão do Admin")
    ) {
      nextPatch.status = "Comprando produtos";
    }
    try {
      await orderStore.update(order!.id, nextPatch);
      if (validation.status === "needs_complement") {
        Alert.alert("Complemento necessário", `${validation.message}\nComplemento: ${money(validation.extraRequired)}.`);
      } else if (validation.status === "blocked_review") {
        Alert.alert("Revisão necessária", validation.message);
      } else if (validation.status === "warning_low") {
        Alert.alert("Confira a compra", validation.message);
      } else {
        Alert.alert("Valor salvo!", `Compra real: ${money(v)}. Dentro da faixa permitida.`);
      }
    } catch (error) {
      Alert.alert("Não foi possível salvar", error instanceof Error ? error.message : "Tente novamente.");
    }
  }

  async function sendInvoice() {
    try {
      await orderStore.update(order!.id, { invoicePhotoSent: true });
      Alert.alert("Nota fiscal enviada", "Foto da nota fiscal compartilhada com o cliente (simulado).");
    } catch (error) {
      Alert.alert("Não foi possível enviar", error instanceof Error ? error.message : "Tente novamente.");
    }
  }
  async function sendGoods() {
    try {
      await orderStore.update(order!.id, { goodsPhotoSent: true });
      Alert.alert("Mercadorias enviadas", "Foto das mercadorias compartilhada com o cliente (simulado).");
    } catch (error) {
      Alert.alert("Não foi possível enviar", error instanceof Error ? error.message : "Tente novamente.");
    }
  }

  async function confirmDelivery() {
    if (codeInput.trim() !== order!.confirmationCode) {
      Alert.alert("Código incorreto", "Confira o código informado pelo cliente.");
      return;
    }
    if (order!.status === "Aguardando complemento do cliente" || order!.status === "Aguardando revisão do Admin") {
      Alert.alert("Pedido bloqueado", "Finalize somente após a pendência ser resolvida.");
      return;
    }
    try {
      await orderStore.completeDelivery(order!.id, codeInput.trim());
      // Navigate FIRST (Alert per-button onPress doesn't fire reliably on react-native-web).
      router.replace("/driver/home");
      Alert.alert("Entrega concluída!", "Taxa de entrega liberada para seu saldo.");
    } catch (error) {
      Alert.alert("Não foi possível concluir", error instanceof Error ? error.message : "Tente novamente.");
    }
  }

  const nextLabel = (() => {
    const idx = ORDER_STATUSES.indexOf(order.status);
    if (idx < 0) return null;
    if (
      order.status === "A caminho do cliente" || order.status === "Entregue" || order.status === "Cancelado"
      || order.status === "Aguardando complemento do cliente" || order.status === "Aguardando revisão do Admin"
    ) return null;
    const candidate = ORDER_STATUSES[idx + 1];
    const next = candidate === "Aguardando complemento do cliente" ? "A caminho do cliente" : candidate;
    return `Avançar: ${next}`;
  })();

  const sobra = order.actualValue !== undefined
    ? Math.max(0, order.estimatedValue + order.safetyMargin - order.actualValue)
    : null;
  const validation = order.actualValue !== undefined
    ? validateActualPurchaseValue(order, order.actualValue, settings)
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header title="Pedido" subtitle={order.storeName} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <DemoNotice />
        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.h}>Lista do cliente</Text>
          <Text style={styles.body}>{order.items}</Text>
          {order.notes ? (<><Text style={styles.h}>Observações</Text><Text style={styles.body}>{order.notes}</Text></>) : null}
        </View>

        {/* Financial */}
        <FinancialBreakdown
          rows={[
            { label: "Valor estimado (saldo operacional)", value: order.estimatedValue, hint: "Não pode ser sacado" },
            { label: "Margem de segurança", value: order.safetyMargin },
            { label: "Taxa de entrega (sua)", value: order.deliveryFee, hint: "Liberada após confirmação" },
            { label: "Taxa da plataforma", value: order.platformFee },
          ]}
          total={order.total}
          totalLabel="Valor pago pelo cliente"
        />

        {/* Actions based on status */}
        {canAccept ? (
          <Button title="Aceitar Pedido" onPress={acceptOrder} testID="driver-accept-button"
            icon={<Ionicons name="checkmark-circle" size={20} color={colors.white} />} />
        ) : isMine ? (
          <>
            <View style={styles.card}>
              <Text style={styles.h}>Status atual</Text>
              <StatusTracker current={order.status} />
              {nextLabel && (
                <Button title={nextLabel} onPress={nextStatus} testID="driver-next-status" />
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.h}>Valor real da compra</Text>
              <View style={styles.row}>
                <Text style={styles.currencyPrefix}>R$</Text>
                <TextInput
                  value={actualValue}
                  onChangeText={setActualValue}
                  placeholder="0,00"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                  style={styles.input}
                  testID="driver-actual-value-input"
                />
                <Button title="Salvar" variant="secondary" onPress={saveActualValue} testID="driver-save-actual" />
              </View>
            {sobra !== null && (
              <Text style={styles.refundText}>Sobra a devolver: {money(sobra)}</Text>
            )}
              {validation ? (
                <Text style={validation.status === "ok" ? styles.okText : styles.warnText}>
                  Faixa permitida: {money(validation.minAllowed)} a {money(validation.maxAllowed)}. {validation.message}
                </Text>
              ) : null}
              {order.status === "Aguardando complemento do cliente" && (
                <Text style={styles.warnText}>Pedido bloqueado até complemento do cliente.</Text>
              )}
              {order.status === "Aguardando revisão do Admin" && (
                <Text style={styles.errorText}>Pedido bloqueado para revisão do Admin.</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.h}>Comprovantes</Text>
              <View style={styles.proofRow}>
                <TouchableOpacity
                  style={[styles.proofBtn, order.invoicePhotoSent && styles.proofDone]}
                  onPress={sendInvoice}
                  testID="driver-send-invoice"
                >
                  <Ionicons
                    name={order.invoicePhotoSent ? "checkmark-circle" : "receipt-outline"}
                    size={22}
                    color={order.invoicePhotoSent ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.proofText, order.invoicePhotoSent && { color: colors.primary }]}>
                    {order.invoicePhotoSent ? "Nota enviada" : "Enviar nota fiscal"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.proofBtn, order.goodsPhotoSent && styles.proofDone]}
                  onPress={sendGoods}
                  testID="driver-send-goods"
                >
                  <Ionicons
                    name={order.goodsPhotoSent ? "checkmark-circle" : "camera-outline"}
                    size={22}
                    color={order.goodsPhotoSent ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.proofText, order.goodsPhotoSent && { color: colors.primary }]}>
                    {order.goodsPhotoSent ? "Mercadorias enviadas" : "Enviar mercadorias"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Button
              title="Abrir chat com o cliente"
              variant="secondary"
              onPress={() => router.push(`/client/chat/${order.id}?role=driver`)}
              testID="driver-chat-button"
              icon={<Ionicons name="chatbubble-ellipses" size={18} color={colors.primary} />}
            />

            {order.status !== "Entregue" && (
              <View style={styles.card}>
                <Text style={styles.h}>Código de confirmação</Text>
                <Text style={styles.hint}>Solicite o código de 4 dígitos ao cliente para finalizar.</Text>
                <View style={styles.row}>
                  <TextInput
                    value={codeInput}
                    onChangeText={setCodeInput}
                    placeholder="0000"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="number-pad"
                    maxLength={4}
                    style={[styles.input, styles.codeInput]}
                    testID="driver-code-input"
                  />
                  <Button title="Confirmar entrega" onPress={confirmDelivery} testID="driver-confirm-delivery" />
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.h}>
              {order.driverId ? "Pedido em andamento com outro entregador" : "Pedido indisponível para aceite"}
            </Text>
            <Text style={styles.hint}>Volte para a lista de pedidos disponíveis para escolher outro pedido.</Text>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.borderLight, gap: 8,
  },
  h: { fontSize: fontSize.body, fontWeight: "700", color: colors.textPrimary },
  body: { fontSize: fontSize.body, color: colors.textSecondary, lineHeight: 20 },
  hint: { color: colors.textTertiary, fontSize: fontSize.small },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  currencyPrefix: { fontSize: fontSize.h4, fontWeight: "700", color: colors.textSecondary },
  input: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.sm, minHeight: 48, color: colors.textPrimary, fontSize: fontSize.bodyLarge,
  },
  codeInput: { textAlign: "center", fontSize: 22, letterSpacing: 8, fontWeight: "700" },
  refundText: { color: colors.primaryDark, fontWeight: "700", marginTop: 4 },
  warnText: { color: colors.warning, fontWeight: "800", marginTop: 4 },
  okText: { color: colors.primaryDark, fontWeight: "700", marginTop: 4 },
  errorText: {
    color: colors.error, fontWeight: "700", backgroundColor: colors.errorSoft,
    padding: spacing.sm, borderRadius: radius.md,
  },
  proofRow: { flexDirection: "row", gap: spacing.sm },
  proofBtn: {
    flex: 1, alignItems: "center", padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, gap: 4,
  },
  proofDone: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  proofText: { fontSize: fontSize.small, color: colors.textSecondary, fontWeight: "600" },
});
