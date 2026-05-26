import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, ScrollView, Alert,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { Button } from "@/src/components/Button";
import { DemoNotice } from "@/src/components/DemoNotice";
import { authService } from "@/src/services/authService";
import { USE_SUPABASE } from "@/src/config/runtime";

export default function Signup() {
  const router = useRouter();
  const { partner } = useLocalSearchParams<{ partner?: string }>();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (name.trim().length < 3 || !email.includes("@") || pw.length < 4) {
      Alert.alert("Atenção", "Preencha todos os campos corretamente.");
      return;
    }
    setLoading(true);
    try {
      const u = await authService.signup({ name, email, phone, password: pw });
      if (!u) {
        Alert.alert("Erro", "Não foi possível cadastrar. Verifique se o e-mail já está em uso.");
        return;
      }
      const session = await authService.getSession();
      if (USE_SUPABASE && !session) {
        Alert.alert("Confirme seu e-mail", "Cadastro criado. Confirme seu e-mail e depois entre para continuar.");
        router.replace("/auth/login");
        return;
      }
      router.replace(partner === "true" ? "/driver/partner-signup" : "/");
    } catch (error) {
      Alert.alert("Erro no cadastro", error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header title="Criar conta" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <DemoNotice />
          <Field label="Nome completo" value={name} onChange={setName} testID="signup-name" />
          <Field label="Telefone / WhatsApp" value={phone} onChange={setPhone} keyboardType="phone-pad" testID="signup-phone" />
          <Field label="E-mail" value={email} onChange={setEmail} keyboardType="email-address" testID="signup-email" />
          <Field label="Senha" value={pw} onChange={setPw} secure testID="signup-password" />
          <Button title="Criar conta" onPress={submit} loading={loading} testID="signup-submit" />
          <Text style={styles.hint}>
            Ao criar conta você aceita os termos de uso do Chekou Chegou. Você poderá solicitar virar Motorista Parceiro depois.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label, value, onChange, keyboardType, secure, testID,
}: { label: string; value: string; onChange: (v: string) => void; keyboardType?: any; secure?: boolean; testID?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
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
  scroll: { padding: spacing.md, gap: spacing.md },
  label: { color: colors.textSecondary, fontWeight: "600", fontSize: fontSize.small },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, fontSize: fontSize.body, color: colors.textPrimary,
    backgroundColor: colors.surface, minHeight: 50,
  },
  hint: { color: colors.textTertiary, fontSize: fontSize.small, lineHeight: 18, textAlign: "center" },
});
