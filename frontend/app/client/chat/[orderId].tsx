import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { orderStore } from "@/src/data/orderStore";
import { Order, ChatMessage } from "@/src/data/mock";

type Role = "client" | "driver";

export default function ChatScreen() {
  const { orderId, role } = useLocalSearchParams<{ orderId: string; role?: Role }>();
  const me: Role = role === "driver" ? "driver" : "client";
  const [order, setOrder] = useState<Order | null>(null);
  const [text, setText] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const refresh = async () => {
      const o = await orderStore.getById(orderId as string);
      setOrder(o ?? null);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
    };
    refresh();
    return orderStore.subscribe(refresh);
  }, [orderId]);

  async function send() {
    const t = text.trim();
    if (!t || !order) return;
    const msg: ChatMessage = { id: `m_${Date.now()}`, from: me, text: t, at: Date.now() };
    await orderStore.addMessage(order.id, msg);
    setText("");
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    // simulate auto-reply if from client and driver hasn't replied yet
    if (me === "client") {
      setTimeout(async () => {
        await orderStore.addMessage(order.id, {
          id: `m_${Date.now() + 1}`,
          from: "driver",
          text: "Recebi! Já estou a caminho.",
          at: Date.now(),
        });
      }, 1200);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header
        title={me === "client" ? "Chat com Entregador" : "Chat com Cliente"}
        subtitle={order?.storeName}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {(order?.chat ?? []).length === 0 && (
            <Text style={styles.empty}>Envie uma mensagem para começar a conversa.</Text>
          )}
          {order?.chat.map((m) => {
            const mine = m.from === me;
            return (
              <View
                key={m.id}
                style={[styles.bubble, mine ? styles.mine : styles.theirs]}
              >
                <Text style={[styles.bubbleText, mine ? styles.mineText : styles.theirsText]}>
                  {m.text}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Mensagem..."
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            testID="chat-input"
            multiline
          />
          <TouchableOpacity onPress={send} style={styles.sendBtn} testID="chat-send-button">
            <Ionicons name="send" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl, flexGrow: 1 },
  empty: { color: colors.textTertiary, textAlign: "center", marginTop: spacing.xl },
  bubble: { maxWidth: "80%", padding: spacing.sm, borderRadius: radius.lg },
  mine: { backgroundColor: colors.primary, alignSelf: "flex-end", borderBottomRightRadius: 4 },
  theirs: { backgroundColor: colors.surface, alignSelf: "flex-start", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.borderLight },
  bubbleText: { fontSize: fontSize.body, lineHeight: 20 },
  mineText: { color: colors.white },
  theirsText: { color: colors.textPrimary },
  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: spacing.sm,
    padding: spacing.sm, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, maxHeight: 120,
    color: colors.textPrimary, fontSize: fontSize.body,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
});
