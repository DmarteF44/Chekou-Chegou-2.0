import React from "react";
import { View, Text, StyleSheet, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { PROMOTIONS } from "@/src/data/mock";

export default function Promotions() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header title="Promoções" />
      <ScrollView contentContainerStyle={styles.container}>
        {PROMOTIONS.map((p) => (
          <View key={p.id} style={styles.card} testID={`promotion-${p.id}`}>
            {p.image ? <Image source={{ uri: p.image }} style={styles.img} /> : <View style={styles.imgFallback} />}
            <View style={styles.badge}><Text style={styles.badgeText}>{p.discount}</Text></View>
            <View style={styles.body}>
              <Text style={styles.title}>{p.title}</Text>
              <Text style={styles.store}>{p.storeName}</Text>
              <Text style={styles.desc}>{p.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.md },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden",
    borderWidth: 1, borderColor: colors.borderLight,
  },
  img: { width: "100%", height: 160 },
  imgFallback: { width: "100%", height: 160, backgroundColor: colors.primarySoft },
  badge: {
    position: "absolute", top: spacing.sm, right: spacing.sm,
    backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill,
  },
  badgeText: { color: colors.white, fontWeight: "800" },
  body: { padding: spacing.md, gap: 4 },
  title: { fontSize: fontSize.h4, fontWeight: "700", color: colors.textPrimary },
  store: { color: colors.primary, fontWeight: "600", fontSize: fontSize.small },
  desc: { color: colors.textSecondary, fontSize: fontSize.body, marginTop: 2 },
});
