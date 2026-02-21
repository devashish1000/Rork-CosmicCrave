import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BookOpen, Plus, ChevronRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors, { Radius, Spacing, FontSize } from "@/constants/colors";
import GlassCard from "@/components/GlassCard";
import { useCookbooks } from "@/contexts/CookbooksContext";

export default function CookbooksListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cookbooks, createCookbook, getCookbookCount } = useCookbooks();
  const handleCreate = () => {
    const cb = createCookbook("Untitled");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/cookbooks/${cb.id}` as any);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0D0B0A", "#110E0B", "#0A0806"]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Cookbooks</Text>
          <Text style={styles.subtitle}>Your recipe collections</Text>
        </View>

        {cookbooks.map((cb) => {
          const count = getCookbookCount(cb.id);
          return (
            <Pressable
              key={cb.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/cookbooks/${cb.id}` as any);
              }}
              style={styles.cardWrap}
            >
              <GlassCard style={styles.card} intensity="medium">
                <View style={styles.cardLeft}>
                  <View style={styles.iconWrap}>
                    <Text style={styles.emoji}>{cb.emoji ?? "📖"}</Text>
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>{cb.name}</Text>
                    <Text style={styles.cardSub}>{count} recipe{count !== 1 ? "s" : ""}</Text>
                  </View>
                </View>
                <ChevronRight size={20} color={Colors.textTertiary} />
              </GlassCard>
            </Pressable>
          );
        })}

        <Pressable onPress={handleCreate} style={styles.addWrap}>
          <GlassCard style={styles.addCard} intensity="light">
            <Plus size={24} color={Colors.accent} />
            <Text style={styles.addText}>New cookbook</Text>
          </GlassCard>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scrollContent: { paddingHorizontal: Spacing.xl },
  header: { marginBottom: Spacing.xxl },
  title: { color: Colors.white, fontSize: FontSize.xxxl, fontWeight: "700" },
  subtitle: { color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: 4 },
  cardWrap: { marginBottom: Spacing.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.xl,
    borderRadius: Radius.xxl,
  },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.lg },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.accentSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: { fontSize: 24 },
  cardText: {},
  cardTitle: { color: Colors.white, fontSize: FontSize.lg, fontWeight: "600" },
  cardSub: { color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: 2 },
  addWrap: { marginTop: Spacing.lg },
  addCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.xl,
    borderRadius: Radius.xxl,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  addText: { color: Colors.accent, fontSize: FontSize.md, fontWeight: "600" },
});
