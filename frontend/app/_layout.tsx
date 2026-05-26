import "@/src/lib/polyfills";

import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/src/theme/colors";
import { DiagnosticErrorBoundary } from "@/src/components/DiagnosticErrorBoundary";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <DiagnosticErrorBoundary>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: "slide_from_right",
          }}
        />
      </DiagnosticErrorBoundary>
    </SafeAreaProvider>
  );
}
