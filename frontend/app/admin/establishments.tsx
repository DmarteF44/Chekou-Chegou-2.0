import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal,
  KeyboardAvoidingView, Platform, KeyboardTypeOptions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { Button } from "@/src/components/Button";
import { DemoNotice } from "@/src/components/DemoNotice";
import { catalogService, Store, StoreType } from "@/src/services/catalogService";
import { authService } from "@/src/services/authService";

const TYPES: { id: StoreType; label: string }[] = [
  { id: "mais_pedido", label: "Mais pedido" },
  { id: "parceiro_oficial", label: "Parceiro oficial" },
  { id: "teste", label: "Teste" },
];

const EMPTY: Store = {
  id: "", name: "", category: "Mercado", image: "",
  deliveryTime: "30–45 min", rating: 4.5, description: "",
  type: "mais_pedido", address: "Jataí-GO", phone: "", baseFee: 8, active: true, notes: "",
};

export default function AdminStores() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [editing, setEditing] = useState<Store | null>(null);

  useEffect(() => {
    const refresh = async () => {
      const session = await authService.getSession();
      if (!session || session.role !== "admin") {
        router.replace("/auth/login");
        return;
      }
      setStores(await catalogService.listStores());
    };
    refresh();
    return catalogService.subscribe(refresh);
  }, [router]);

  function newOne() {
    setEditing({ ...EMPTY, id: `store_${Date.now()}` });
  }

  async function save() {
    if (!editing) return;
    if (editing.name.trim().length < 2) {
      Alert.alert("Nome inválido", "Informe o nome do estabelecimento.");
      return;
    }
    await catalogService.upsertStore({
      ...editing,
      name: editing.name.trim(),
      category: editing.category.trim(),
      description: editing.description.trim(),
      image: editing.image.trim(),
      phone: editing.phone?.trim(),
      notes: editing.notes?.trim(),
    });
    setEditing(null);
  }

  async function remove(s: Store) {
    Alert.alert("Remover", `Remover ${s.name}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => catalogService.deleteStore(s.id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header
        title="Estabelecimentos"
        right={
          <TouchableOpacity onPress={newOne} testID="admin-store-new">
            <Ionicons name="add-circle" size={26} color={colors.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={styles.container}>
        <DemoNotice />
        <Text style={styles.notice}>
          O Chekou Ganhou é uma plataforma independente de compra assistida e entrega.
          Estabelecimentos exibidos como mais pedidos não representam parceria oficial, salvo indicação expressa.
        </Text>
        {stores.map((s) => (
          <View key={s.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{s.name}</Text>
              <Text style={styles.muted}>{s.category} • {s.deliveryTime} • {s.address}</Text>
              <View style={styles.badges}>
                <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>{TYPES.find((t) => t.id === s.type)?.label}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: s.active ? colors.primarySoft : colors.errorSoft }]}>
                  <Text style={[styles.badgeText, { color: s.active ? colors.primary : colors.error }]}>
                    {s.active ? "Ativo" : "Inativo"}
                  </Text>
                </View>
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <TouchableOpacity onPress={() => setEditing(s)} testID={`admin-store-edit-${s.id}`}>
                <Ionicons name="create-outline" size={22} color={colors.info} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => remove(s)} testID={`admin-store-delete-${s.id}`}>
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <Button title="Novo estabelecimento" onPress={newOne} testID="admin-store-new-bottom"
          icon={<Ionicons name="add" size={18} color={colors.white} />} />
      </ScrollView>

      <Modal visible={!!editing} animationType="slide" onRequestClose={() => setEditing(null)}>
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <Header title="Estabelecimento" />
          {editing && (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <Field label="Nome" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} testID="store-name" />
                <Field label="Categoria" value={editing.category} onChange={(v) => setEditing({ ...editing, category: v })} testID="store-cat" />

                <Text style={styles.label}>Tipo</Text>
                <View style={styles.typeRow}>
                  {TYPES.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.typeBtn, editing.type === t.id && styles.typeActive]}
                      onPress={() => setEditing({ ...editing, type: t.id })}
                      testID={`store-type-${t.id}`}
                    >
                      <Text style={[styles.typeText, editing.type === t.id && { color: colors.white }]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Field label="Endereço" value={editing.address} onChange={(v) => setEditing({ ...editing, address: v })} testID="store-addr" />
                <Field label="Telefone (opcional)" value={editing.phone ?? ""} onChange={(v) => setEditing({ ...editing, phone: v })} testID="store-phone" />
                <Field label="Tempo estimado" value={editing.deliveryTime} onChange={(v) => setEditing({ ...editing, deliveryTime: v })} testID="store-time" />
                <Field label="Taxa base (R$)" value={String(editing.baseFee)} onChange={(v) => setEditing({ ...editing, baseFee: Number(v) || 0 })} keyboardType="numeric" testID="store-fee" />
                <Field label="Imagem (URL)" value={editing.image} onChange={(v) => setEditing({ ...editing, image: v })} testID="store-img" />
                <Field label="Observações" value={editing.notes ?? ""} onChange={(v) => setEditing({ ...editing, notes: v })} testID="store-notes" multiline />

                <TouchableOpacity style={styles.toggleRow} onPress={() => setEditing({ ...editing, active: !editing.active })} testID="store-active-toggle">
                  <View style={[styles.toggle, editing.active && styles.toggleOn]} />
                  <Text style={styles.toggleLabel}>{editing.active ? "Ativo" : "Inativo"}</Text>
                </TouchableOpacity>

                <Button title="Salvar" onPress={save} testID="store-save" />
                <Button title="Cancelar" variant="ghost" onPress={() => setEditing(null)} testID="store-cancel" />
              </ScrollView>
            </KeyboardAvoidingView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Field({
  label, value, onChange, keyboardType, multiline, testID,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  keyboardType?: KeyboardTypeOptions;
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
        style={[styles.input, multiline && { minHeight: 80, textAlignVertical: "top" }]}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  notice: {
    backgroundColor: colors.infoSoft, color: colors.info,
    padding: spacing.md, borderRadius: radius.md, fontSize: fontSize.small, lineHeight: 18,
  },
  card: {
    flexDirection: "row", gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, alignItems: "center",
  },
  title: { fontWeight: "700", color: colors.textPrimary, fontSize: fontSize.bodyLarge },
  muted: { color: colors.textSecondary, fontSize: fontSize.small, marginTop: 2 },
  badges: { flexDirection: "row", gap: 6, marginTop: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { fontWeight: "700", fontSize: fontSize.small },
  label: { color: colors.textSecondary, fontWeight: "600", fontSize: fontSize.small },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.textPrimary, backgroundColor: colors.surface, minHeight: 50 },
  typeRow: { flexDirection: "row", gap: spacing.sm },
  typeBtn: { flex: 1, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center", backgroundColor: colors.surface },
  typeActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeText: { color: colors.textSecondary, fontWeight: "600", fontSize: fontSize.small },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  toggle: { width: 36, height: 22, borderRadius: 11, backgroundColor: colors.border },
  toggleOn: { backgroundColor: colors.primary },
  toggleLabel: { fontWeight: "700", color: colors.textSecondary },
});
