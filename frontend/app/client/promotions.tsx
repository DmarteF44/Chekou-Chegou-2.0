import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { SafeUriImage } from "@/src/components/SafeUriImage";
import { Header } from "@/src/components/Header";
import { DemoNotice } from "@/src/components/DemoNotice";
import { Promotion } from "@/src/data/mock";
import { marketingService } from "@/src/services/marketingService";

export default function Promotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    const refresh = async () => setPromotions(await marketingService.listPromotions({ activeOnly: true }));
    refresh();
    return marketingService.subscribe(refresh);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header title="Promoções" />
      <ScrollView contentContainerStyle={styles.container}>
        <DemoNotice />
        {promotions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.desc}>Nenhuma promoção ativa no momento.</Text>
          </View>
        ) : promotions.map((p) => (
          <View key={p.id} style={styles.card} testID={`promotion-${p.id}`}>
            <SafeUriImage uri={p.image} style={styles.img} icon="pricetag-outline" />
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
  empty: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
});
