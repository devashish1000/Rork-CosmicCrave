import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Share,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Heart,
  Clock,
  Flame,
  Users,
  ChefHat,
  Play,
  Share2,
  Sparkles,
  Check,
  BookOpen,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors, { Radius, Spacing, FontSize } from "@/constants/colors";
import GlassCard from "@/components/GlassCard";
import { useRecipes } from "@/contexts/RecipeContext";
import { useCookbooks } from "@/contexts/CookbooksContext";
import { Recipe } from "@/types/recipe";

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getRecipeById, toggleFavorite } = useRecipes();
  const { saveRecipeToCookbook, isRecipeSavedInCookbook } = useCookbooks();
  const recipe = getRecipeById(id ?? "");
  const scrollY = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showSaveToast, setShowSaveToast] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const isSaved = recipe && isRecipeSavedInCookbook(recipe.id, "saved");

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  if (!recipe) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient colors={["#0D0B0A", "#110E0B", "#0A0806"]} style={StyleSheet.absoluteFill} />
        <View style={styles.notFound}>
          <View style={styles.notFoundIcon}>
            <BookOpen size={32} color={Colors.textTertiary} />
          </View>
          <Text style={styles.notFoundText}>Recipe not found</Text>
          <Text style={styles.notFoundSub}>This recipe may have been removed</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtnAlt}>
            <Text style={styles.backBtnAltText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const formatRecipeForSharing = useCallback((r: Recipe): string => {
    const lines: string[] = [];
    lines.push(`🍳 ${r.title}`);
    lines.push("");
    lines.push(r.description);
    lines.push("");
    lines.push(`⏱ ${r.prepTime + r.cookTime} min  ·  🔥 ${r.calories} cal  ·  👤 ${r.servings} servings  ·  ${r.difficulty}`);
    lines.push("");
    lines.push("📝 Ingredients:");
    r.ingredients.forEach((ing) => {
      lines.push(`  • ${ing.name} — ${ing.amount} ${ing.unit}`);
    });
    lines.push("");
    lines.push("👨‍🍳 Steps:");
    r.steps.forEach((step) => {
      lines.push(`  ${step.step}. ${step.title}`);
      lines.push(`     ${step.description}`);
    });
    if (r.tips.length > 0) {
      lines.push("");
      lines.push("💡 Tips:");
      r.tips.forEach((tip) => {
        lines.push(`  • ${tip}`);
      });
    }
    lines.push("");
    lines.push("Made with ChefAI 🤖✨");
    return lines.join("\n");
  }, []);

  const handleShare = useCallback(async () => {
    if (!recipe) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const shareText = formatRecipeForSharing(recipe);
    try {
      console.log("[Share] Sharing recipe:", recipe.title);
      await Share.share({ message: shareText, title: recipe.title });
    } catch (error) {
      console.log("[Share] Error sharing:", error);
    }
  }, [recipe, formatRecipeForSharing]);

  const handleFavorite = () => {
    toggleFavorite(recipe.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.4, duration: 150, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();

    if (!recipe.isFavorite) {
      setShowSaveToast(true);
      Animated.sequence([
        Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setShowSaveToast(false));
    }
  };

  const imageHeight = scrollY.interpolate({
    inputRange: [-100, 0, 300],
    outputRange: [380, 280, 180],
    extrapolate: "clamp",
  });

  const imageOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0.4],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={["#0D0B0A", "#110E0B", "#0A0806"]} style={StyleSheet.absoluteFill} />

      <Animated.View style={[styles.heroImage, { height: imageHeight, opacity: imageOpacity }]}>
        <Image source={{ uri: recipe.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={["transparent", "rgba(13,11,10,0.75)", Colors.dark]} style={styles.heroOverlay} />
      </Animated.View>

      <View style={[styles.headerBar, { top: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
          <ArrowLeft size={20} color={Colors.white} />
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable onPress={handleShare} style={styles.headerBtn} hitSlop={8} testID="share-button">
            <Share2 size={17} color={Colors.white} />
          </Pressable>
          <Pressable onPress={handleFavorite} style={styles.headerBtn} hitSlop={8} testID="favorite-button">
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Heart
                size={19}
                color={recipe.isFavorite ? Colors.coral : Colors.white}
                fill={recipe.isFavorite ? Colors.coral : "transparent"}
              />
            </Animated.View>
          </Pressable>
        </View>
      </View>

      {showSaveToast && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity, top: insets.top + 56 }]}>
          <Check size={14} color={Colors.accent} />
          <Text style={styles.toastText}>Saved to Cookbook</Text>
        </Animated.View>
      )}

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={{ height: 240 }} />

          <View style={styles.titleSection}>
            <View style={styles.diffBadge}>
              <ChefHat size={12} color={Colors.white} />
              <Text style={styles.diffText}>{recipe.difficulty}</Text>
            </View>
            <Text style={styles.recipeTitle}>{recipe.title}</Text>
            <Text style={styles.recipeDesc}>{recipe.description}</Text>
          </View>

          <View style={styles.metaStrip}>
            <View style={styles.metaItem}>
              <Clock size={16} color={Colors.accent} />
              <Text style={styles.metaValue}>{recipe.prepTime + recipe.cookTime}m</Text>
              <Text style={styles.metaLabel}>Total</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Flame size={16} color={Colors.accentSecondary} />
              <Text style={styles.metaValue}>{recipe.calories}</Text>
              <Text style={styles.metaLabel}>Cal</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Users size={16} color={Colors.accent} />
              <Text style={styles.metaValue}>{recipe.servings}</Text>
              <Text style={styles.metaLabel}>Servings</Text>
            </View>
          </View>

          <View style={styles.tagsRow}>
            {recipe.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>

          <GlassCard style={styles.nutritionCard} intensity="medium">
            <Text style={styles.sectionTitle}>Nutrition</Text>
            <View style={styles.nutritionGrid}>
              {[
                { label: "Protein", value: `${recipe.nutrition.protein}g`, color: Colors.accent },
                { label: "Carbs", value: `${recipe.nutrition.carbs}g`, color: Colors.accentSecondary },
                { label: "Fat", value: `${recipe.nutrition.fat}g`, color: Colors.coral },
                { label: "Fiber", value: `${recipe.nutrition.fiber}g`, color: Colors.lime },
              ].map((n) => (
                <View key={n.label} style={styles.nutritionItem}>
                  <View style={[styles.nutritionDot, { backgroundColor: n.color }]} />
                  <Text style={[styles.nutritionValue, { color: n.color }]}>{n.value}</Text>
                  <Text style={styles.nutritionLabel}>{n.label}</Text>
                </View>
              ))}
            </View>
          </GlassCard>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            <GlassCard style={styles.ingredientsList} intensity="light">
              {recipe.ingredients.map((ing, i) => (
                <View key={i} style={[styles.ingredientRow, i < recipe.ingredients.length - 1 && styles.ingredientBorder]}>
                  <View style={styles.ingredientDot} />
                  <Text style={styles.ingredientName}>{ing.name}</Text>
                  <Text style={styles.ingredientAmount}>{ing.amount} {ing.unit}</Text>
                </View>
              ))}
            </GlassCard>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Steps</Text>
            {recipe.steps.map((step, i) => (
              <GlassCard key={i} style={styles.stepCard} intensity="light">
                <View style={styles.stepHeader}>
                  <LinearGradient colors={[Colors.accent, "#E8872E"]} style={styles.stepNumCircle}>
                    <Text style={styles.stepNum}>{step.step}</Text>
                  </LinearGradient>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  {step.duration && (
                    <View style={styles.stepDuration}>
                      <Clock size={11} color={Colors.textTertiary} />
                      <Text style={styles.stepDurationText}>{step.duration}m</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.stepDesc}>{step.description}</Text>
              </GlassCard>
            ))}
          </View>

          {recipe.tips.length > 0 && (
            <GlassCard style={styles.tipsCard} intensity="medium">
              <View style={styles.tipsHeader}>
                <Sparkles size={15} color={Colors.accent} />
                <Text style={styles.tipsTitle}>Chef Tips</Text>
              </View>
              {recipe.tips.map((tip, i) => (
                <Text key={i} style={styles.tipText}>💡 {tip}</Text>
              ))}
            </GlassCard>
          )}

          {!isSaved && (
            <Pressable
              onPress={() => {
                saveRecipeToCookbook(recipe.id, "saved");
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowSaveToast(true);
                Animated.sequence([
                  Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                  Animated.delay(1500),
                  Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
                ]).start(() => setShowSaveToast(false));
              }}
              style={styles.saveToCookbookBtn}
            >
              <BookOpen size={18} color={Colors.accent} />
              <Text style={styles.saveToCookbookText}>Add to Cookbook</Text>
            </Pressable>
          )}
          <Pressable onPress={() => router.push(`/cook/${recipe.id}` as any)} style={styles.cookBtn} testID="cook-mode-button">
            <LinearGradient colors={[Colors.accent, "#E8872E"]} style={styles.cookBtnGrad}>
              <Play size={20} color={Colors.dark} fill={Colors.dark} />
              <Text style={styles.cookBtnText}>Start cooking</Text>
            </LinearGradient>
          </Pressable>

          <View style={{ height: 60 }} />
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  heroImage: { position: "absolute" as const, top: 0, left: 0, right: 0, zIndex: 0 },
  heroOverlay: { position: "absolute" as const, bottom: 0, left: 0, right: 0, height: 160 },
  headerBar: {
    position: "absolute" as const,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerActions: { flexDirection: "row", gap: Spacing.sm },
  toast: {
    position: "absolute" as const,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "rgba(23,20,19,0.95)",
    borderWidth: 1,
    borderColor: "rgba(245,148,58,0.25)",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    zIndex: 20,
  },
  toastText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: "600" as const },
  scrollContent: { paddingHorizontal: Spacing.xl },
  titleSection: { marginBottom: Spacing.xl },
  diffBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    alignSelf: "flex-start",
    marginBottom: Spacing.sm,
  },
  diffText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: "600" as const },
  recipeTitle: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: "800" as const, marginBottom: Spacing.sm, lineHeight: 32 },
  recipeDesc: { color: Colors.textSecondary, fontSize: FontSize.md, lineHeight: 22 },
  metaStrip: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: Colors.glass,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  metaItem: { alignItems: "center", gap: 4 },
  metaValue: { color: Colors.white, fontSize: FontSize.lg, fontWeight: "700" as const },
  metaLabel: { color: Colors.textTertiary, fontSize: FontSize.xs },
  metaDivider: { width: 1, backgroundColor: Colors.glassBorder },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginBottom: Spacing.xxl },
  tag: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: "rgba(245,148,58,0.2)",
  },
  tagText: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: "600" as const },
  nutritionCard: { padding: Spacing.lg, marginBottom: Spacing.xxl },
  sectionTitle: { color: Colors.white, fontSize: FontSize.lg, fontWeight: "700" as const, marginBottom: Spacing.md },
  nutritionGrid: { flexDirection: "row", justifyContent: "space-around" },
  nutritionItem: { alignItems: "center", gap: 4 },
  nutritionDot: { width: 6, height: 6, borderRadius: 3 },
  nutritionValue: { fontSize: FontSize.xl, fontWeight: "800" as const },
  nutritionLabel: { color: Colors.textTertiary, fontSize: FontSize.xs },
  section: { marginBottom: Spacing.xxl },
  ingredientsList: { padding: Spacing.lg },
  ingredientRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, gap: 12 },
  ingredientBorder: { borderBottomWidth: 1, borderBottomColor: Colors.glass },
  ingredientDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  ingredientName: { flex: 1, color: Colors.white, fontSize: FontSize.sm, fontWeight: "500" as const },
  ingredientAmount: { color: Colors.textTertiary, fontSize: FontSize.sm },
  stepCard: { padding: Spacing.lg, marginBottom: Spacing.sm },
  stepHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: Spacing.sm },
  stepNumCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  stepNum: { color: Colors.dark, fontSize: FontSize.sm, fontWeight: "700" as const },
  stepTitle: { flex: 1, color: Colors.white, fontSize: FontSize.md, fontWeight: "600" as const },
  stepDuration: { flexDirection: "row", alignItems: "center", gap: 4 },
  stepDurationText: { color: Colors.textTertiary, fontSize: FontSize.xs },
  stepDesc: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 22, paddingLeft: 40 },
  tipsCard: { padding: Spacing.lg, marginBottom: Spacing.xxl },
  tipsHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.md },
  tipsTitle: { color: Colors.accent, fontSize: FontSize.md, fontWeight: "700" as const },
  tipText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 22, marginBottom: 6 },
  saveToCookbookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: "rgba(245,148,58,0.35)",
    backgroundColor: Colors.accentSoft,
    marginBottom: Spacing.md,
  },
  saveToCookbookText: { color: Colors.accent, fontSize: FontSize.md, fontWeight: "600" as const },
  cookBtn: { borderRadius: Radius.xl, overflow: "hidden", marginBottom: Spacing.xl },
  cookBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
  },
  cookBtnText: { color: Colors.dark, fontSize: FontSize.lg, fontWeight: "700" as const },
  notFound: { flex: 1, justifyContent: "center", alignItems: "center", gap: Spacing.md, paddingHorizontal: Spacing.xxxl },
  notFoundIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.glass,
    justifyContent: "center",
    alignItems: "center",
  },
  notFoundText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: "600" as const },
  notFoundSub: { color: Colors.textTertiary, fontSize: FontSize.sm },
  backBtnAlt: { backgroundColor: Colors.accent, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md, borderRadius: Radius.pill, marginTop: Spacing.sm },
  backBtnAltText: { color: Colors.dark, fontSize: FontSize.md, fontWeight: "600" as const },
});
