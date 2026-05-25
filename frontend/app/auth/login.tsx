import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Image,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Button } from "@/src/components/Button";
import { DemoNotice } from "@/src/components/DemoNotice";
import { authService } from "@/src/services/authService";
import { USE_SUPABASE } from "@/src/config/runtime";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(nextEmail = email, nextPw = pw) {
    if (!nextEmail.trim() || !nextPw) {
      Alert.alert("Atenção", "Informe e-mail e senha.");
      return;
    }
    setLoading(true);
    try {
      const u = await authService.login(nextEmail, nextPw);
      if (!u) {
        Alert.alert("Login falhou", "E-mail ou senha incorretos.");
        return;
      }
      router.replace("/");
    } catch (error) {
      Alert.alert("Não foi possível entrar", error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (!email.trim()) {
      Alert.alert("Recuperar senha", "Informe seu e-mail primeiro.");
      return;
    }
    try {
      await authService.resetPassword(email);
      Alert.alert("Recuperar senha", "Enviamos as instruções para seu e-mail.");
    } catch (error) {
      Alert.alert("Recuperar senha", error instanceof Error ? error.message : "Não foi possível continuar.");
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Image source={require("../../Logo.png")} style={styles.logo} resizeMode="contain" />
          <Text style={styles.brand}>Chekou Ganhou</Text>
          <Text style={styles.diagLabel}>DIAG v2 • rota login carregada</Text>
          <DemoNotice compact />
          <Text style={styles.tagline}>Peça de mercados, farmácias e lojas locais sem sair de casa.</Text>

          <View style={styles.form}>
            <Text style={styles.formTitle}>{USE_SUPABASE ? "Entrar na sua conta" : "Entrar no modo local"}</Text>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              value={email} onChangeText={setEmail}
              placeholder="seu@email.com" placeholderTextColor={colors.textTertiary}
              autoCapitalize="none" keyboardType="email-address"
              style={styles.input} testID="login-email"
            />
            <Text style={styles.label}>Senha</Text>
            <TextInput
              value={pw} onChangeText={setPw}
              placeholder="••••••" placeholderTextColor={colors.textTertiary}
              secureTextEntry style={styles.input} testID="login-password"
            />
            <Button title="Entrar" onPress={submit} loading={loading} testID="login-submit" />
            <TouchableOpacity onPress={() => router.push("/auth/signup")} style={styles.linkBtn} testID="login-go-signup">
              <Text style={styles.linkText}>Não tem conta? <Text style={styles.linkStrong}>Criar conta</Text></Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={resetPassword}
              style={styles.linkBtn}
              testID="login-forgot-password"
            >
              <Text style={styles.linkStrong}>Esqueci minha senha</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/auth/signup", params: { partner: "true" } })}
              style={styles.partnerBtn}
              testID="login-driver-partner"
            >
              <Text style={styles.partnerText}>Quero ser entregador parceiro</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  logo: {
    width: 92, height: 92, borderRadius: radius.md,
    alignSelf: "center", marginTop: spacing.lg,
  },
  brand: { fontSize: 28, fontWeight: "800", color: colors.textPrimary, textAlign: "center", marginTop: spacing.sm },
  diagLabel: { fontSize: fontSize.small, color: colors.textSecondary, fontWeight: "700", textAlign: "center" },
  tagline: { color: colors.textSecondary, textAlign: "center", marginBottom: spacing.md },
  form: {
    gap: spacing.sm, backgroundColor: colors.background, borderWidth: 1,
    borderColor: colors.borderLight, borderRadius: radius.lg, padding: spacing.md,
  },
  formTitle: { color: colors.textPrimary, fontWeight: "800", fontSize: fontSize.bodyLarge },
  label: { color: colors.textSecondary, fontWeight: "600", fontSize: fontSize.small, marginTop: spacing.sm },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, fontSize: fontSize.body, color: colors.textPrimary,
    backgroundColor: colors.surface, minHeight: 50,
  },
  linkBtn: { alignItems: "center", padding: spacing.sm },
  linkText: { color: colors.textSecondary },
  linkStrong: { color: colors.primary, fontWeight: "700" },
  partnerBtn: { alignItems: "center", padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  partnerText: { color: colors.primaryDark, fontWeight: "800" },
});
