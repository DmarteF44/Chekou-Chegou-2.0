import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Button } from "@/src/components/Button";
import { authService, User } from "@/src/services/authService";
import { driverService, DriverApplication } from "@/src/services/driverService";

export default function PendingScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [app, setApp] = useState<DriverApplication | null>(null);

  useEffect(() => {
    (async () => {
      const u = await authService.getSession();
      setUser(u);
      if (u) setApp((await driverService.getApplication(u.id)) ?? null);
    })();
    return authService.subscribe(async () => {
      const u = await authService.getSession();
      setUser(u);
      if (u && u.driverStatus === "approved") router.replace("/driver/home");
    });
  }, [router]);

  async function logout() {
    await authService.logout();
    router.replace("/auth/login");
  }

  const dateStr = app ? new Date(app.submittedAt).toLocaleString("pt-BR") : "—";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.iconBox}>
          <Ionicons name="hourglass" size={36} color={colors.primary} />
        </View>
        <Text style={styles.title}>Cadastro em análise</Text>
        <Text style={styles.body}>
          Recebemos sua solicitação para ser Motorista Parceiro do Chekou Ganhou.{"\n\n"}
          Assim que seu cadastro for aprovado, você poderá receber pedidos disponíveis em Jataí-GO.
        </Text>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status</Text>
            <View style={styles.statusPill}><Text style={styles.statusPillText}>Em análise</Text></View>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Solicitação</Text>
            <Text style={styles.statusValue}>{dateStr}</Text>
          </View>
          {user && (
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Solicitante</Text>
              <Text style={styles.statusValue}>{user.name}</Text>
            </View>
          )}
        </View>

        <View style={{ height: spacing.lg }} />
        <Button title="Voltar" variant="secondary" onPress={() => router.replace("/")} testID="pending-back" />
        <View style={{ height: spacing.sm }} />
        <Button title="Sair" variant="ghost" onPress={logout} testID="pending-logout" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  container: { flex: 1, padding: spacing.lg, justifyContent: "center" },
  iconBox: {
    alignSelf: "center", width: 84, height: 84, borderRadius: 42,
    backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: { fontSize: fontSize.h2, fontWeight: "800", color: colors.textPrimary, textAlign: "center" },
  body: { color: colors.textSecondary, fontSize: fontSize.body, lineHeight: 22, textAlign: "center", marginTop: spacing.md },
  statusCard: {
    marginTop: spacing.xl, padding: spacing.md, borderRadius: radius.lg,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderLight, gap: spacing.sm,
  },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusLabel: { color: colors.textSecondary, fontWeight: "600" },
  statusValue: { color: colors.textPrimary, fontWeight: "700" },
  statusPill: {
    backgroundColor: colors.warningSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill,
  },
  statusPillText: { color: colors.warning, fontWeight: "700", fontSize: fontSize.small },
});
