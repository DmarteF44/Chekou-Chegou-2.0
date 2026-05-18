import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, Image, KeyboardAvoidingView, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { Button } from "@/src/components/Button";
import { ESTABLISHMENTS } from "@/src/data/mock";

export default function StoreOrder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const store = ESTABLISHMENTS.find((e) => e.id === id) ?? ESTABLISHMENTS[0];

  const [items, setItems] = useState("");
  const [notes, setNotes] = useState("");
  const [estimated, setEstimated] = useState("");

  const valid = items.trim().length > 3 && Number(estimated.replace(",", ".")) > 0;

  function next() {
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
});
