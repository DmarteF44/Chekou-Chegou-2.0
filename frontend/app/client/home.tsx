import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Order, Promotion } from "@/src/data/mock";
import { orderStore } from "@/src/data/orderStore";
import { StatusPill } from "@/src/components/StatusPill";
import { DemoNotice } from "@/src/components/DemoNotice";
import { authService, User } from "@/src/services/authService";
import { catalogService, getStoreBranch, Store, StoreBranch } from "@/src/services/catalogService";
import { marketingService } from "@/src/services/marketingService";
import { SafeUriImage } from "@/src/components/SafeUriImage";

const CLIENT_BRANCHES: StoreBranch[] = ["Mercado", "Farmácia", "Eletrônicos"];

function iconForStore(branch: StoreBranch): keyof typeof Ionicons.glyphMap {
  if (branch === "Farmácia") return "medical";
  if (branch === "Eletrônicos") return "hardware-chip";
  return "storefront";
}

export default function ClientHome() {
  const router = useRouter();
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [me, setMe] = useState<User | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<StoreBranch>("Mercado");
  const [error, setError] = useState("");

  useEffect(() => {
    const refresh = async () => {
      try {
        const session = await authService.getSession();
        if (!session) {
          router.replace("/auth/login");
          return;
        }
        const all = await orderStore.getAll();
        setActiveOrders(all.filter((o) => o.clientId === session.id && o.status !== "Entregue" && o.status !== "Cancelado"));
        setMe(session);
        setStores((await catalogService.listStores({ activeOnly: true })).filter((store) => store.type !== "em_breve"));
        setPromotions(await marketingService.listPromotions({ activeOnly: true }));
        setError("");
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Dados temporariamente indisponíveis.");
      }
    };
    refresh();
    const a = orderStore.subscribe(refresh);
    const b = catalogService.subscribe(refresh);
    const c = authService.subscribe(refresh);
    const d = marketingService.subscribe(refresh);
    return () => { a(); b(); c(); d(); };
  }, [router]);

  async function logout() {
    await authService.logout();
    router.replace("/auth/login");
  }

  const visibleBranches = CLIENT_BRANCHES.filter((branch) => stores.some((s) => getStoreBranch(s) === branch));
  const branches = visibleBranches.length > 0 ? visibleBranches : CLIENT_BRANCHES;
  const storesByBranch = stores.filter((store) => getStoreBranch(store) === selectedBranch);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.hello}>Olá, {(me?.name ?? "Cliente").split(" ")[0]} 👋</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={14} color={colors.primary} />
              <Text style={styles.location}>Jataí, GO</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={logout}
            style={styles.profileBtn}
            testID="client-logout"
          >
            <Ionicons name="log-out-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.noticeWrap}>
          <DemoNotice />
        </View>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

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
          data={promotions}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.promoCard}
              onPress={() => router.push("/client/promotions")}
              testID={`promo-card-${item.id}`}
            >
              <SafeUriImage uri={item.image} style={styles.promoImg} icon="pricetag-outline" />
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

        {/* Become partner CTA */}
        {me?.driverStatus === "none" && me?.role === "client" && (
          <TouchableOpacity
            style={styles.partnerCta}
            onPress={() => router.push("/driver/partner-signup")}
            testID="client-become-partner"
          >
            <View style={styles.partnerIcon}>
              <Ionicons name="bicycle" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.partnerTitle}>Quero ser parceiro</Text>
              <Text style={styles.partnerSub}>Trabalhe como Motorista Parceiro em Jataí-GO</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* Branches */}
        <Text style={styles.sectionTitle}>Ramos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.branchRow}>
          {branches.map((branch) => (
            <TouchableOpacity
              key={branch}
              style={[styles.branchChip, selectedBranch === branch && styles.branchChipActive]}
              onPress={() => setSelectedBranch(branch)}
              testID={`client-branch-${branch}`}
            >
              <Ionicons name={iconForStore(branch)} size={18} color={selectedBranch === branch ? colors.white : colors.primary} />
              <Text style={[styles.branchText, selectedBranch === branch && { color: colors.white }]}>{branch}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Establishments */}
        <Text style={styles.sectionTitle}>Estabelecimentos de {selectedBranch}</Text>
        <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
          {storesByBranch.map((e) => {
            const branch = getStoreBranch(e);
            const icon = iconForStore(branch);
            return (
            <TouchableOpacity
              key={e.id}
              style={styles.storeCard}
              onPress={() => router.push(`/client/store/${e.id}`)}
              testID={`store-card-${e.id}`}
            >
              <SafeUriImage uri={e.image} style={styles.storeImg} icon={icon} iconSize={24} />
              <View style={{ flex: 1 }}>
                <Text style={styles.storeName} numberOfLines={1}>{e.name}</Text>
                <Text style={styles.storeCat} numberOfLines={2}>{branch} • {e.description}</Text>
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
          );})}
          {storesByBranch.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Nenhum estabelecimento ativo neste ramo.</Text>
            </View>
          ) : null}
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
  noticeWrap: { paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  errorBox: { marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.errorSoft },
  errorText: { color: colors.error, fontSize: fontSize.small, fontWeight: "700" },
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
  promoImgFallback: { width: "100%", height: "100%", backgroundColor: colors.primary },
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

  branchRow: { paddingHorizontal: spacing.md, gap: spacing.sm },
  branchChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  branchChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  branchText: { color: colors.textSecondary, fontSize: fontSize.small, fontWeight: "800" },

  storeCard: {
    backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg,
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  storeImg: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.borderLight },
  storeImgFallback: {
    width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.primarySoft,
    alignItems: "center", justifyContent: "center",
  },
  storeName: { fontSize: fontSize.bodyLarge, fontWeight: "700", color: colors.textPrimary },
  storeCat: { fontSize: fontSize.small, color: colors.textSecondary, marginTop: 2 },
  storeMeta: { flexDirection: "row", gap: spacing.sm, marginTop: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: fontSize.small, color: colors.textSecondary },
  emptyBox: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.small, fontWeight: "700" },

  partnerCta: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    marginHorizontal: spacing.md, marginTop: spacing.md, padding: spacing.md,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary,
    borderStyle: "dashed", backgroundColor: colors.primarySoft,
  },
  partnerIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  partnerTitle: { color: colors.primaryDark, fontWeight: "800", fontSize: fontSize.body },
  partnerSub: { color: colors.textSecondary, fontSize: fontSize.small, marginTop: 2 },
});
