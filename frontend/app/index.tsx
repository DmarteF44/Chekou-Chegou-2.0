import React, { useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
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

  useEffect(() => {
    let cancelled = false;
    let navigated = false;

    const navigateOnce = (route: "/auth/login" | "/admin" | "/driver/home" | "/driver/blocked" | "/driver/pending" | "/client/home") => {
      if (cancelled || navigated) return;
      navigated = true;
      router.replace(route);
    };

    async function bootstrap() {
      try {
        const u = await withTimeout(
          authService.getSession(),
          INDEX_BOOT_TIMEOUT_MS,
          "Tempo limite ao iniciar sessão.",
        );
        if (!u) {
          navigateOnce("/auth/login");
          return;
        }
        if (u.role === "admin" || u.role === "super_admin") {
          navigateOnce("/admin");
          return;
        }
        if (u.role === "driver") {
          if (u.driverStatus === "approved") navigateOnce("/driver/home");
          else if (u.driverStatus === "blocked") navigateOnce("/driver/blocked");
          else navigateOnce("/driver/pending");
          return;
        }
        navigateOnce("/client/home");
      } catch {
        console.warn("[bootstrap] Sessão inicial indisponível no prazo; abrindo login.");
        navigateOnce("/auth/login");
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [router]);

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
});
