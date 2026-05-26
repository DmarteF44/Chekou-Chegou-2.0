import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

function sanitizeDiagnosticText(value: string): string {
  return value
    .replace(/(password|senha|token|apikey|api[_-]?key|authorization|chave)(\s*[:=]\s*)[^\s,;]+/gi, "$1$2[oculto]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[token oculto]")
    .replace(/sb_(publishable|secret)_[A-Za-z0-9_-]+/gi, "[chave oculta]")
    .slice(0, 240);
}

export class DiagnosticErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    const name = sanitizeDiagnosticText(error.name || "Error");
    const message = sanitizeDiagnosticText(error.message || "Erro sem mensagem.");
    console.warn(`[render] ${name}: ${message}`);
  }

  private retry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>DIAG v5 • erro de renderização</Text>
        <Text style={styles.text}>Contexto: rota atual</Text>
        <Text style={styles.text}>Tipo: {sanitizeDiagnosticText(error.name || "Error")}</Text>
        <Text style={styles.text}>Mensagem: {sanitizeDiagnosticText(error.message || "Erro sem mensagem.")}</Text>
        <TouchableOpacity style={styles.button} onPress={this.retry} testID="diag-render-retry">
          <Text style={styles.buttonText}>Recarregar rota</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
  title: { color: "#111827", fontSize: 18, fontWeight: "700", textAlign: "center" },
  text: { color: "#4B5563", fontSize: 14, textAlign: "center" },
  button: {
    marginTop: 8,
    backgroundColor: "#059669",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
