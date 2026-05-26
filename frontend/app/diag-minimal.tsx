import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { recordDestinationMount } from "@/src/utils/navigationDiagnostic";

export default function DiagnosticMinimalRoute() {
  const router = useRouter();
  const [mountedEvent, setMountedEvent] = useState("registrando montagem...");

  useEffect(() => {
    void recordDestinationMount("diag-minimal montou", "/diag-minimal").then(() => {
      setMountedEvent("Registro persistido: diag-minimal montou");
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DIAG v5 • rota mínima montou com Slot</Text>
      <Text style={styles.detail}>{mountedEvent}</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.replace("/")} testID="diag-minimal-back">
        <Text style={styles.buttonText}>Voltar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => router.push("/auth/login")} testID="diag-minimal-login">
        <Text style={styles.buttonText}>Abrir login mínimo</Text>
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
