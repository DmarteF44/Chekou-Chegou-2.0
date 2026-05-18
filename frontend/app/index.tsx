import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Button } from "@/src/components/Button";

export default function Index() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroWrap}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1542838132-92c53300491e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMGZvb2QlMjBncm9jZXJpZXN8ZW58MHx8fHwxNzc5MTEwNTMxfDA&ixlib=rb-4.1.0&q=85",
            }}
            style={styles.hero}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />
          <View style={styles.logoBadge}>
            <Ionicons name="bag-handle" size={28} color={colors.white} />
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.brand}>Chekou Ganhou</Text>
          <Text style={styles.tagline}>
            Peça de mercados, farmácias e lojas locais sem sair de casa.
          </Text>

          <View style={styles.featureRow}>
            <Feature icon="flash" label="Ágil" />
            <Feature icon="shield-checkmark" label="Seguro" />
            <Feature icon="cash" label="Econômico" />
          </View>

          <View style={styles.actions}>
            <Button
              title="Entrar como Cliente"
              onPress={() => router.push("/client/home")}
              testID="role-client-button"
              icon={<Ionicons name="person" size={20} color={colors.white} />}
            />
            <Button
              title="Entrar como Entregador"
              variant="secondary"
              onPress={() => router.push("/driver/home")}
              testID="role-driver-button"
              icon={<Ionicons name="bicycle" size={20} color={colors.primary} />}
            />
          </View>

          <TouchableOpacity
            style={styles.adminBtn}
            onLongPress={() => router.push("/admin")}
            delayLongPress={800}
            testID="admin-hidden-button"
          >
            <Text style={styles.adminHint}>Jataí • Goiás</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Feature({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1 },
  heroWrap: { width: "100%", height: 260, position: "relative" },
  hero: { width: "100%", height: "100%" },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,150,105,0.35)",
  },
  logoBadge: {
    position: "absolute",
    bottom: -28,
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.white,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  body: {
    paddingTop: spacing.xl + 16,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  brand: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: fontSize.bodyLarge,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  featureRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  feature: { alignItems: "center", gap: 6 },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: { fontSize: fontSize.small, color: colors.textSecondary, fontWeight: "600" },
  actions: { gap: spacing.sm },
  adminBtn: { marginTop: spacing.xl, alignItems: "center", padding: spacing.sm },
  adminHint: { fontSize: fontSize.small, color: colors.textTertiary },
});
