import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { Button } from "@/src/components/Button";
import { authService, User } from "@/src/services/authService";
import { driverService } from "@/src/services/driverService";

type Vehicle = "moto" | "carro" | "bicicleta";

export default function PartnerSignup() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle>("moto");
  const [plate, setPlate] = useState("");
  const [cnh, setCnh] = useState("");
  const [region, setRegion] = useState("");
  const [pix, setPix] = useState("");
  const [accept, setAccept] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await authService.getSession();
      if (!u) { router.replace("/auth/login"); return; }
      setMe(u);
      setFullName(u.name);
      setPhone(u.phone);
      setEmail(u.email);
    })();
  }, [router]);

  async function submit() {
    if (!me) return;
    if (fullName.trim().length < 3 || cpf.trim().length < 8 || region.trim().length < 2 || pix.trim().length < 4) {
      Alert.alert("Atenção", "Preencha nome, CPF, região e chave Pix.");
      return;
    }
    if (!accept) {
      Alert.alert("Termos", "Você precisa aceitar os termos.");
      return;
    }
    setLoading(true);
    await driverService.submitApplication({
      userId: me.id,
      fullName, cpf, phone, email,
      vehicleType: vehicle, plate: plate || undefined, cnh: cnh || undefined,
      region, pixKey: pix, acceptedTerms: true, submittedAt: Date.now(),
    });
    setLoading(false);
    router.replace("/driver/pending");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header title="Quero ser parceiro" subtitle="Motorista Parceiro" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.heroBox}>
            <Ionicons name="bicycle" size={26} color={colors.primary} />
            <Text style={styles.heroText}>
              Trabalhe na sua região de Jataí-GO. Após aprovação, você poderá aceitar pedidos disponíveis.
            </Text>
          </View>

          <Field label="Nome completo" value={fullName} onChange={setFullName} testID="partner-name" />
          <Field label="CPF" value={cpf} onChange={setCpf} keyboardType="numeric" testID="partner-cpf" />
          <Field label="Telefone / WhatsApp" value={phone} onChange={setPhone} keyboardType="phone-pad" testID="partner-phone" />
          <Field label="E-mail" value={email} onChange={setEmail} keyboardType="email-address" testID="partner-email" />

          <Text style={styles.label}>Tipo de veículo</Text>
          <View style={styles.vehicleRow}>
            {(["moto", "carro", "bicicleta"] as Vehicle[]).map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.vehicleBtn, vehicle === v && styles.vehicleActive]}
                onPress={() => setVehicle(v)}
                testID={`partner-vehicle-${v}`}
              >
                <Ionicons
                  name={v === "moto" ? "bicycle" : v === "carro" ? "car" : "walk"}
                  size={20}
                  color={vehicle === v ? colors.white : colors.textSecondary}
                />
                <Text style={[styles.vehicleText, vehicle === v && { color: colors.white }]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Field label="Placa (opcional)" value={plate} onChange={setPlate} testID="partner-plate" />
          <Field label="CNH (opcional)" value={cnh} onChange={setCnh} testID="partner-cnh" />
          <Field label="Bairro / região de atuação" value={region} onChange={setRegion} testID="partner-region" />
          <Field label="Chave Pix para recebimento" value={pix} onChange={setPix} testID="partner-pix" />

          <TouchableOpacity style={styles.checkRow} onPress={() => setAccept(!accept)} testID="partner-accept">
            <View style={[styles.check, accept && styles.checkOn]}>
              {accept && <Ionicons name="checkmark" size={14} color={colors.white} />}
            </View>
            <Text style={styles.checkText}>
              Li e aceito os termos de uso e a política de pagamentos do Chekou Chegou.
            </Text>
          </TouchableOpacity>

          <Button title="Enviar para análise" onPress={submit} loading={loading} disabled={!accept} testID="partner-submit" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label, value, onChange, keyboardType, testID,
}: { label: string; value: string; onChange: (v: string) => void; keyboardType?: any; testID?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        keyboardType={keyboardType}
        placeholderTextColor={colors.textTertiary}
        style={styles.input}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  heroBox: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.primarySoft, padding: spacing.md, borderRadius: radius.lg,
  },
  heroText: { flex: 1, color: colors.primaryDark, fontSize: fontSize.body, lineHeight: 20 },
  label: { color: colors.textSecondary, fontWeight: "600", fontSize: fontSize.small },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, fontSize: fontSize.body, color: colors.textPrimary,
    backgroundColor: colors.surface, minHeight: 50,
  },
  vehicleRow: { flexDirection: "row", gap: spacing.sm },
  vehicleBtn: {
    flex: 1, padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, alignItems: "center", gap: 4,
    backgroundColor: colors.surface,
  },
  vehicleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  vehicleText: { color: colors.textSecondary, fontWeight: "600", textTransform: "capitalize" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  check: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: colors.border,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.surface,
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkText: { flex: 1, color: colors.textSecondary, fontSize: fontSize.small, lineHeight: 18 },
});
