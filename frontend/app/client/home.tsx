import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { ESTABLISHMENTS, PROMOTIONS, DEFAULT_CLIENT_NAME, Order } from "@/src/data/mock";
import { orderStore } from "@/src/data/orderStore";
import { StatusPill } from "@/src/components/StatusPill";

export default function ClientHome() {
  const router = useRouter();
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);

  useEffect(() => {
    const refresh = async () => {
      const all = await orderStore.getAll();
      setActiveOrders(all.filter((o) => o.status !== "Entregue"));
    };
    refresh();
    return orderStore.subscribe(refresh);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.hello}>Olá, {DEFAULT_CLIENT_NAME.split(" ")[0]} 👋</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={14} color={colors.primary} />
              <Text style={styles.location}>Jataí, GO</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/")}
            style={styles.profileBtn}
            testID="client-back-to-roles"
          >
            <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Active order banner */}
        {activeOrders.length > 0 && (
          <TouchableOpacity
            style={styles.activeBanner}
            onPress={() => router.push(`/client/tracking/${activeOrders[0].id}`)}
            testID="client-active-order-banner"
          >
            <View style={styles.activeIconWrap}>
              <Ionicons name="bicycle" size={22} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeTitle}>Pedido em andamento</Text>
              <Text style={styles.activeSubtitle}>{activeOrders[0].storeName}</Text>
              <View style={{ marginTop: 6 }}>
                <StatusPill status={activeOrders[0].status} />
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.white} />
          </TouchableOpacity>
        )}

        {/* Promo banner */}
        <Text style={styles.sectionTitle}>Promoções</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={PROMOTIONS}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.promoCard}
              onPress={() => router.push("/client/promotions")}
              testID={`promo-card-${item.id}`}
            >
              <Image source={{ uri: item.image }} style={styles.promoImg} />
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{item.discount}</Text>
              </View>
              <View style={styles.promoOverlay} />
              <View style={styles.promoText}>
                <Text style={styles.promoTitle}>{item.title}</Text>
                <Text style={styles.promoStore}>{item.storeName}</Text>
              </View>
            </TouchableOpacity>
          )}
        />

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <QuickAction icon="pricetag" label="Cupons" onPress={() => router.push("/client/coupons")} testID="qa-coupons" />
          <QuickAction icon="time" label="Histórico" onPress={() => router.push("/client/history")} testID="qa-history" />
          <QuickAction icon="megaphone" label="Promoções" onPress={() => router.push("/client/promotions")} testID="qa-promos" />
        </View>

        {/* Establishments */}
        <Text style={styles.sectionTitle}>Estabelecimentos</Text>
        <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
          {ESTABLISHMENTS.map((e) => (
            <TouchableOpacity
              key={e.id}
              style={styles.storeCard}
              onPress={() => router.push(`/client/store/${e.id}`)}
              testID={`store-card-${e.id}`}
            >
              <Image source={{ uri: e.image }} style={styles.storeImg} />
              <View style={{ flex: 1 }}>
                <Text style={styles.storeName}>{e.name}</Text>
                <Text style={styles.storeCat}>{e.category}</Text>
                <View style={styles.storeMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                    <Text style={styles.metaText}>{e.deliveryTime}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="star" size={12} color={colors.warning} />
                    <Text style={styles.metaText}>{e.rating}</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({
  icon, label, onPress, testID,
}: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; testID: string }) {
  return (
    <TouchableOpacity style={styles.quickItem} onPress={onPress} testID={testID}>
      <View style={styles.quickIcon}><Ionicons name={icon} size={20} color={colors.primary} /></View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  hello: { fontSize: fontSize.h3, fontWeight: "700", color: colors.textPrimary },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  location: { fontSize: fontSize.small, color: colors.textSecondary },
  profileBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft,
    alignItems: "center", justifyContent: "center",
  },
  activeBanner: {
    marginHorizontal: spacing.md, padding: spacing.md, borderRadius: radius.lg,
    backgroundColor: colors.primary, flexDirection: "row", alignItems: "center",
    gap: spacing.sm, marginBottom: spacing.md,
  },
  activeIconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  activeTitle: { color: colors.white, fontWeight: "700", fontSize: fontSize.bodyLarge },
  activeSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: fontSize.small, marginTop: 2 },

  sectionTitle: {
    fontSize: fontSize.h4, fontWeight: "700", color: colors.textPrimary,
    marginHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  promoCard: {
    width: 280, height: 140, borderRadius: radius.lg, overflow: "hidden",
    backgroundColor: colors.surface, position: "relative",
  },
  promoImg: { width: "100%", height: "100%" },
  promoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  promoText: { position: "absolute", bottom: spacing.sm, left: spacing.sm, right: spacing.sm },
  promoTitle: { color: colors.white, fontWeight: "700", fontSize: fontSize.bodyLarge },
  promoStore: { color: "rgba(255,255,255,0.85)", fontSize: fontSize.small, marginTop: 2 },
  discountBadge: {
    position: "absolute", top: spacing.sm, right: spacing.sm,
    backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill,
  },
  discountText: { color: colors.white, fontWeight: "800", fontSize: fontSize.small },

  quickRow: {
    flexDirection: "row", justifyContent: "space-around",
    backgroundColor: colors.surface, marginHorizontal: spacing.md, marginTop: spacing.md,
    paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight,
  },
  quickItem: { alignItems: "center", gap: 6 },
  quickIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft,
    alignItems: "center", justifyContent: "center",
  },
  quickLabel: { fontSize: fontSize.small, color: colors.textSecondary, fontWeight: "600" },

  storeCard: {
    backgroundColor: colors.surface, padding: spacing.sm, borderRadius: radius.lg,
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  storeImg: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.borderLight },
  storeName: { fontSize: fontSize.bodyLarge, fontWeight: "700", color: colors.textPrimary },
  storeCat: { fontSize: fontSize.small, color: colors.textSecondary, marginTop: 2 },
  storeMeta: { flexDirection: "row", gap: spacing.sm, marginTop: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: fontSize.small, color: colors.textSecondary },
});
