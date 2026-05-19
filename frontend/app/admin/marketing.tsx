import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "@/src/components/Header";
import { Button } from "@/src/components/Button";
import { DemoNotice } from "@/src/components/DemoNotice";
import { Coupon, Promotion } from "@/src/data/mock";
import { marketingService } from "@/src/services/marketingService";
import { authService } from "@/src/services/authService";
import { colors, fontSize, radius, spacing } from "@/src/theme/colors";

type Editing =
  | { kind: "coupon"; value: Coupon }
  | { kind: "promotion"; value: Promotion }
  | null;

const EMPTY_COUPON: Coupon = {
  code: "",
  description: "",
  discount: 0,
  type: "order",
  active: true,
};

const EMPTY_PROMOTION: Promotion = {
  id: "",
  title: "",
  storeName: "",
  description: "",
  image: "",
  discount: "",
  active: true,
};

export default function AdminMarketing() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [editing, setEditing] = useState<Editing>(null);

  useEffect(() => {
    const refresh = async () => {
      const session = await authService.getSession();
      if (!session || (session.role !== "admin" && session.role !== "super_admin")) {
        router.replace("/auth/login");
        return;
      }
      setCoupons(await marketingService.listCoupons());
      setPromotions(await marketingService.listPromotions());
    };
    refresh();
    return marketingService.subscribe(refresh);
  }, [router]);

  function newCoupon() {
    setEditing({ kind: "coupon", value: { ...EMPTY_COUPON, code: `CUPOM${Date.now().toString().slice(-4)}` } });
  }

  function newPromotion() {
    setEditing({ kind: "promotion", value: { ...EMPTY_PROMOTION, id: `promo_${Date.now()}` } });
  }

  async function save() {
    if (!editing) return;
    if (editing.kind === "coupon") {
      const coupon = editing.value;
      if (coupon.code.trim().length < 3 || coupon.description.trim().length < 3 || coupon.discount <= 0) {
        Alert.alert("Dados inválidos", "Informe código, descrição e desconto.");
        return;
      }
      await marketingService.upsertCoupon(coupon);
    } else {
      const promotion = editing.value;
      if (promotion.title.trim().length < 3 || promotion.storeName.trim().length < 3) {
        Alert.alert("Dados inválidos", "Informe título e estabelecimento.");
        return;
      }
      await marketingService.upsertPromotion(promotion);
    }
    setEditing(null);
  }

  function removeCoupon(coupon: Coupon) {
    Alert.alert("Remover cupom", `Remover ${coupon.code}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => marketingService.deleteCoupon(coupon.code) },
    ]);
  }

  function removePromotion(promotion: Promotion) {
    Alert.alert("Remover promoção", `Remover ${promotion.title}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => marketingService.deletePromotion(promotion.id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header title="Cupons e Promoções" />
      <ScrollView contentContainerStyle={styles.container}>
        <DemoNotice />

        <SectionHeader title="Cupons" onAdd={newCoupon} testID="marketing-new-coupon" />
        {coupons.length === 0 ? <Empty text="Nenhum cupom cadastrado." /> : coupons.map((coupon) => (
          <View key={coupon.code} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{coupon.code}</Text>
              <Text style={styles.muted}>{coupon.description}</Text>
              <Text style={styles.meta}>{coupon.type === "delivery" ? "Entrega" : "Pedido"} • R$ {coupon.discount.toFixed(2).replace(".", ",")} • {coupon.active === false ? "Inativo" : "Ativo"}</Text>
            </View>
            <IconButton icon="create-outline" color={colors.info} onPress={() => setEditing({ kind: "coupon", value: coupon })} testID={`coupon-edit-${coupon.code}`} />
            <IconButton icon="trash-outline" color={colors.error} onPress={() => removeCoupon(coupon)} testID={`coupon-delete-${coupon.code}`} />
          </View>
        ))}

        <SectionHeader title="Promoções" onAdd={newPromotion} testID="marketing-new-promotion" />
        {promotions.length === 0 ? <Empty text="Nenhuma promoção cadastrada." /> : promotions.map((promotion) => (
          <View key={promotion.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{promotion.title}</Text>
              <Text style={styles.muted}>{promotion.storeName}</Text>
              <Text style={styles.meta}>{promotion.discount || "Sem selo"} • {promotion.active === false ? "Inativa" : "Ativa"}</Text>
            </View>
            <IconButton icon="create-outline" color={colors.info} onPress={() => setEditing({ kind: "promotion", value: promotion })} testID={`promotion-edit-${promotion.id}`} />
            <IconButton icon="trash-outline" color={colors.error} onPress={() => removePromotion(promotion)} testID={`promotion-delete-${promotion.id}`} />
          </View>
        ))}
      </ScrollView>

      <Modal visible={!!editing} animationType="slide" onRequestClose={() => setEditing(null)}>
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <Header title={editing?.kind === "coupon" ? "Cupom" : "Promoção"} />
          {editing && (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                {editing.kind === "coupon" ? (
                  <>
                    <Field label="Código" value={editing.value.code} onChange={(code) => setEditing({ kind: "coupon", value: { ...editing.value, code } })} testID="coupon-code" />
                    <Field label="Descrição" value={editing.value.description} onChange={(description) => setEditing({ kind: "coupon", value: { ...editing.value, description } })} testID="coupon-description" />
                    <Field label="Desconto (R$)" value={String(editing.value.discount)} onChange={(discount) => setEditing({ kind: "coupon", value: { ...editing.value, discount: Number(discount.replace(",", ".")) || 0 } })} keyboardType="numeric" testID="coupon-discount" />
                    <Text style={styles.label}>Tipo</Text>
                    <View style={styles.inlineRow}>
                      {(["order", "delivery"] as const).map((type) => (
                        <TouchableOpacity key={type} style={[styles.chip, editing.value.type === type && styles.chipActive]} onPress={() => setEditing({ kind: "coupon", value: { ...editing.value, type } })}>
                          <Text style={[styles.chipText, editing.value.type === type && { color: colors.white }]}>{type === "order" ? "Pedido" : "Entrega"}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Toggle label={editing.value.active === false ? "Inativo" : "Ativo"} value={editing.value.active !== false} onPress={() => setEditing({ kind: "coupon", value: { ...editing.value, active: editing.value.active === false } })} />
                  </>
                ) : (
                  <>
                    <Field label="Título" value={editing.value.title} onChange={(title) => setEditing({ kind: "promotion", value: { ...editing.value, title } })} testID="promotion-title" />
                    <Field label="Estabelecimento" value={editing.value.storeName} onChange={(storeName) => setEditing({ kind: "promotion", value: { ...editing.value, storeName } })} testID="promotion-store" />
                    <Field label="Descrição" value={editing.value.description} onChange={(description) => setEditing({ kind: "promotion", value: { ...editing.value, description } })} multiline testID="promotion-description" />
                    <Field label="Selo/desconto" value={editing.value.discount} onChange={(discount) => setEditing({ kind: "promotion", value: { ...editing.value, discount } })} testID="promotion-discount" />
                    <Field label="Imagem URL opcional" value={editing.value.image} onChange={(image) => setEditing({ kind: "promotion", value: { ...editing.value, image } })} testID="promotion-image" />
                    <Toggle label={editing.value.active === false ? "Inativa" : "Ativa"} value={editing.value.active !== false} onPress={() => setEditing({ kind: "promotion", value: { ...editing.value, active: editing.value.active === false } })} />
                  </>
                )}
                <Button title="Salvar" onPress={save} testID="marketing-save" />
                <Button title="Cancelar" variant="ghost" onPress={() => setEditing(null)} testID="marketing-cancel" />
              </ScrollView>
            </KeyboardAvoidingView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function SectionHeader({ title, onAdd, testID }: { title: string; onAdd: () => void; testID: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity onPress={onAdd} testID={testID}>
        <Ionicons name="add-circle" size={26} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

function IconButton({ icon, color, onPress, testID }: { icon: keyof typeof Ionicons.glyphMap; color: string; onPress: () => void; testID: string }) {
  return (
    <TouchableOpacity onPress={onPress} testID={testID} style={styles.iconBtn}>
      <Ionicons name={icon} size={21} color={color} />
    </TouchableOpacity>
  );
}

function Field({ label, value, onChange, keyboardType, multiline, testID }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  keyboardType?: "default" | "numeric";
  multiline?: boolean;
  testID?: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, multiline && styles.textarea]}
        testID={testID}
      />
    </View>
  );
}

function Toggle({ label, value, onPress }: { label: string; value: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={onPress}>
      <View style={[styles.toggle, value && styles.toggleOn]} />
      <Text style={styles.toggleLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.muted}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: colors.textPrimary, fontWeight: "800", fontSize: fontSize.h4 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  title: { color: colors.textPrimary, fontSize: fontSize.bodyLarge, fontWeight: "800" },
  muted: { color: colors.textSecondary, fontSize: fontSize.small, marginTop: 2 },
  meta: { color: colors.primary, fontSize: fontSize.small, fontWeight: "700", marginTop: 4 },
  iconBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  label: { color: colors.textSecondary, fontWeight: "700", fontSize: fontSize.small },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    padding: spacing.md,
  },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  inlineRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontWeight: "800", fontSize: fontSize.small },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  toggle: { width: 36, height: 22, borderRadius: 11, backgroundColor: colors.border },
  toggleOn: { backgroundColor: colors.primary },
  toggleLabel: { color: colors.textSecondary, fontWeight: "800" },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
});
