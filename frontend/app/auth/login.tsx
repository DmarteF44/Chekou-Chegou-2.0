import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { recordDestinationMount } from "@/src/utils/navigationDiagnostic";

export default function LoginDiagnosticMinimal() {
  const router = useRouter();
  const [mountedEvent, setMountedEvent] = useState("registrando montagem...");

  useEffect(() => {
    void recordDestinationMount("login-minimo montou", "/auth/login").then(() => {
      setMountedEvent("Registro persistido: login-minimo montou");
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chekou Chegou</Text>
      <Text style={styles.title}>DIAG v5 • login mínimo montou com Slot</Text>
      <Text style={styles.detail}>{mountedEvent}</Text>
      <Text style={styles.detail}>Sem asset, componentes customizados ou serviço de autenticação.</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.replace("/")} testID="diag-login-back">
        <Text style={styles.buttonText}>Voltar ao diagnóstico</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => router.push("/diag-minimal")} testID="diag-login-continue">
        <Text style={styles.buttonText}>Continuar teste</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FFFFFF",
    gap: 16,
  },
  title: { color: "#111827", fontSize: 18, fontWeight: "700", textAlign: "center" },
  detail: { color: "#4B5563", fontSize: 14, textAlign: "center" },
  button: {
    backgroundColor: "#059669",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
