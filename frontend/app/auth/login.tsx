import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Button } from "@/src/components/Button";
import { authService } from "@/src/services/authService";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !pw) {
      Alert.alert("Atenção", "Informe e-mail e senha.");
      return;
    }
    setLoading(true);
    const u = await authService.login(email, pw);
    setLoading(false);
    if (!u) {
      Alert.alert("Login falhou", "E-mail ou senha incorretos.");
      return;
    }
    router.replace("/");
  }

  function fill(e: string, p: string) {
    setEmail(e); setPw(p);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}><Text style={styles.logoText}>CG</Text></View>
          <Text style={styles.brand}>Chekou Ganhou</Text>
          <Text style={styles.tagline}>Peça de mercados, farmácias e lojas locais sem sair de casa.</Text>

          <View style={styles.form}>
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
          </View>

          <View style={styles.demoBox}>
            <View style={styles.demoHeader}>
              <Ionicons name="flask" size={14} color={colors.textSecondary} />
              <Text style={styles.demoTitle}>Contas de demonstração</Text>
            </View>
            <DemoBtn onPress={() => fill("cliente@chekou.com", "123456")} testID="demo-client" label="Cliente" sub="cliente@chekou.com" />
            <DemoBtn onPress={() => fill("entregador@chekou.com", "123456")} testID="demo-driver" label="Entregador aprovado" sub="entregador@chekou.com" />
            <DemoBtn onPress={() => fill("pendente@chekou.com", "123456")} testID="demo-pending" label="Entregador pendente" sub="pendente@chekou.com" />
            <DemoBtn onPress={() => fill("admin@chekou.com", "admin123")} testID="demo-admin" label="Admin" sub="admin@chekou.com" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DemoBtn({ onPress, label, sub, testID }: { onPress: () => void; label: string; sub: string; testID: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.demoBtn} testID={testID}>
      <View style={{ flex: 1 }}>
        <Text style={styles.demoLabel}>{label}</Text>
        <Text style={styles.demoSub}>{sub}</Text>
      </View>
      <Ionicons name="arrow-forward" size={16} color={colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  logo: {
    width: 72, height: 72, borderRadius: 22, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: spacing.lg,
  },
  logoText: { color: colors.white, fontWeight: "800", fontSize: 28 },
  brand: { fontSize: 28, fontWeight: "800", color: colors.textPrimary, textAlign: "center", marginTop: spacing.sm },
  tagline: { color: colors.textSecondary, textAlign: "center", marginBottom: spacing.md },
  form: { gap: spacing.sm },
  label: { color: colors.textSecondary, fontWeight: "600", fontSize: fontSize.small, marginTop: spacing.sm },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, fontSize: fontSize.body, color: colors.textPrimary,
    backgroundColor: colors.surface, minHeight: 50,
  },
  linkBtn: { alignItems: "center", padding: spacing.sm },
  linkText: { color: colors.textSecondary },
  linkStrong: { color: colors.primary, fontWeight: "700" },
  demoBox: {
    marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderLight, gap: spacing.xs,
  },
  demoHeader: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  demoTitle: { color: colors.textSecondary, fontSize: fontSize.small, fontWeight: "700" },
  demoBtn: {
    flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: radius.md, backgroundColor: colors.surface,
  },
  demoLabel: { color: colors.textPrimary, fontWeight: "600", fontSize: fontSize.body },
  demoSub: { color: colors.textTertiary, fontSize: fontSize.small, marginTop: 2 },
});
