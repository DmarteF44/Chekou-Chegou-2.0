import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, Image, KeyboardAvoidingView, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { Button } from "@/src/components/Button";
import { catalogService, Store } from "@/src/services/catalogService";

export default function StoreOrder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    const refresh = async () => {
      const s = await catalogService.getStore(id as string);
      setStore(s ?? null);
    };
    refresh();
    return catalogService.subscribe(refresh);
  }, [id]);

  const [items, setItems] = useState("");
  const [notes, setNotes] = useState("");
  const [estimated, setEstimated] = useState("");

  const valid = !!store && items.trim().length > 3 && Number(estimated.replace(",", ".")) > 0;
  const isPharmacy = store?.category?.toLowerCase().includes("farmácia") || store?.id === "farmacia-parceira";

  function next() {
    if (!store) return;
    router.push({
      pathname: "/client/checkout",
      params: {
        storeId: store.id,
        storeName: store.name,
        items,
        notes,
        estimated,
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.storeHeader}>
            <Image source={{ uri: store.image }} style={styles.storeImg} />
            <View style={{ flex: 1 }}>
              <Text style={styles.storeName}>{store.name}</Text>
              <Text style={styles.storeDesc}>{store.description}</Text>
            </View>
          </View>

          {isPharmacy && (
            <View style={styles.pharmacyWarn} testID="pharmacy-warning">
              <Ionicons name="warning" size={18} color={colors.warning} />
              <Text style={styles.pharmacyText}>
                Por segurança, o Chekou Ganhou não realiza compra de medicamentos controlados ou
                produtos que exijam retenção de receita. No MVP, permitimos apenas produtos comuns
                e itens sem receita.
              </Text>
            </View>
          )}

          <Section title="Sua lista de compras" hint="Escreva os produtos desejados (um por linha).">
            <TextInput
              value={items}
              onChangeText={setItems}
              placeholder={"Ex.:\n2kg de arroz tipo 1\n1L de leite integral\n5 tomates"}
              placeholderTextColor={colors.textTertiary}
              multiline
              style={[styles.input, styles.textarea]}
              testID="order-items-input"
            />
          </Section>

          <Section
            title="Observações"
            hint="Marcas preferidas, substituições aceitas, preferências."
          >
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Ex.: prefiro leite Italac. Pode substituir tomate por similar."
              placeholderTextColor={colors.textTertiary}
              multiline
              style={[styles.input, styles.textareaSm]}
              testID="order-notes-input"
            />
          </Section>

          <Section title="Valor estimado da compra" hint="Em reais (R$). Margem de segurança é adicionada automaticamente.">
            <View style={styles.currencyRow}>
              <Text style={styles.currencyPrefix}>R$</Text>
              <TextInput
                value={estimated}
                onChangeText={setEstimated}
                placeholder="0,00"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                style={[styles.input, { flex: 1, marginLeft: spacing.sm }]}
                testID="order-estimated-input"
              />
            </View>
          </Section>

          <View style={styles.tipBox}>
            <Ionicons name="information-circle" size={18} color={colors.info} />
            <Text style={styles.tipText}>
              A margem de segurança protege contra variação de preços. Sobra é devolvida.
            </Text>
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

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
    </View>
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
  storeName: { fontSize: fontSize.bodyLarge, fontWeight: "700", color: colors.textPrimary },
  storeDesc: { fontSize: fontSize.small, color: colors.textSecondary, marginTop: 2 },

  label: { fontSize: fontSize.body, fontWeight: "700", color: colors.textPrimary },
  hint: { fontSize: fontSize.small, color: colors.textTertiary },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    backgroundColor: colors.surface, padding: spacing.md, fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  textarea: { minHeight: 120, textAlignVertical: "top" },
  textareaSm: { minHeight: 80, textAlignVertical: "top" },
  currencyRow: { flexDirection: "row", alignItems: "center" },
  currencyPrefix: { fontSize: fontSize.h4, fontWeight: "700", color: colors.textSecondary },
  tipBox: {
    flexDirection: "row", gap: 8, alignItems: "center",
    backgroundColor: colors.infoSoft, padding: spacing.sm, borderRadius: radius.md,
  },
  tipText: { flex: 1, color: colors.info, fontSize: fontSize.small },
  pharmacyWarn: {
    flexDirection: "row", gap: 8, alignItems: "flex-start",
    backgroundColor: colors.warningSoft, padding: spacing.sm, borderRadius: radius.md,
  },
  pharmacyText: { flex: 1, color: colors.warning, fontSize: fontSize.small, lineHeight: 18 },
});
