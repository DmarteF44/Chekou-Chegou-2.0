import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Header } from "@/src/components/Header";
import { Button } from "@/src/components/Button";
import { DemoNotice } from "@/src/components/DemoNotice";
import { authService } from "@/src/services/authService";
import { AppSettings, DEFAULT_SETTINGS, settingsService } from "@/src/services/settingsService";
import { colors, fontSize, radius, spacing } from "@/src/theme/colors";

type NumberKey = Exclude<keyof AppSettings, "driverInitialLimitsByLevel">;

const FIELDS: { key: NumberKey; label: string; suffix?: string }[] = [
  { key: "platformFeePercent", label: "Taxa da plataforma", suffix: "%" },
  { key: "platformMinimumFee", label: "Taxa mínima da plataforma", suffix: "R$" },
  { key: "defaultDeliveryFee", label: "Taxa base de entrega padrão", suffix: "R$" },
  { key: "safetyMarginPercent", label: "Margem de segurança", suffix: "%" },
  { key: "minimumSafetyMargin", label: "Margem mínima", suffix: "R$" },
  { key: "actualValueMinTolerancePercent", label: "Tolerância mínima do valor real", suffix: "%" },
  { key: "actualValueMaxTolerancePercent", label: "Tolerância máxima do valor real", suffix: "%" },
  { key: "minimumOrderValue", label: "Valor mínimo de pedido", suffix: "R$" },
];

export default function AdminSettings() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const user = await authService.getSession();
        if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
          router.replace("/auth/login");
          return;
        }
        setSettings(await settingsService.get());
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Não foi possível carregar configurações.");
      }
    })();
  }, [router]);

  function setNumber(key: NumberKey, value: string) {
    const parsed = Number(value.replace(",", "."));
    setSettings((current) => ({ ...current, [key]: Number.isFinite(parsed) ? parsed : 0 }));
  }

  function setLimit(level: string, value: string) {
    const parsed = Number(value.replace(",", "."));
    setSettings((current) => ({
      ...current,
      driverInitialLimitsByLevel: {
        ...current.driverInitialLimitsByLevel,
        [level]: Number.isFinite(parsed) ? parsed : 0,
      },
    }));
  }

  async function save() {
    setSaving(true);
    try {
      setSettings(await settingsService.save(settings));
      setError("");
      Alert.alert("Configurações salvas", "Os próximos pedidos usarão estes valores.");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Tente novamente.";
      setError(message);
      Alert.alert("Não foi possível salvar", message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header title="Configurações" subtitle="Taxas, margens e limites" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <DemoNotice />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.section}>Checkout</Text>
          {FIELDS.map((field) => (
            <NumberField
              key={field.key}
              label={field.label}
              suffix={field.suffix}
              value={String(settings[field.key])}
              onChange={(value) => setNumber(field.key, value)}
              testID={`settings-${field.key}`}
            />
          ))}
          <Text style={styles.section}>Limite inicial por nível de entregador</Text>
          {["1", "2", "3", "4"].map((level) => (
            <NumberField
              key={level}
              label={`Nível ${level}`}
              suffix="R$"
              value={String(settings.driverInitialLimitsByLevel[level])}
              onChange={(value) => setLimit(level, value)}
              testID={`settings-driver-level-${level}`}
            />
          ))}
          <Button title="Salvar configurações" onPress={save} loading={saving} testID="settings-save" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function NumberField({ label, suffix, value, onChange, testID }: {
  label: string;
  suffix?: string;
  value: string;
  onChange: (value: string) => void;
  testID: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        {suffix === "R$" ? <Text style={styles.suffix}>R$</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="numbers-and-punctuation"
          style={styles.input}
          testID={testID}
        />
        {suffix === "%" ? <Text style={styles.suffix}>%</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  section: { color: colors.textPrimary, fontSize: fontSize.h4, fontWeight: "800", marginTop: spacing.xs },
  field: { gap: spacing.xs },
  label: { color: colors.textSecondary, fontSize: fontSize.small, fontWeight: "700" },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    backgroundColor: colors.surface, paddingHorizontal: spacing.md,
  },
  input: { flex: 1, minHeight: 50, color: colors.textPrimary, fontSize: fontSize.bodyLarge },
  suffix: { color: colors.textSecondary, fontWeight: "700" },
  error: { color: colors.error, fontWeight: "700", backgroundColor: colors.errorSoft, padding: spacing.sm, borderRadius: radius.md },
});
