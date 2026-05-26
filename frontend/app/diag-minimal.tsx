import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

export default function DiagnosticMinimalRoute() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DIAG v3 • rota mínima abriu</Text>
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
  button: {
    backgroundColor: "#059669",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
