import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { Button } from "@/src/components/Button";
import { authService, User } from "@/src/services/authService";
import { driverService, DRIVER_LEVELS, DriverApplication, DriverLevel } from "@/src/services/driverService";
import { orderService } from "@/src/services/orderService";
import { money } from "@/src/components/FinancialBreakdown";

export default function DriverDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [app, setApp] = useState<DriverApplication | null>(null);
  const [stats, setStats] = useState({ done: 0, cancelled: 0, balance: 0, pending: 0 });

  useEffect(() => {
    const refresh = async () => {
      const u = await authService.getById(id as string);
      setUser(u ?? null);
      setApp((await driverService.getApplication(id as string)) ?? null);
      const history = await orderService.driverHistory(id as string);
      const active = await orderService.driverActive(id as string);
      setStats({
        done: history.length,
        cancelled: 0,
        balance: history.reduce((a, o) => a + o.deliveryFee, 0),
        pending: active.reduce((a, o) => a + o.deliveryFee, 0),
      });
    };
    refresh();
    return authService.subscribe(refresh);
  }, [id]);

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Header title="Motorista" />
        <View style={{ padding: spacing.md }}><Text>Carregando...</Text></View>
      </SafeAreaView>
    );
  }

  const level = (user.driverLevel ?? 1) as DriverLevel;
  const levelInfo = DRIVER_LEVELS[level];

  async function approve() { await driverService.approve(user!.id); Alert.alert("Aprovado!", "Motorista pode receber pedidos."); }
  async function reject() { await driverService.reject(user!.id); Alert.alert("Reprovado", "Cadastro recusado."); }
  async function block() { await driverService.block(user!.id); Alert.alert("Bloqueado"); }
  async function unblock() { await driverService.unblock(user!.id); Alert.alert("Desbloqueado"); }
  async function setLevel(l: DriverLevel) {
    await driverService.setLevel(user!.id, l);
    Alert.alert("Nível atualizado", `Novo nível: ${DRIVER_LEVELS[l].name}`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header title="Motorista" subtitle={user.name} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.h}>Dados do motorista</Text>
          <Row label="Nome" value={user.name} />
          <Row label="E-mail" value={user.email} />
          <Row label="Telefone" value={user.phone || "—"} />
          <Row label="Status" value={user.driverStatus} />
          <Row label="Função" value={user.role} />
        </View>

        {app && (
          <View style={styles.card}>
            <Text style={styles.h}>Cadastro de parceiro</Text>
            <Row label="CPF" value={app.cpf} />
            <Row label="Veículo" value={app.vehicleType} />
            {app.plate ? <Row label="Placa" value={app.plate} /> : null}
            {app.cnh ? <Row label="CNH" value={app.cnh} /> : null}
            <Row label="Região" value={app.region} />
            <Row label="Chave Pix" value={app.pixKey} />
            <Row label="Enviado em" value={new Date(app.submittedAt).toLocaleString("pt-BR")} />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.h}>Nível operacional</Text>
          <View style={[styles.levelHeader, { borderColor: levelInfo.color }]}>
            <Ionicons name="medal" size={22} color={levelInfo.color} />
            <View style={{ flex: 1 }}>
              <Text style={styles.levelName}>Nível {level} • {levelInfo.name}</Text>
              <Text style={styles.muted}>{levelInfo.description}</Text>
            </View>
            <Text style={[styles.limit, { color: levelInfo.color }]}>até R$ {levelInfo.limit}</Text>
          </View>
          <View style={styles.levelRow}>
            {([1, 2, 3, 4] as DriverLevel[]).map((l) => (
              <TouchableOpacity
                key={l}
                onPress={() => setLevel(l)}
                style={[styles.levelBtn, level === l && { backgroundColor: DRIVER_LEVELS[l].color, borderColor: DRIVER_LEVELS[l].color }]}
                testID={`set-level-${l}`}
              >
                <Text style={[styles.levelBtnText, level === l && { color: colors.white }]}>N{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.h}>Métricas operacionais</Text>
          <Row label="Entregas concluídas" value={String(stats.done)} />
          <Row label="Cancelamentos" value={String(stats.cancelled)} />
          <Row label="Nota média" value="—" />
          <Row label="Saldo liberado" value={money(stats.balance)} />
          <Row label="Saldo pendente" value={money(stats.pending)} />
          <Row label="Limite operacional" value={money(levelInfo.limit)} />
        </View>

        <View style={{ gap: spacing.sm }}>
          {user.driverStatus !== "approved" && (
            <Button title="Aprovar motorista" onPress={approve} testID="admin-approve"
              icon={<Ionicons name="checkmark-circle" size={18} color={colors.white} />} />
          )}
          {user.driverStatus === "pending" && (
            <Button title="Reprovar" variant="secondary" onPress={reject} testID="admin-reject" />
          )}
          {user.driverStatus === "approved" && (
            <Button title="Bloquear" variant="danger" onPress={block} testID="admin-block" />
          )}
          {user.driverStatus === "blocked" && (
            <Button title="Desbloquear" onPress={unblock} testID="admin-unblock" />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  card: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, gap: 6 },
  h: { fontWeight: "700", color: colors.textPrimary, fontSize: fontSize.bodyLarge, marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  rowLabel: { color: colors.textSecondary },
  rowValue: { color: colors.textPrimary, fontWeight: "600", maxWidth: "60%", textAlign: "right" },
  muted: { color: colors.textSecondary, fontSize: fontSize.small },
  levelHeader: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    padding: spacing.sm, borderRadius: radius.md, borderWidth: 1,
  },
  levelName: { fontWeight: "800", color: colors.textPrimary, fontSize: fontSize.bodyLarge },
  limit: { fontWeight: "800", fontSize: fontSize.body },
  levelRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  levelBtn: { flex: 1, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center", backgroundColor: colors.surface },
  levelBtnText: { fontWeight: "800", color: colors.textSecondary },
});
