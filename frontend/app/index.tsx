import React, { useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { useRouter } from "expo-router";
import { colors, fontSize, spacing } from "@/src/theme/colors";
import { authService } from "@/src/services/authService";

// Auth gate / splash router.
// Decides where to land based on session state and user role/driverStatus.
export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const u = await authService.getSession();
      if (!u) {
        router.replace("/auth/login");
        return;
      }
      if (u.role === "admin") {
        router.replace("/admin");
        return;
      }
      if (u.role === "driver") {
        if (u.driverStatus === "approved") router.replace("/driver/home");
        else if (u.driverStatus === "blocked") router.replace("/driver/blocked");
        else router.replace("/driver/pending");
        return;
      }
      router.replace("/client/home");
    })();
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>CG</Text>
      </View>
      <Text style={styles.brand}>Chekou Ganhou</Text>
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
