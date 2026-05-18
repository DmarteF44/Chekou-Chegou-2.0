import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { COUPONS } from "@/src/data/mock";

export default function Coupons() {
  function copy(code: string) {
    Alert.alert("Cupom selecionado!", `Use o código ${code} no checkout do seu pedido.`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header title="Cupons" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.intro}>Toque em um cupom para copiar e usar no seu próximo pedido.</Text>
        {COUPONS.map((c) => (
          <TouchableOpacity
            key={c.code}
            style={styles.card}
            onPress={() => copy(c.code)}
            testID={`coupon-${c.code}`}
          >
            <View style={styles.iconWrap}>
              <Ionicons name="pricetag" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.code}>{c.code}</Text>
              <Text style={styles.desc}>{c.description}</Text>
            </View>
            <Ionicons name="copy-outline" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.sm },
  intro: { color: colors.textSecondary, fontSize: fontSize.body, marginBottom: spacing.xs },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.borderLight, flexDirection: "row", alignItems: "center", gap: spacing.sm,
    borderStyle: "dashed",
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft,
    alignItems: "center", justifyContent: "center",
  },
  code: { fontSize: fontSize.bodyLarge, fontWeight: "800", color: colors.textPrimary, letterSpacing: 0.5 },
  desc: { fontSize: fontSize.small, color: colors.textSecondary, marginTop: 2 },
});
