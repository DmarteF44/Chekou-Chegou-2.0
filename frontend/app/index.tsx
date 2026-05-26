import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Link, Redirect, useRouter } from "expo-router";
import { colors, fontSize, spacing } from "@/src/theme/colors";
import { AUTH_BOOT_TIMEOUT_MS, authService } from "@/src/services/authService";
import { DemoNotice } from "@/src/components/DemoNotice";
import { withTimeout } from "@/src/utils/withTimeout";
import {
  type NavigationDiagnosticState,
  recordNavigationRequest,
  registerIndexMount,
} from "@/src/utils/navigationDiagnostic";

const INDEX_BOOT_TIMEOUT_MS = AUTH_BOOT_TIMEOUT_MS + 1000;
type ScreenMode = "bootstrap" | "inline-minimal" | "inline-login";

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
// DIAG v4 deliberately holds automatic auth navigation while Android route mounting is isolated.
export default function Index() {
  const router = useRouter();
  const [bootStage, setBootStage] = useState("DIAG v4 • render inicial");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [bootResult, setBootResult] = useState("");
  const [bootError, setBootError] = useState<DiagnosticError | null>(null);
  const [localStage, setLocalStage] = useState("aguardando getSession local");
  const [localTrace, setLocalTrace] = useState("");
  const [screenMode, setScreenMode] = useState<ScreenMode>("bootstrap");
  const [inlineEmail, setInlineEmail] = useState("");
  const [inlinePassword, setInlinePassword] = useState("");
  const [navigationState, setNavigationState] = useState<NavigationDiagnosticState | null>(null);
  const [redirectNow, setRedirectNow] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void registerIndexMount().then(async ({ state, shouldRedirect }) => {
      if (cancelled) return;
      setNavigationState(state);
      if (shouldRedirect) {
        const redirectState = await recordNavigationRequest("Redirect rota mínima executado", "/diag-minimal");
        if (!cancelled) {
          setNavigationState(redirectState);
          setRedirectNow(true);
        }
      }
    });

    setBootStage("DIAG v4 • useEffect iniciado");

    async function bootstrap() {
      setBootStage("DIAG v4 • solicitando sessão local");
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
          setBootStage("DIAG v4 • bootstrap local concluído");
          return;
        }
        if (u.role === "admin" || u.role === "super_admin") {
          setBootResult("Resultado: sessão Admin resolvida; navegação suspensa no diagnóstico.");
          setBootStage("DIAG v4 • bootstrap local concluído");
          return;
        }
        if (u.role === "driver") {
          const destination = u.driverStatus === "approved"
            ? "entregador"
            : u.driverStatus === "blocked" ? "bloqueado" : "pendente";
          setBootResult(`Resultado: sessão Entregador resolvida (${destination}); navegação suspensa no diagnóstico.`);
          setBootStage("DIAG v4 • bootstrap local concluído");
          return;
        }
        setBootResult("Resultado: sessão Cliente resolvida; navegação suspensa no diagnóstico.");
        setBootStage("DIAG v4 • bootstrap local concluído");
      } catch (error) {
        if (cancelled) return;
        const detail = describeError(error);
        setBootError(detail);
        setBootResult("");
        setBootStage("DIAG v4 • erro bootstrap local");
        console.warn(`[bootstrap] Falha local: ${detail.name}: ${detail.message}`);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  async function trackAction(action: string, route: string, redirectNextBoot = false) {
    const state = await recordNavigationRequest(action, route, redirectNextBoot);
    setNavigationState(state);
  }

  async function openInline(mode: Exclude<ScreenMode, "bootstrap">) {
    const action = mode === "inline-minimal" ? "Abrir tela mínima inline" : "Abrir login mínimo inline";
    await trackAction(action, "/ (inline)");
    setScreenMode(mode);
  }

  async function pushMinimalRoute() {
    await trackAction("Router push rota mínima", "/diag-minimal");
    setBootStage("DIAG v4 • router.push solicitado");
    router.push("/diag-minimal");
  }

  async function replaceMinimalRoute() {
    await trackAction("Router replace rota mínima", "/diag-minimal");
    setBootStage("DIAG v4 • router.replace solicitado");
    router.replace("/diag-minimal");
  }

  async function replaceMinimalLogin() {
    await trackAction("Router replace login mínimo", "/auth/login");
    setBootStage("DIAG v4 • login mínimo solicitado");
    router.replace("/auth/login");
  }

  async function armRedirectNextBoot() {
    await trackAction("Redirect rota mínima no próximo boot", "/diag-minimal", true);
    setBootResult("Redirect armado. Feche e reabra o app para testar.");
    setBootStage("DIAG v4 • redirect pendente");
  }

  async function clearOnlyLocalSession() {
    setBootStage("DIAG v4 • limpando apenas sessão local");
    setBootError(null);
    try {
      await authService.clearLocalSession();
      setLocalStage("sessão local removida");
      setLocalTrace("sessão local removida manualmente");
      setBootResult("Ação: somente a sessão local foi limpa. Reinicie o app para testar o bootstrap.");
      setBootStage("DIAG v4 • sessão local limpa");
    } catch (error) {
      const detail = describeError(error);
      setBootError(detail);
      setBootResult("");
      setBootStage("DIAG v4 • falha ao limpar sessão local");
    }
  }

  if (redirectNow) return <Redirect href="/diag-minimal" />;

  if (screenMode === "inline-minimal") {
    return (
      <View style={styles.inlineContainer}>
        <Text style={styles.inlineTitle}>DIAG v4 • tela inline abriu</Text>
        <Text style={styles.diagText}>Esta tela foi renderizada no próprio index, sem Expo Router.</Text>
        <TouchableOpacity style={styles.escapeButton} onPress={() => setScreenMode("bootstrap")}>
          <Text style={styles.escapeButtonText}>Voltar ao diagnóstico</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (screenMode === "inline-login") {
    return (
      <View style={styles.inlineContainer}>
        <Text style={styles.brand}>Chekou Chegou</Text>
        <Text style={styles.inlineTitle}>DIAG v4 • login inline abriu</Text>
        <TextInput
          value={inlineEmail}
          onChangeText={setInlineEmail}
          placeholder="e-mail de teste"
          style={styles.inlineInput}
          autoCapitalize="none"
        />
        <TextInput
          value={inlinePassword}
          onChangeText={setInlinePassword}
          placeholder="senha de teste"
          style={styles.inlineInput}
          secureTextEntry
        />
        <TouchableOpacity style={styles.escapeButton}>
          <Text style={styles.escapeButtonText}>Continuar teste (sem autenticar)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setScreenMode("bootstrap")}>
          <Text style={styles.secondaryButtonText}>Voltar ao diagnóstico</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>CC</Text>
      </View>
      <Text style={styles.brand}>Chekou Chegou</Text>
      <View style={{ marginTop: spacing.sm }}>
        <DemoNotice compact />
      </View>
      <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
      <View style={styles.diagPanel}>
        <Text style={styles.diagTitle}>{bootStage}</Text>
        <Text style={styles.diagText}>DIAG v4 • {elapsedSeconds}s • modo local forçado</Text>
        <Text style={styles.diagText}>Stack animation: none</Text>
        <Text style={styles.diagText}>Montagem index: {navigationState?.indexMountCount ?? "lendo..."}</Text>
        <Text style={styles.diagText}>Última ação: {navigationState?.lastAction ?? "lendo..."}</Text>
        <Text style={styles.diagText}>Última rota solicitada: {navigationState?.lastRoute ?? "lendo..."}</Text>
        <Text style={styles.traceText}>Último evento: {navigationState?.lastEvent ?? "lendo..."}</Text>
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
            <TouchableOpacity style={styles.escapeButton} onPress={() => void openInline("inline-minimal")} testID="diag-inline-minimal">
              <Text style={styles.escapeButtonText}>Abrir tela mínima inline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.escapeButton} onPress={() => void openInline("inline-login")} testID="diag-inline-login">
              <Text style={styles.escapeButtonText}>Abrir login mínimo inline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.escapeButton} onPress={() => void pushMinimalRoute()} testID="diag-router-push">
              <Text style={styles.escapeButtonText}>Router push rota mínima</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.escapeButton} onPress={() => void replaceMinimalRoute()} testID="diag-router-replace">
              <Text style={styles.escapeButtonText}>Router replace rota mínima</Text>
            </TouchableOpacity>
            <Link
              href="/diag-minimal"
              asChild
              onPress={() => {
                void trackAction("Link rota mínima", "/diag-minimal");
              }}
            >
              <TouchableOpacity style={styles.escapeButton} testID="diag-link-minimal">
                <Text style={styles.escapeButtonText}>Link rota mínima</Text>
              </TouchableOpacity>
            </Link>
            <TouchableOpacity style={styles.escapeButton} onPress={() => void replaceMinimalLogin()} testID="diag-login-minimal">
              <Text style={styles.escapeButtonText}>Router replace login mínimo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => void armRedirectNextBoot()} testID="diag-redirect-next-boot">
              <Text style={styles.secondaryButtonText}>Redirect rota mínima no próximo boot</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={clearOnlyLocalSession} testID="diag-clear-local-session">
              <Text style={styles.secondaryButtonText}>Limpar apenas sessão local</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: "100%", backgroundColor: colors.surface, alignItems: "center",
    justifyContent: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.lg,
  },
  logo: {
    width: 84, height: 84, borderRadius: 24, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.md,
  },
  logoText: { color: colors.white, fontWeight: "800", fontSize: 32 },
  brand: { fontSize: fontSize.h2, fontWeight: "800", color: colors.textPrimary },
  diagPanel: { marginTop: spacing.md, alignItems: "center", paddingHorizontal: spacing.sm, gap: 6 },
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
  inlineContainer: {
    flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg,
    gap: spacing.md, backgroundColor: colors.surface,
  },
  inlineTitle: { fontSize: fontSize.h4, fontWeight: "700", color: colors.textPrimary, textAlign: "center" },
  inlineInput: {
    width: "100%", minHeight: 48, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, paddingHorizontal: spacing.md, color: colors.textPrimary,
  },
});
