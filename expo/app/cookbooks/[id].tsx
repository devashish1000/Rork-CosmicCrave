import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors, { Radius, Spacing, FontSize } from "@/constants/colors";
import RecipeCard from "@/components/RecipeCard";
import { useCookbooks } from "@/contexts/CookbooksContext";
import { useRecipes } from "@/contexts/RecipeContext";

export default function CookbookDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { cookbooks, getCookbookSaved, getCookbookCount } = useCookbooks();
  const { getRecipeById } = useRecipes();

  const cookbook = cookbooks.find((c) => c.id === id);
  const saved = id ? getCookbookSaved(id) : [];
  const recipes = saved
    .map((s) => getRecipeById(s.recipeId))
    .filter(Boolean) as NonNullable<ReturnType<typeof getRecipeById>>[];

  if (!id || !cookbook) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#0D0B0A", "#110E0B", "#0A0806"]} style={StyleSheet.absoluteFill} />
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + 8 }]}>
          <ArrowLeft size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.emptyTitle}>Cookbook not found</Text>
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
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={styles.backBtn}>
          <ArrowLeft size={24} color={Colors.white} />
        </Pressable>
        <View style={styles.header}>
          <Text style={styles.emoji}>{cookbook.emoji ?? "📖"}</Text>
          <Text style={styles.title}>{cookbook.name}</Text>
          <Text style={styles.subtitle}>{recipes.length} recipe{recipes.length !== 1 ? "s" : ""}</Text>
        </View>
        <View style={styles.list}>
          {recipes.map((recipe) => (
            <View key={recipe.id} style={styles.cardWrap}>
              <RecipeCard
                recipe={recipe}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/recipe/${recipe.id}` as any);
                }}
                variant="large"
              />
            </View>
          ))}
        </View>
        {recipes.length === 0 && (
          <Text style={styles.emptyTitle}>No recipes yet</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scrollContent: { paddingHorizontal: Spacing.xl },
  backBtn: {
    position: "absolute",
    left: Spacing.xl,
    zIndex: 10,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  header: { alignItems: "center", marginBottom: Spacing.xxl, marginTop: 40 },
  emoji: { fontSize: 48, marginBottom: Spacing.sm },
  title: { color: Colors.white, fontSize: FontSize.xxxl, fontWeight: "700" },
  subtitle: { color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: 4 },
  list: { gap: Spacing.lg },
  cardWrap: {},
  emptyTitle: { color: Colors.textTertiary, fontSize: FontSize.lg, textAlign: "center", marginTop: Spacing.xxl },
});
