import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";

export function SafeUriImage({
  uri,
  style,
  icon = "image-outline",
  iconSize = 22,
}: {
  uri?: string | null;
  style: any;
  icon?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
}) {
  const source = uri?.trim() ?? "";
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [source]);

  if (!source || failed) {
    return (
      <View style={[style, styles.fallback]}>
        <Ionicons name={icon} size={iconSize} color={colors.primary} />
      </View>
    );
  }

  return <Image source={{ uri: source }} style={style} onError={() => setFailed(true)} />;
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
});
