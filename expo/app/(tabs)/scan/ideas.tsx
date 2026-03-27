import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ChefHat, Play, BookOpen } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors, { Radius, Spacing, FontSize } from "@/constants/colors";
import RecipeCard from "@/components/RecipeCard";
import { useRecipes } from "@/contexts/RecipeContext";
import { useCookbooks } from "@/contexts/CookbooksContext";

export default function ScanIdeasScreen() {
  const router = useRouter();
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const insets = useSafeAreaInsets();
  const { recipes } = useRecipes();
  const { saveRecipeToCookbook, isRecipeSavedInCookbook } = useCookbooks();

  const ideaRecipes = useMemo(() => {
    if (!scanId) return [];
    return recipes.filter((r) => r.scanId === scanId);
  }, [recipes, scanId]);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  if (!scanId || ideaRecipes.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#0D0B0A", "#110E0B", "#0A0806"]} style={StyleSheet.absoluteFill} />
        <View style={[styles.centerWrap, { paddingTop: insets.top + 60 }]}>
          <ChefHat size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>Recipe ideas ready!</Text>
          <Text style={styles.emptySub}>No recipes from this scan. Try again or add ingredients manually.</Text>
          <Pressable onPress={() => router.replace("/(tabs)/scan" as any)} style={styles.backBtnAlt}>
            <Text style={styles.backBtnAltText}>Back to Scan</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0D0B0A", "#110E0B", "#0A0806"]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft size={22} color="#fff" />
          </Pressable>
          <Text style={styles.title}>Recipe ideas</Text>
          <View style={{ width: 44 }} />
        </View>
        <Text style={styles.subtitle}>Pick one to start cooking or save to your cookbook</Text>

        <View style={styles.list}>
          {ideaRecipes.map((recipe) => {
            const isSaved = isRecipeSavedInCookbook(recipe.id, "saved");
            return (
              <View key={recipe.id} style={styles.cardWrap}>
                <RecipeCard
                  recipe={recipe}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/recipe/${recipe.id}` as any);
                  }}
                  variant="large"
                />
                <View style={styles.actionsRow}>
                  {!isSaved && (
                    <Pressable
                      onPress={() => {
                        saveRecipeToCookbook(recipe.id, "saved");
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }}
                      style={styles.saveBtn}
                    >
                      <BookOpen size={16} color={Colors.accent} />
                      <Text style={styles.saveBtnText}>Save to Cookbook</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      router.push(`/cook/${recipe.id}` as any);
                    }}
                    style={styles.cookBtn}
                  >
                    <LinearGradient colors={[Colors.accent, "#E8872E"]} style={styles.cookBtnGrad}>
                      <Play size={18} color={Colors.dark} fill={Colors.dark} />
                      <Text style={styles.cookBtnText}>Start cooking</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scrollContent: { paddingHorizontal: Spacing.xl },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.sm },
  backBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  title: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: "700" },
  subtitle: { color: Colors.textTertiary, fontSize: FontSize.sm, marginBottom: Spacing.xl },
  list: { gap: Spacing.xl },
  cardWrap: { marginBottom: Spacing.lg },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginTop: Spacing.md, flexWrap: "wrap" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: "rgba(245,148,58,0.35)",
    backgroundColor: Colors.accentSoft,
  },
  saveBtnText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: "600" },
  cookBtn: { borderRadius: Radius.xl, overflow: "hidden" },
  cookBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
  },
  cookBtnText: { color: Colors.dark, fontSize: FontSize.md, fontWeight: "700" },
  centerWrap: { flex: 1, alignItems: "center", paddingHorizontal: Spacing.xxl },
  emptyTitle: { color: Colors.white, fontSize: FontSize.xl, fontWeight: "700", marginTop: Spacing.lg },
  emptySub: { color: Colors.textTertiary, fontSize: FontSize.sm, textAlign: "center", marginTop: Spacing.sm },
  backBtnAlt: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.xl,
    backgroundColor: Colors.accent,
  },
  backBtnAltText: { color: Colors.dark, fontSize: FontSize.sm, fontWeight: "700" },
});
