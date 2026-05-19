import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { Button } from "@/src/components/Button";
import { catalogService, Product, Store, PRODUCT_CATEGORIES, ProductCategory } from "@/src/services/catalogService";
import { money } from "@/src/components/FinancialBreakdown";

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);

  useEffect(() => {
    const refresh = async () => {
      setProducts(await catalogService.listProducts());
      setStores(await catalogService.listStores());
    };
    refresh();
    return catalogService.subscribe(refresh);
  }, []);

  function newOne() {
    setEditing({
      id: `p_${Date.now()}`, name: "", category: "Mercado",
      storeId: stores[0]?.id ?? "tosta-2",
      price: 0, active: true, confirmInStore: true, imageUrl: "", notes: "",
    });
  }

  async function save() {
    if (!editing) return;
    if (editing.name.trim().length < 2 || editing.price <= 0) {
      Alert.alert("Inválido", "Informe nome e preço estimado.");
      return;
    }
    await catalogService.upsertProduct(editing);
    setEditing(null);
  }

  async function remove(p: Product) {
    Alert.alert("Remover", `Remover ${p.name}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => catalogService.deleteProduct(p.id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header
        title="Produtos"
        right={
          <TouchableOpacity onPress={newOne} testID="admin-product-new">
            <Ionicons name="add-circle" size={26} color={colors.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.intro}>
          Catálogo opcional para produtos comuns e promoções. O pedido manual continua disponível.
        </Text>
        {products.map((p) => {
          const store = stores.find((s) => s.id === p.storeId);
          return (
            <View key={p.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{p.name}</Text>
                <Text style={styles.muted}>{p.category} • {store?.name ?? "—"}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>{money(p.price)}</Text>
                  {p.promoPrice ? <Text style={styles.promo}>promo {money(p.promoPrice)}</Text> : null}
                  {!p.active && <Text style={styles.inactive}>Inativo</Text>}
                </View>
              </View>
              <View style={{ gap: 6 }}>
                <TouchableOpacity onPress={() => setEditing(p)} testID={`admin-product-edit-${p.id}`}>
                  <Ionicons name="create-outline" size={22} color={colors.info} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(p)} testID={`admin-product-delete-${p.id}`}>
                  <Ionicons name="trash-outline" size={22} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
        <Button title="Novo produto" onPress={newOne} testID="admin-product-new-bottom"
          icon={<Ionicons name="add" size={18} color={colors.white} />} />
      </ScrollView>

      <Modal visible={!!editing} animationType="slide" onRequestClose={() => setEditing(null)}>
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <Header title="Produto" />
          {editing && (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <Field label="Nome" value={editing.name} onChange={(v: string) => setEditing({ ...editing, name: v })} testID="product-name" />

                <Text style={styles.label}>Categoria</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.chip, editing.category === c && styles.chipActive]}
                      onPress={() => setEditing({ ...editing, category: c as ProductCategory })}
                      testID={`product-cat-${c}`}
                    >
                      <Text style={[styles.chipText, editing.category === c && { color: colors.white }]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.label}>Estabelecimento</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
                  {stores.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.chip, editing.storeId === s.id && styles.chipActive]}
                      onPress={() => setEditing({ ...editing, storeId: s.id })}
                      testID={`product-store-${s.id}`}
                    >
                      <Text style={[styles.chipText, editing.storeId === s.id && { color: colors.white }]}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Field label="Preço estimado (R$)" value={String(editing.price)} onChange={(v: string) => setEditing({ ...editing, price: Number(v.replace(",", ".")) || 0 })} keyboardType="numeric" testID="product-price" />
                <Field label="Preço promocional (opcional)" value={String(editing.promoPrice ?? "")} onChange={(v: string) => setEditing({ ...editing, promoPrice: v ? Number(v.replace(",", ".")) : undefined })} keyboardType="numeric" testID="product-promo" />
                <Field label="Imagem URL (opcional)" value={editing.imageUrl ?? ""} onChange={(v: string) => setEditing({ ...editing, imageUrl: v })} testID="product-image" />
                <Field label="Observações" value={editing.notes ?? ""} onChange={(v: string) => setEditing({ ...editing, notes: v })} multiline testID="product-notes" />

                <Row label="Ativo" value={editing.active} onToggle={() => setEditing({ ...editing, active: !editing.active })} testID="product-active" />
                <Row label="Sujeito à confirmação no local" value={editing.confirmInStore} onToggle={() => setEditing({ ...editing, confirmInStore: !editing.confirmInStore })} testID="product-confirm" />

                <Button title="Salvar" onPress={save} testID="product-save" />
                <Button title="Cancelar" variant="ghost" onPress={() => setEditing(null)} testID="product-cancel" />
              </ScrollView>
            </KeyboardAvoidingView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, keyboardType, multiline, testID }: any) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChange}
        keyboardType={keyboardType} multiline={multiline}
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, multiline && { minHeight: 80, textAlignVertical: "top" }]}
        testID={testID}
      />
    </View>
  );
}

function Row({ label, value, onToggle, testID }: { label: string; value: boolean; onToggle: () => void; testID: string }) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={onToggle} testID={testID}>
      <View style={[styles.toggle, value && styles.toggleOn]} />
      <Text style={styles.toggleLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  intro: { color: colors.textSecondary, fontSize: fontSize.small },
  card: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, alignItems: "center" },
  title: { fontWeight: "700", color: colors.textPrimary, fontSize: fontSize.bodyLarge },
  muted: { color: colors.textSecondary, fontSize: fontSize.small, marginTop: 2 },
  priceRow: { flexDirection: "row", gap: spacing.sm, marginTop: 4, alignItems: "center" },
  price: { color: colors.primary, fontWeight: "800" },
  promo: { color: colors.warning, fontWeight: "700", fontSize: fontSize.small },
  inactive: { color: colors.error, fontSize: fontSize.small, fontWeight: "700" },
  label: { color: colors.textSecondary, fontWeight: "600", fontSize: fontSize.small },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.textPrimary, backgroundColor: colors.surface, minHeight: 50 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, height: 36 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontWeight: "600", fontSize: fontSize.small },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  toggle: { width: 36, height: 22, borderRadius: 11, backgroundColor: colors.border },
  toggleOn: { backgroundColor: colors.primary },
  toggleLabel: { fontWeight: "700", color: colors.textSecondary },
});
