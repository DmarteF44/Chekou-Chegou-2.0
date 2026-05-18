import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize } from "@/src/theme/colors";
import { Button } from "@/src/components/Button";
import { authService } from "@/src/services/authService";

export default function BlockedScreen() {
  const router = useRouter();
  async function logout() {
    await authService.logout();
    router.replace("/auth/login");
  }
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.iconBox}>
          <Ionicons name="lock-closed" size={36} color={colors.error} />
        </View>
        <Text style={styles.title}>Conta bloqueada</Text>
        <Text style={styles.body}>
          Sua conta de Motorista Parceiro foi bloqueada. Entre em contato com o suporte do Chekou Ganhou para mais informações.
        </Text>
        <View style={{ height: spacing.xl }} />
        <Button title="Sair" onPress={logout} variant="secondary" testID="blocked-logout" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  container: { flex: 1, padding: spacing.lg, justifyContent: "center" },
  iconBox: {
    alignSelf: "center", width: 84, height: 84, borderRadius: 42,
    backgroundColor: colors.errorSoft, alignItems: "center", justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: { fontSize: fontSize.h2, fontWeight: "800", color: colors.textPrimary, textAlign: "center" },
  body: { color: colors.textSecondary, fontSize: fontSize.body, lineHeight: 22, textAlign: "center", marginTop: spacing.md },
});
