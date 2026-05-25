import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { Button } from "@/src/components/Button";
import { DemoNotice } from "@/src/components/DemoNotice";
import {
  catalogService, Product, Store, ProductCategory, StoreBranch, STORE_BRANCHES,
  categoriesForBranch, getStoreBranch,
} from "@/src/services/catalogService";
import { authService } from "@/src/services/authService";
import { money } from "@/src/components/FinancialBreakdown";
import { pickImageFromGallery, uploadProductImage } from "@/src/services/imageUploadService";
import { SafeUriImage } from "@/src/components/SafeUriImage";

type FilterValue = "Todos";

export default function AdminProducts() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [storeFilter, setStoreFilter] = useState<FilterValue | string>("Todos");
  const [branchFilter, setBranchFilter] = useState<FilterValue | StoreBranch>("Todos");
  const [categoryFilter, setCategoryFilter] = useState<FilterValue | ProductCategory>("Todos");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const refresh = async () => {
      try {
        const session = await authService.getSession();
        if (!session || (session.role !== "admin" && session.role !== "super_admin")) {
          router.replace("/auth/login");
          return;
        }
        setProducts(await catalogService.listProducts());
        setStores(await catalogService.listStores());
        setLoadError("");
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Não foi possível carregar produtos.");
      }
    };
    refresh();
    return catalogService.subscribe(refresh);
  }, [router]);

  function newOne() {
    const store = stores[0];
    const branch = getStoreBranch(store);
    setEditing({
      id: `p_${Date.now()}`, name: "", category: categoriesForBranch(branch)[0],
      storeId: store?.id ?? "",
      price: 0, active: true, confirmInStore: true, imageUrl: "", notes: "",
    });
  }

  async function save() {
    if (!editing) return;
    if (editing.name.trim().length < 2) {
      Alert.alert("Produto inválido", "Informe o nome do produto.");
      return;
    }
    if (!editing.storeId) {
      Alert.alert("Estabelecimento obrigatório", "Escolha um estabelecimento para o produto.");
      return;
    }
    if (editing.price < 0 || (editing.promoPrice ?? 0) < 0) {
      Alert.alert("Preço inválido", "O preço não pode ser negativo.");
      return;
    }
    if (editing.promoPrice !== undefined && editing.promoPrice > editing.price) {
      Alert.alert("Preço promocional inválido", "O preço promocional não pode superar o preço estimado.");
      return;
    }
    setSaving(true);
    try {
      const rawImage = editing.imageUrl?.trim() ?? "";
      const imageUrl = rawImage && !/^https?:\/\//i.test(rawImage)
        ? await uploadProductImage(editing.id, rawImage)
        : rawImage;
      await catalogService.upsertProduct({
        ...editing,
        name: editing.name.trim(),
        imageUrl: imageUrl || undefined,
        notes: editing.notes?.trim(),
      });
      setEditing(null);
    } catch (error) {
      Alert.alert("Não foi possível salvar", error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  function remove(p: Product) {
    Alert.alert("Remover", `Remover ${p.name}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover", style: "destructive", onPress: async () => {
          try {
            await catalogService.deleteProduct(p.id);
          } catch (error) {
            Alert.alert("Não foi possível remover", error instanceof Error ? error.message : "Tente novamente.");
          }
        },
      },
    ]);
  }

  const visibleProducts = products.filter((product) => {
    const store = stores.find((s) => s.id === product.storeId);
    const branch = getStoreBranch(store);
    if (storeFilter !== "Todos" && product.storeId !== storeFilter) return false;
    if (branchFilter !== "Todos" && branch !== branchFilter) return false;
    if (categoryFilter !== "Todos" && product.category !== categoryFilter) return false;
    return true;
  });

  const selectedStore = editing ? stores.find((s) => s.id === editing.storeId) : undefined;
  const selectedBranch = getStoreBranch(selectedStore);
  const selectedCategories = categoriesForBranch(selectedBranch);
  const filterCategories = branchFilter === "Todos"
    ? Array.from(new Set(stores.flatMap((s) => categoriesForBranch(getStoreBranch(s)))))
    : categoriesForBranch(branchFilter);

  function updateEditingStore(storeId: string) {
    const store = stores.find((s) => s.id === storeId);
    const nextBranch = getStoreBranch(store);
    setEditing((current) => current ? {
      ...current,
      storeId,
      category: categoriesForBranch(nextBranch)[0],
    } : current);
  }

  async function selectImage() {
    try {
      const image = await pickImageFromGallery();
      if (image) setEditing((current) => current ? { ...current, imageUrl: image.uri } : current);
    } catch (error) {
      Alert.alert("Imagem não selecionada", error instanceof Error ? error.message : "Tente novamente.");
    }
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
        <DemoNotice />
        <Text style={styles.intro}>
          Somente produtos ativos deste catálogo ficam disponíveis para compra pelo cliente.
        </Text>
        {loadError ? <Text style={styles.errorNotice}>{loadError}</Text> : null}
        <Text style={styles.label}>Filtrar por estabelecimento</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
          {["Todos", ...stores.map((s) => s.id)].map((storeId) => {
            const label = storeId === "Todos" ? "Todos" : stores.find((s) => s.id === storeId)?.name ?? storeId;
            return (
              <TouchableOpacity
                key={storeId}
                style={[styles.chip, storeFilter === storeId && styles.chipActive]}
                onPress={() => setStoreFilter(storeId)}
                testID={`product-filter-store-${storeId}`}
              >
                <Text style={[styles.chipText, storeFilter === storeId && { color: colors.white }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>Filtrar por ramo</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
          {(["Todos", ...STORE_BRANCHES] as const).map((branch) => (
            <TouchableOpacity
              key={branch}
              style={[styles.chip, branchFilter === branch && styles.chipActive]}
              onPress={() => {
                setBranchFilter(branch);
                setCategoryFilter("Todos");
              }}
              testID={`product-filter-branch-${branch}`}
            >
              <Text style={[styles.chipText, branchFilter === branch && { color: colors.white }]}>{branch}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Filtrar por categoria</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
          {(["Todos", ...filterCategories] as const).map((category) => (
            <TouchableOpacity
              key={category}
              style={[styles.chip, categoryFilter === category && styles.chipActive]}
              onPress={() => setCategoryFilter(category)}
              testID={`product-filter-category-${category}`}
            >
              <Text style={[styles.chipText, categoryFilter === category && { color: colors.white }]}>{category}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {visibleProducts.map((p) => {
          const store = stores.find((s) => s.id === p.storeId);
          const branch = getStoreBranch(store);
          return (
            <View key={p.id} style={styles.card}>
              <SafeUriImage uri={p.imageUrl} style={styles.thumb} icon="cube-outline" iconSize={21} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{p.name}</Text>
                <Text style={styles.muted}>{store?.name ?? "—"} • {branch} • {p.category}</Text>
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

                <Text style={styles.label}>Estabelecimento</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
                  {stores.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.chip, editing.storeId === s.id && styles.chipActive]}
                      onPress={() => updateEditingStore(s.id)}
                      testID={`product-store-${s.id}`}
                    >
                      <Text style={[styles.chipText, editing.storeId === s.id && { color: colors.white }]}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.branchHint}>Ramo herdado: {selectedBranch}</Text>

                <Text style={styles.label}>Categoria compatível</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
                  {selectedCategories.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.chip, editing.category === c && styles.chipActive]}
                      onPress={() => setEditing({ ...editing, category: c })}
                      testID={`product-cat-${c}`}
                    >
                      <Text style={[styles.chipText, editing.category === c && { color: colors.white }]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Field label="Preço estimado (R$)" value={String(editing.price)} onChange={(v: string) => setEditing({ ...editing, price: Number(v.replace(",", ".")) || 0 })} keyboardType="numeric" testID="product-price" />
                <Field label="Preço promocional (opcional)" value={String(editing.promoPrice ?? "")} onChange={(v: string) => setEditing({ ...editing, promoPrice: v ? Number(v.replace(",", ".")) : undefined })} keyboardType="numeric" testID="product-promo" />
                {editing.imageUrl?.trim() ? <SafeUriImage uri={editing.imageUrl} style={styles.preview} icon="image-outline" /> : null}
                <View style={styles.imageActions}>
                  <Button title="Selecionar imagem" variant="secondary" onPress={selectImage} testID="product-pick-image" style={styles.imageButton} />
                  {editing.imageUrl?.trim() ? (
                    <Button title="Remover imagem" variant="ghost" onPress={() => setEditing({ ...editing, imageUrl: "" })} testID="product-remove-image" style={styles.imageButton} />
                  ) : null}
                </View>
                <Field label="Imagem URL (opcional)" value={editing.imageUrl ?? ""} onChange={(v: string) => setEditing({ ...editing, imageUrl: v })} testID="product-image" />
                <Field label="Observações" value={editing.notes ?? ""} onChange={(v: string) => setEditing({ ...editing, notes: v })} multiline testID="product-notes" />

                <Row label="Ativo" value={editing.active} onToggle={() => setEditing({ ...editing, active: !editing.active })} testID="product-active" />
                <Row label="Sujeito à confirmação no local" value={editing.confirmInStore} onToggle={() => setEditing({ ...editing, confirmInStore: !editing.confirmInStore })} testID="product-confirm" />

                <Button title="Salvar" onPress={save} loading={saving} testID="product-save" />
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
  thumb: { width: 52, height: 52, borderRadius: radius.md },
  thumbFallback: { width: 52, height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  title: { fontWeight: "700", color: colors.textPrimary, fontSize: fontSize.bodyLarge },
  muted: { color: colors.textSecondary, fontSize: fontSize.small, marginTop: 2 },
  priceRow: { flexDirection: "row", gap: spacing.sm, marginTop: 4, alignItems: "center" },
  price: { color: colors.primary, fontWeight: "800" },
  promo: { color: colors.warning, fontWeight: "700", fontSize: fontSize.small },
  inactive: { color: colors.error, fontSize: fontSize.small, fontWeight: "700" },
  label: { color: colors.textSecondary, fontWeight: "600", fontSize: fontSize.small },
  branchHint: { color: colors.primary, fontWeight: "800", fontSize: fontSize.small },
  preview: { width: "100%", height: 170, borderRadius: radius.md, backgroundColor: colors.borderLight },
  imageActions: { flexDirection: "row", gap: spacing.sm },
  imageButton: { flex: 1 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.textPrimary, backgroundColor: colors.surface, minHeight: 50 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, height: 36 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontWeight: "600", fontSize: fontSize.small },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  toggle: { width: 36, height: 22, borderRadius: 11, backgroundColor: colors.border },
  toggleOn: { backgroundColor: colors.primary },
  toggleLabel: { fontWeight: "700", color: colors.textSecondary },
  errorNotice: { backgroundColor: colors.errorSoft, color: colors.error, padding: spacing.sm, borderRadius: radius.md, fontSize: fontSize.small, fontWeight: "700" },
});
