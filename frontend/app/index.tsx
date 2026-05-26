import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { colors, fontSize, spacing } from "@/src/theme/colors";
import { AUTH_BOOT_TIMEOUT_MS, authService } from "@/src/services/authService";
import { DemoNotice } from "@/src/components/DemoNotice";
import { withTimeout } from "@/src/utils/withTimeout";

const INDEX_BOOT_TIMEOUT_MS = AUTH_BOOT_TIMEOUT_MS + 1000;

type DiagnosticError = {
  name: string;
  message: string;
};

function sanitizeDiagnosticText(value: string): string {
  return value
    .replace(/(password|senha|token|apikey|api[_-]?key|authorization|chave)(\s*[:=]\s*)[^\s,;]+/gi, "$1$2[oculto]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[token oculto]")
    .replace(/sb_(publishable|secret)_[A-Za-z0-9_-]+/gi, "[chave oculta]")
    .slice(0, 240);
}

function describeError(error: unknown): DiagnosticError {
  if (error instanceof Error) {
    return {
      name: sanitizeDiagnosticText(error.name || "Error"),
      message: sanitizeDiagnosticText(error.message || "Erro sem mensagem."),
    };
  }
  return { name: "Error", message: "Falha desconhecida durante o bootstrap." };
}

// Auth gate / splash router.
// DIAG v3 deliberately holds navigation while the failing Android route is isolated.
export default function Index() {
  const router = useRouter();
  const [bootStage, setBootStage] = useState("DIAG v3 • render inicial");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [bootResult, setBootResult] = useState("");
  const [bootError, setBootError] = useState<DiagnosticError | null>(null);
  const [localStage, setLocalStage] = useState("aguardando getSession local");
  const [localTrace, setLocalTrace] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    setBootStage("DIAG v3 • useEffect iniciado");

    async function bootstrap() {
      setBootStage("DIAG v3 • solicitando sessão local");
      setBootError(null);
      setLocalTrace("");
      try {
        const u = await withTimeout(
          authService.getSession((stage) => {
            if (!cancelled) {
              setLocalStage(stage);
              setLocalTrace((trace) => trace ? `${trace} > ${stage}` : stage);
            }
          }),
          INDEX_BOOT_TIMEOUT_MS,
          "Tempo limite ao iniciar sessão.",
        );
        if (!u) {
          setBootResult("Resultado: sessão resolvida sem usuário; destino seria login.");
          setBootStage("DIAG v3 • bootstrap local concluído");
          return;
        }
        if (u.role === "admin" || u.role === "super_admin") {
          setBootResult("Resultado: sessão Admin resolvida; navegação suspensa no diagnóstico.");
          setBootStage("DIAG v3 • bootstrap local concluído");
          return;
        }
        if (u.role === "driver") {
          const destination = u.driverStatus === "approved"
            ? "entregador"
            : u.driverStatus === "blocked" ? "bloqueado" : "pendente";
          setBootResult(`Resultado: sessão Entregador resolvida (${destination}); navegação suspensa no diagnóstico.`);
          setBootStage("DIAG v3 • bootstrap local concluído");
          return;
        }
        setBootResult("Resultado: sessão Cliente resolvida; navegação suspensa no diagnóstico.");
        setBootStage("DIAG v3 • bootstrap local concluído");
      } catch (error) {
        if (cancelled) return;
        const detail = describeError(error);
        setBootError(detail);
        setBootResult("");
        setBootStage("DIAG v3 • erro bootstrap local");
        console.warn(`[bootstrap] Falha local: ${detail.name}: ${detail.message}`);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  function enterManually() {
    setBootResult("Ação: navegação manual para login mínimo solicitada.");
    setBootStage("DIAG v3 • abrindo login mínimo");
    router.replace("/auth/login");
  }

  function testMinimalRoute() {
    setBootResult("Ação: navegação para rota mínima solicitada.");
    setBootStage("DIAG v3 • abrindo rota mínima");
    router.push("/diag-minimal");
  }

  async function clearOnlyLocalSession() {
    setBootStage("DIAG v3 • limpando apenas sessão local");
    setBootError(null);
    try {
      await authService.clearLocalSession();
      setLocalStage("sessão local removida");
      setLocalTrace("sessão local removida manualmente");
      setBootResult("Ação: somente a sessão local foi limpa. Reinicie o app para testar o bootstrap.");
      setBootStage("DIAG v3 • sessão local limpa");
    } catch (error) {
      const detail = describeError(error);
      setBootError(detail);
      setBootResult("");
      setBootStage("DIAG v3 • falha ao limpar sessão local");
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>CG</Text>
      </View>
      <Text style={styles.brand}>Chekou Ganhou</Text>
      <View style={{ marginTop: spacing.sm }}>
        <DemoNotice compact />
      </View>
      <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      <View style={styles.diagPanel}>
        <Text style={styles.diagTitle}>{bootStage}</Text>
        <Text style={styles.diagText}>DIAG v3 • {elapsedSeconds}s • modo local forçado</Text>
        <Text style={styles.diagText}>Etapa local: {localStage}</Text>
        {localTrace ? <Text style={styles.traceText}>Rastro local: {localTrace}</Text> : null}
        {bootResult ? <Text style={styles.diagText}>{bootResult}</Text> : null}
        {bootError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Tipo: {bootError.name}</Text>
            <Text style={styles.errorText}>Mensagem: {bootError.message}</Text>
          </View>
        ) : null}
        {elapsedSeconds >= 3 ? (
          <>
            <TouchableOpacity style={styles.escapeButton} onPress={testMinimalRoute} testID="diag-test-minimal-route">
              <Text style={styles.escapeButtonText}>Testar rota mínima</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.escapeButton} onPress={enterManually} testID="diag-enter-manually">
              <Text style={styles.escapeButtonText}>Entrar manualmente</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={clearOnlyLocalSession} testID="diag-clear-local-session">
              <Text style={styles.secondaryButtonText}>Limpar apenas sessão local</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  logo: {
    width: 84, height: 84, borderRadius: 24, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.md,
  },
  logoText: { color: colors.white, fontWeight: "800", fontSize: 32 },
  brand: { fontSize: fontSize.h2, fontWeight: "800", color: colors.textPrimary },
  diagPanel: { marginTop: spacing.md, alignItems: "center", paddingHorizontal: spacing.md, gap: 6 },
  diagTitle: { fontSize: fontSize.small, fontWeight: "700", color: colors.textPrimary, textAlign: "center" },
  diagText: { fontSize: fontSize.small, color: colors.textSecondary, textAlign: "center" },
  traceText: { fontSize: fontSize.caption, color: colors.textTertiary, textAlign: "center" },
  errorBox: {
    marginTop: spacing.xs, borderRadius: 8, backgroundColor: colors.errorSoft,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, alignSelf: "stretch",
  },
  errorText: { fontSize: fontSize.small, color: colors.error, textAlign: "center" },
  escapeButton: {
    marginTop: spacing.sm, borderRadius: 8, backgroundColor: colors.primary,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  escapeButtonText: { color: colors.white, fontSize: fontSize.small, fontWeight: "700" },
  secondaryButton: {
    marginTop: spacing.sm, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  secondaryButtonText: { color: colors.textSecondary, fontSize: fontSize.small, fontWeight: "700" },
});
