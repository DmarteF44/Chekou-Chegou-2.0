import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { colors, fontSize, spacing } from "@/src/theme/colors";
import { AUTH_BOOT_TIMEOUT_MS, authService } from "@/src/services/authService";
import { DemoNotice } from "@/src/components/DemoNotice";
import { withTimeout } from "@/src/utils/withTimeout";

const INDEX_BOOT_TIMEOUT_MS = AUTH_BOOT_TIMEOUT_MS + 1000;

// Auth gate / splash router.
// Decides where to land based on session state and user role/driverStatus.
export default function Index() {
  const router = useRouter();
  const [bootStage, setBootStage] = useState("DIAG v2 • render inicial");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [bootError, setBootError] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let navigated = false;

    setBootStage("DIAG v2 • useEffect iniciado");

    const navigateOnce = (
      route: "/auth/login" | "/admin" | "/driver/home" | "/driver/blocked" | "/driver/pending" | "/client/home",
      destination: string,
    ) => {
      if (cancelled || navigated) return;
      navigated = true;
      setBootStage(`DIAG v2 • navegando para ${destination}`);
      router.replace(route);
    };

    async function bootstrap() {
      setBootStage("DIAG v2 • solicitando sessão");
      try {
        const u = await withTimeout(
          authService.getSession(),
          INDEX_BOOT_TIMEOUT_MS,
          "Tempo limite ao iniciar sessão.",
        );
        if (!u) {
          setBootError("Resultado: sessão resolvida sem usuário");
          navigateOnce("/auth/login", "login");
          return;
        }
        if (u.role === "admin" || u.role === "super_admin") {
          setBootError("Resultado: sessão Admin resolvida");
          navigateOnce("/admin", "admin");
          return;
        }
        if (u.role === "driver") {
          if (u.driverStatus === "approved") navigateOnce("/driver/home", "entregador");
          else if (u.driverStatus === "blocked") navigateOnce("/driver/blocked", "bloqueado");
          else navigateOnce("/driver/pending", "pendente");
          return;
        }
        setBootError("Resultado: sessão Cliente resolvida");
        navigateOnce("/client/home", "cliente");
      } catch (error) {
        const timedOut = error instanceof Error && error.message.toLowerCase().includes("tempo limite");
        setBootError(timedOut ? "Evento: timeout da sessão" : "Evento: erro no bootstrap");
        setBootStage(timedOut ? "DIAG v2 • timeout da sessão" : "DIAG v2 • erro no bootstrap");
        console.warn("[bootstrap] Sessão inicial indisponível no prazo; abrindo login.");
        navigateOnce("/auth/login", "login");
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function enterManually() {
    setBootError("Ação: navegação manual solicitada");
    setBootStage("DIAG v2 • navegando para login (manual)");
    router.replace("/auth/login");
  }

  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>CG</Text>
      </View>
      <Text style={styles.brand}>Chekou Ganhou</Text>
      <View style={{ marginTop: spacing.sm }}>
        <DemoNotice compact />
      </View>
      <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      <View style={styles.diagPanel}>
        <Text style={styles.diagTitle}>{bootStage}</Text>
        <Text style={styles.diagText}>DIAG v2 • {elapsedSeconds}s • modo local forçado</Text>
        {bootError ? <Text style={styles.diagText}>{bootError}</Text> : null}
        {elapsedSeconds >= 3 ? (
          <TouchableOpacity style={styles.escapeButton} onPress={enterManually} testID="diag-enter-manually">
            <Text style={styles.escapeButtonText}>Entrar manualmente</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  logo: {
    width: 84, height: 84, borderRadius: 24, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.md,
  },
  logoText: { color: colors.white, fontWeight: "800", fontSize: 32 },
  brand: { fontSize: fontSize.h2, fontWeight: "800", color: colors.textPrimary },
  diagPanel: { marginTop: spacing.md, alignItems: "center", paddingHorizontal: spacing.md, gap: 6 },
  diagTitle: { fontSize: fontSize.small, fontWeight: "700", color: colors.textPrimary, textAlign: "center" },
  diagText: { fontSize: fontSize.small, color: colors.textSecondary, textAlign: "center" },
  escapeButton: {
    marginTop: spacing.sm, borderRadius: 8, backgroundColor: colors.primary,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  escapeButtonText: { color: colors.white, fontSize: fontSize.small, fontWeight: "700" },
});
