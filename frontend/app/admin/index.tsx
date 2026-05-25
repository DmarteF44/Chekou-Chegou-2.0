import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { Button } from "@/src/components/Button";
import { StatusPill } from "@/src/components/StatusPill";
import { DemoNotice } from "@/src/components/DemoNotice";
import { money } from "@/src/components/FinancialBreakdown";
import { authService, User } from "@/src/services/authService";
import { adminService } from "@/src/services/adminService";
import { orderService } from "@/src/services/orderService";
import { catalogService } from "@/src/services/catalogService";
import { marketingService } from "@/src/services/marketingService";
import { DRIVER_LEVELS } from "@/src/services/driverService";
import { Coupon, Order, ORDER_STATUSES, OrderStatus, Promotion } from "@/src/data/mock";
import { USE_SUPABASE } from "@/src/config/runtime";

const TABS = ["Resumo", "Pedidos", "Motoristas", "Usuários", "Lojas", "Produtos", "Cupons", "Disputas"] as const;
type Tab = typeof TABS[number];

export default function AdminIndex() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>("Resumo");
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [catalogStats, setCatalogStats] = useState({ stores: 0, products: 0 });
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [editingDriver, setEditingDriver] = useState<User | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    (async () => {
      const u = await authService.getSession();
      if (!u || (u.role !== "admin" && u.role !== "super_admin")) {
        Alert.alert("Acesso restrito", "Faça login como admin para acessar.");
        router.replace("/auth/login");
        return;
      }
      setMe(u);
    })();
  }, [router]);

  useEffect(() => {
    const refresh = async () => {
      try {
        const session = await authService.getSession();
        if (!session || (session.role !== "admin" && session.role !== "super_admin")) return;
        setUsers(await authService.getAllUsers());
        setOrders(await orderService.list());
        setStats(await adminService.stats());
        const [stores, products] = await Promise.all([
          catalogService.listStores(),
          catalogService.listProducts(),
        ]);
        setCatalogStats({ stores: stores.length, products: products.length });
        const [nextCoupons, nextPromotions] = await Promise.all([
          marketingService.listCoupons(),
          marketingService.listPromotions(),
        ]);
        setCoupons(nextCoupons);
        setPromotions(nextPromotions);
        setLoadError("");
      } catch (reason) {
        setLoadError(reason instanceof Error ? reason.message : "Dados do Admin temporariamente indisponíveis.");
      }
    };
    refresh();
    const a = authService.subscribe(refresh);
    const b = orderService.subscribe(refresh);
    const c = catalogService.subscribe(refresh);
    const d = marketingService.subscribe(refresh);
    return () => { a(); b(); c(); d(); };
  }, []);

  async function logout() {
    await authService.logout();
    router.replace("/auth/login");
  }

  async function resetOrders() {
    Alert.alert("Apagar pedidos", "Apagar todos os pedidos simulados?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Apagar", style: "destructive", onPress: () => orderService.clearAll() },
    ]);
  }

  function newDriver() {
    setEditingDriver({
      id: `u_driver_${Date.now()}`,
      name: "",
      email: "",
      phone: "",
      password: "123456",
      role: "driver",
      driverStatus: "approved",
      driverLevel: 1,
      operationalLimit: DRIVER_LEVELS[1].limit,
      createdAt: Date.now(),
    });
  }

  async function saveDriver() {
    if (!editingDriver) return;
    if (!editingDriver.name.trim() || !editingDriver.email.includes("@")) {
      Alert.alert("Dados inválidos", "Informe nome e e-mail do entregador.");
      return;
    }
    const users = await authService.getAllUsers();
    const exists = users.find((u) => u.id === editingDriver.id);
    if (exists) {
      await authService.update(editingDriver.id, editingDriver);
    } else {
      if (USE_SUPABASE) {
        Alert.alert("Cadastro real", "No Supabase, o entregador precisa criar a conta pelo app. Depois o Admin aprova e edita o perfil aqui.");
        return;
      }
      const created = await authService.signup({
        name: editingDriver.name,
        email: editingDriver.email,
        phone: editingDriver.phone,
        password: editingDriver.password || "123456",
      });
      if (!created) {
        Alert.alert("E-mail já cadastrado", "Use outro e-mail para este entregador.");
        return;
      }
      await authService.update(created.id, {
        role: "driver",
        driverStatus: editingDriver.driverStatus,
        driverLevel: editingDriver.driverLevel,
        operationalLimit: editingDriver.operationalLimit,
      });
      if (me?.password) {
        await authService.logout();
        await authService.login(me.email, me.password);
      }
    }
    setEditingDriver(null);
  }

  async function removeDriver(user: User) {
    Alert.alert("Remover entregador", `Remover ${user.name}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => authService.remove(user.id),
      },
    ]);
  }

  async function updateOrderStatus(order: Order, status: OrderStatus) {
    await orderService.update(order.id, { status });
  }

  if (!me) return null;

  const drivers = users.filter((u) => u.role === "driver" || u.driverStatus !== "none");
  const clients = users.filter((u) => u.role === "client" && u.driverStatus === "none");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header
        title="Painel Admin"
        subtitle={me.name}
        back={false}
        right={
          <TouchableOpacity onPress={logout} testID="admin-logout">
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
          </TouchableOpacity>
        }
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
            testID={`admin-tab-${t}`}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.body}>
        <DemoNotice />
        {loadError ? <Text style={styles.errorNotice}>{loadError}</Text> : null}
        {tab === "Resumo" && stats && (
          <>
            <View style={styles.statsGrid}>
              <Stat label="Usuários" value={stats.totalUsers} />
              <Stat label="Motoristas" value={stats.totalDrivers} />
              <Stat label="Pendentes" value={stats.pendingDrivers} color={colors.warning} />
              <Stat label="Em andamento" value={stats.ordersInProgress} color={colors.info} />
              <Stat label="Concluídos" value={stats.ordersDone} color={colors.primary} />
              <Stat label="GMV" value={`R$ ${stats.gmv.toFixed(0)}`} color={colors.primary} />
              <Stat label="Lojas" value={catalogStats.stores} color={colors.info} />
              <Stat label="Produtos" value={catalogStats.products} color={colors.info} />
            </View>
          </>
        )}

        {tab === "Pedidos" && (
          <>
            {orders.length === 0 && <Empty text="Nenhum pedido ainda." />}
            {orders.map((o) => (
              <View key={o.id} style={{ gap: spacing.xs }}>
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => router.push(`/client/tracking/${o.id}`)}
                  testID={`admin-order-${o.id}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{o.storeName}</Text>
                    <Text style={styles.muted}>{new Date(o.createdAt).toLocaleString("pt-BR")}</Text>
                    <Text style={styles.muted}>{o.items}</Text>
                    <View style={{ marginTop: 4 }}><StatusPill status={o.status} /></View>
                  </View>
                  <Text style={styles.amount}>{money(o.total)}</Text>
                </TouchableOpacity>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionChips}>
                  {ORDER_STATUSES.map((status) => (
                    <TouchableOpacity key={status} style={styles.actionChip} onPress={() => updateOrderStatus(o, status)} testID={`admin-order-status-${o.id}-${status}`}>
                      <Text style={styles.actionChipText}>{status}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ))}
            {orders.length > 0 && <Button title="Apagar todos os pedidos" variant="ghost" onPress={resetOrders} testID="admin-reset-orders" />}
          </>
        )}

        {tab === "Motoristas" && (
          <>
            <Button title="Adicionar entregador" onPress={newDriver} testID="admin-driver-new" icon={<Ionicons name="add" size={18} color={colors.white} />} />
            {drivers.length === 0 && <Empty text="Nenhum motorista cadastrado." />}
            {drivers.map((u) => {
              const level = (u.driverLevel ?? 1) as 1|2|3|4;
              return (
                <TouchableOpacity
                  key={u.id}
                  style={styles.row}
                  onPress={() => router.push(`/admin/driver/${u.id}`)}
                  testID={`admin-driver-${u.id}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{u.name}</Text>
                    <Text style={styles.muted}>{u.email}</Text>
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 4, alignItems: "center" }}>
                      <DriverStatusBadge status={u.driverStatus} />
                      {u.role === "driver" && (
                        <View style={[styles.levelBadge, { backgroundColor: DRIVER_LEVELS[level].color + "22" }]}>
                          <Text style={[styles.levelBadgeText, { color: DRIVER_LEVELS[level].color }]}>
                            Nível {level}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                  <View style={styles.driverActions}>
                    <TouchableOpacity onPress={() => setEditingDriver(u)} testID={`admin-driver-edit-${u.id}`}>
                      <Ionicons name="create-outline" size={20} color={colors.info} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeDriver(u)} testID={`admin-driver-remove-${u.id}`}>
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {tab === "Usuários" && (
          <>
            {clients.length === 0 && <Empty text="Nenhum cliente cadastrado." />}
            {clients.map((u) => (
              <View key={u.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{u.name}</Text>
                  <Text style={styles.muted}>{u.email} • {u.phone}</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>Cliente</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {tab === "Lojas" && (
          <>
            <Text style={styles.notice}>
              O Chekou Ganhou é uma plataforma independente de compra assistida e entrega.
              Estabelecimentos exibidos como mais pedidos não representam parceria oficial,
              salvo indicação expressa.
            </Text>
            <Card
              title={USE_SUPABASE ? "Catálogo conectado" : "Catálogo local"}
              subtitle={`${catalogStats.stores} estabelecimentos ${USE_SUPABASE ? "no Supabase" : "salvos no AsyncStorage"}`}
              badge={USE_SUPABASE ? "Online" : "Offline"}
            />
            <Button
              title="Gerenciar estabelecimentos"
              onPress={() => router.push("/admin/establishments")}
              testID="admin-go-stores"
              icon={<Ionicons name="storefront" size={18} color={colors.white} />}
            />
          </>
        )}

        {tab === "Produtos" && (
          <>
            <Card title="Produtos locais" subtitle={`${catalogStats.products} itens disponíveis para seleção no cliente`} badge="AsyncStorage" />
            <Button
              title="Gerenciar produtos"
              onPress={() => router.push("/admin/products")}
              testID="admin-go-products"
              icon={<Ionicons name="cube" size={18} color={colors.white} />}
            />
          </>
        )}

        {tab === "Cupons" && (
          <>
            <Card title="Cupons locais" subtitle={`${coupons.length} cupons cadastrados no AsyncStorage`} badge="CRUD" />
            <Card title="Promoções locais" subtitle={`${promotions.length} promoções cadastradas no AsyncStorage`} badge="CRUD" />
            <Button
              title="Gerenciar cupons e promoções"
              onPress={() => router.push("/admin/marketing")}
              testID="admin-go-marketing"
              icon={<Ionicons name="pricetags" size={18} color={colors.white} />}
            />
          </>
        )}

        {tab === "Disputas" && <Empty text="Nenhuma disputa em aberto." />}
      </ScrollView>

      <Modal visible={!!editingDriver} animationType="slide" onRequestClose={() => setEditingDriver(null)}>
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <Header title="Entregador" />
          {editingDriver && (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
                <DriverField label="Nome" value={editingDriver.name} onChange={(v) => setEditingDriver({ ...editingDriver, name: v })} />
                <DriverField label="E-mail" value={editingDriver.email} onChange={(v) => setEditingDriver({ ...editingDriver, email: v })} keyboardType="email-address" />
                <DriverField label="Telefone" value={editingDriver.phone} onChange={(v) => setEditingDriver({ ...editingDriver, phone: v })} keyboardType="phone-pad" />
                {!USE_SUPABASE ? (
                  <DriverField label="Senha" value={editingDriver.password ?? ""} onChange={(v) => setEditingDriver({ ...editingDriver, password: v })} />
                ) : null}
                <DriverField label="Limite operacional" value={String(editingDriver.operationalLimit ?? "")} onChange={(v) => setEditingDriver({ ...editingDriver, operationalLimit: Number(v.replace(",", ".")) || 0 })} keyboardType="numeric" />

                <Text style={styles.muted}>Nível</Text>
                <View style={styles.inlineRow}>
                  {([1, 2, 3, 4] as const).map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[styles.levelBtn, editingDriver.driverLevel === level && styles.levelBtnActive]}
                      onPress={() => setEditingDriver({ ...editingDriver, driverLevel: level, operationalLimit: DRIVER_LEVELS[level].limit })}
                    >
                      <Text style={[styles.levelBtnText, editingDriver.driverLevel === level && { color: colors.white }]}>N{level}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.muted}>Status</Text>
                <View style={styles.inlineRow}>
                  {(["approved", "pending", "blocked"] as const).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.statusBtn, editingDriver.driverStatus === status && styles.levelBtnActive]}
                      onPress={() => setEditingDriver({ ...editingDriver, driverStatus: status })}
                    >
                      <Text style={[styles.levelBtnText, editingDriver.driverStatus === status && { color: colors.white }]}>{status}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Button title="Salvar entregador" onPress={saveDriver} testID="admin-driver-save" />
                <Button title="Cancelar" variant="ghost" onPress={() => setEditingDriver(null)} />
              </ScrollView>
            </KeyboardAvoidingView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Stat({ label, value, color = colors.primary }: { label: string; value: any; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{String(value)}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
function Card({ title, subtitle, badge }: { title: string; subtitle: string; badge?: string }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.muted}>{subtitle}</Text>
      </View>
      {badge && <View style={styles.badge}><Text style={[styles.badgeText, { color: colors.primary }]}>{badge}</Text></View>}
    </View>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="folder-open-outline" size={36} color={colors.textTertiary} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}
function DriverField({ label, value, onChange, keyboardType }: {
  label: string; value: string; onChange: (value: string) => void; keyboardType?: any;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.muted}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        style={styles.input}
        placeholderTextColor={colors.textTertiary}
      />
    </View>
  );
}
function DriverStatusBadge({ status }: { status: User["driverStatus"] }) {
  const cfg: Record<User["driverStatus"], { bg: string; fg: string; label: string }> = {
    none: { bg: colors.borderLight, fg: colors.textSecondary, label: "Sem status" },
    pending: { bg: colors.warningSoft, fg: colors.warning, label: "Pendente" },
    approved: { bg: colors.primarySoft, fg: colors.primary, label: "Aprovado" },
    rejected: { bg: colors.errorSoft, fg: colors.error, label: "Reprovado" },
    blocked: { bg: colors.errorSoft, fg: colors.error, label: "Bloqueado" },
  };
  const c = cfg[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  tabs: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingVertical: spacing.sm },
  tab: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, height: 36 },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textSecondary, fontWeight: "600", fontSize: fontSize.small },
  tabTextActive: { color: colors.white },
  body: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  row: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  title: { color: colors.textPrimary, fontWeight: "700", fontSize: fontSize.bodyLarge },
  muted: { color: colors.textSecondary, fontSize: fontSize.small, marginTop: 2 },
  amount: { color: colors.primary, fontWeight: "800", fontSize: fontSize.bodyLarge },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  badgeText: { fontWeight: "700", fontSize: fontSize.small },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  levelBadgeText: { fontWeight: "700", fontSize: fontSize.small },
  driverActions: { gap: spacing.sm, alignItems: "center" },
  actionChips: { gap: spacing.xs, paddingVertical: spacing.xs },
  actionChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  actionChipText: { color: colors.primary, fontWeight: "700", fontSize: fontSize.small },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.textPrimary, backgroundColor: colors.surface, minHeight: 50 },
  inlineRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  levelBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  levelBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  levelBtnText: { color: colors.textSecondary, fontWeight: "800", fontSize: fontSize.small },
  statusBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  empty: { alignItems: "center", gap: 8, padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight },
  emptyText: { color: colors.textSecondary },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  statCard: { flexBasis: "47%", flexGrow: 1, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, alignItems: "center" },
  statValue: { fontSize: fontSize.h2, fontWeight: "800" },
  statLabel: { color: colors.textSecondary, fontSize: fontSize.small, marginTop: 2 },
  notice: {
    backgroundColor: colors.infoSoft, color: colors.info,
    padding: spacing.md, borderRadius: radius.md, fontSize: fontSize.small, lineHeight: 18,
  },
  errorNotice: {
    backgroundColor: colors.errorSoft, color: colors.error,
    padding: spacing.md, borderRadius: radius.md, fontSize: fontSize.small, fontWeight: "700",
  },
});
