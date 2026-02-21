import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Plus, Sparkles } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useMutation } from "@tanstack/react-query";
import { generateObject } from "@rork-ai/toolkit-sdk";
import { z } from "zod";
import Colors, { Radius, Spacing, FontSize } from "@/constants/colors";
import GlassCard from "@/components/GlassCard";
import IngredientChip from "@/components/IngredientChip";
import { useAuth } from "@/contexts/AuthContext";
import { useRecipes } from "@/contexts/RecipeContext";
import { Recipe } from "@/types/recipe";

const recipeSchema = z.object({
  recipes: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      cookTime: z.number(),
      prepTime: z.number(),
      difficulty: z.enum(["Easy", "Medium", "Hard"]),
      calories: z.number(),
      servings: z.number(),
      tags: z.array(z.string()),
      ingredients: z.array(z.object({ name: z.string(), amount: z.string(), unit: z.string() })),
      steps: z.array(z.object({ step: z.number(), title: z.string(), description: z.string(), duration: z.number().optional() })),
      nutrition: z.object({ calories: z.number(), protein: z.number(), carbs: z.number(), fat: z.number(), fiber: z.number() }),
      tips: z.array(z.string()),
    })
  ),
});

const RECIPE_IMAGES = [
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80",
];

export default function ScanInputScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, canScan, incrementScan } = useAuth();
  const { addRecipes, addScan } = useRecipes();
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [inputText, setInputText] = useState("");

  const addIngredient = useCallback((text: string) => {
    const trimmed = text.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients((prev) => [...prev, trimmed]);
      setInputText("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [ingredients]);

  const removeIngredient = useCallback((index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const generateMutation = useMutation({
    mutationFn: async (ingredientList: string[]) => {
      const dietPrefs = user.dietaryPreferences?.length
        ? `Dietary preferences: ${user.dietaryPreferences.join(", ")}.`
        : "";
      const result = await generateObject({
        messages: [
          {
            role: "user",
            content: `You are a professional chef AI. Generate 2-3 creative, delicious recipes using these ingredients: ${ingredientList.join(", ")}. ${dietPrefs} Make them practical and tasty. Include realistic nutrition estimates.`,
          },
        ],
        schema: recipeSchema,
      });
      return result;
    },
    onSuccess: (data, ingredientList) => {
      const scanId = `scan-${Date.now()}`;
      const newRecipes: Recipe[] = (data.recipes ?? []).map((r: any, i: number) => ({
        id: `gen-${Date.now()}-${i}`,
        title: r.title ?? "Recipe",
        description: r.description ?? "",
        imageUrl: RECIPE_IMAGES[i % RECIPE_IMAGES.length] ?? RECIPE_IMAGES[0],
        cookTime: r.cookTime ?? 20,
        prepTime: r.prepTime ?? 10,
        difficulty: (r.difficulty === "Easy" || r.difficulty === "Medium" || r.difficulty === "Hard" ? r.difficulty : "Medium") as "Easy" | "Medium" | "Hard",
        calories: r.calories ?? 300,
        servings: r.servings ?? 2,
        tags: Array.isArray(r.tags) ? r.tags : [],
        ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
        steps: Array.isArray(r.steps) ? r.steps : [],
        nutrition: r.nutrition && typeof r.nutrition === "object" ? r.nutrition : { calories: 300, protein: 15, carbs: 30, fat: 12, fiber: 4 },
        tips: Array.isArray(r.tips) ? r.tips : [],
        isFavorite: false,
        createdAt: new Date().toISOString(),
        scanId,
      }));
      addRecipes(newRecipes);
      incrementScan();
      addScan({
        id: scanId,
        ingredients: ingredientList,
        scanType: "text",
        timestamp: new Date().toISOString(),
        recipesGenerated: newRecipes.length,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: "/(tabs)/scan/ideas", params: { scanId } } as any);
    },
    onError: (err) => {
      Alert.alert("Generation failed", err instanceof Error ? err.message : "Something went wrong. Please try again.");
    },
  });

  const handleGetIdeas = () => {
    if (ingredients.length === 0) {
      Alert.alert("No ingredients", "Add some ingredients first!");
      return;
    }
    if (!canScan) {
      router.push("/paywall" as any);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    generateMutation.mutate(ingredients);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0D0B0A", "#110E0B", "#0A0806"]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft size={20} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>Your Ingredients</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.subtitle}>Add what you have and let AI do the magic</Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Type an ingredient..."
            placeholderTextColor={Colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => addIngredient(inputText)}
            returnKeyType="done"
          />
          <Pressable
            onPress={() => addIngredient(inputText)}
            style={[styles.addBtn, !inputText.trim() && styles.addBtnDisabled]}
            disabled={!inputText.trim()}
          >
            <Plus size={20} color={inputText.trim() ? Colors.dark : Colors.textMuted} />
          </Pressable>
        </View>

        {ingredients.length > 0 && (
          <View style={styles.chipsSection}>
            <Text style={styles.chipsLabel}>{ingredients.length} ingredient{ingredients.length !== 1 ? "s" : ""}</Text>
            <View style={styles.chipsWrap}>
              {ingredients.map((ing, i) => (
                <IngredientChip key={`${ing}-${i}`} label={ing} onRemove={() => removeIngredient(i)} />
              ))}
            </View>
          </View>
        )}

        {ingredients.length === 0 && (
          <GlassCard style={styles.emptyCard} intensity="light">
            <Text style={styles.emptyEmoji}>🥬🍅🧅</Text>
            <Text style={styles.emptyText}>Your kitchen's quiet…</Text>
            <Text style={styles.emptySubtext}>Add some ingredients and let's cook something amazing.</Text>
          </GlassCard>
        )}

        {ingredients.length > 0 && (
          <Pressable
            onPress={handleGetIdeas}
            disabled={generateMutation.isPending}
            style={[styles.generateBtn, generateMutation.isPending && styles.generateBtnDisabled]}
          >
            <LinearGradient colors={[Colors.accent, "#E8872E"]} style={styles.generateGrad}>
              {generateMutation.isPending ? (
                <Text style={styles.generateText}>Cooking up recipes…</Text>
              ) : (
                <>
                  <Sparkles size={18} color={Colors.dark} />
                  <Text style={styles.generateText}>Get ideas</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scrollContent: { paddingHorizontal: Spacing.xl },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.sm },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: { color: Colors.white, fontSize: FontSize.xl, fontWeight: "700" },
  subtitle: { color: Colors.textTertiary, fontSize: FontSize.sm, marginBottom: Spacing.xl },
  inputRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.xl },
  textInput: {
    flex: 1,
    height: 48,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.inputBg,
    paddingHorizontal: Spacing.lg,
    color: Colors.white,
    fontSize: FontSize.sm,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.xl,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnDisabled: { opacity: 0.5 },
  chipsSection: { marginBottom: Spacing.xl },
  chipsLabel: { color: Colors.textTertiary, fontSize: FontSize.sm, marginBottom: Spacing.sm },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  emptyCard: { padding: Spacing.xxl, alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.xl },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.lg, fontWeight: "600" },
  emptySubtext: { color: Colors.textTertiary, fontSize: FontSize.sm, textAlign: "center" },
  generateBtn: { borderRadius: Radius.xl, overflow: "hidden", marginTop: Spacing.lg },
  generateBtnDisabled: { opacity: 0.7 },
  generateGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
  },
  generateText: { color: Colors.dark, fontSize: FontSize.lg, fontWeight: "700" },
});
