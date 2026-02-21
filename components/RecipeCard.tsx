import React, { useRef, useCallback } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Clock, Flame, ChefHat, Heart, Users } from "lucide-react-native";
import Colors, { Radius, Spacing, FontSize } from "@/constants/colors";
import { Recipe } from "@/types/recipe";

interface RecipeCardProps {
  recipe: Recipe;
  onPress: () => void;
  variant?: "large" | "compact" | "featured";
  onFavorite?: () => void;
}

export default function RecipeCard({ recipe, onPress, variant = "large", onFavorite }: RecipeCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, friction: 8 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
  }, [scaleAnim]);

  if (variant === "compact") {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} style={styles.compactCard} testID="recipe-card-compact">
          <Image source={{ uri: recipe.imageUrl }} style={styles.compactImage} contentFit="cover" />
          <View style={styles.compactInfo}>
            <Text style={styles.compactTitle} numberOfLines={2}>{recipe.title}</Text>
            <View style={styles.compactMeta}>
              <View style={styles.metaChip}>
                <Clock size={11} color={Colors.accent} />
                <Text style={styles.metaChipText}>{recipe.cookTime + recipe.prepTime}m</Text>
              </View>
              <View style={styles.metaChip}>
                <Flame size={11} color={Colors.accentSecondary} />
                <Text style={styles.metaChipText}>{recipe.calories}</Text>
              </View>
              <View style={styles.metaChip}>
                <Users size={11} color={Colors.accent} />
                <Text style={styles.metaChipText}>{recipe.servings}</Text>
              </View>
            </View>
            <View style={styles.compactTags}>
              {recipe.tags.slice(0, 2).map((tag) => (
                <View key={tag} style={styles.miniTag}>
                  <Text style={styles.miniTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
          {recipe.isFavorite && (
            <View style={styles.compactHeart}>
              <Heart size={12} color={Colors.coral} fill={Colors.coral} />
            </View>
          )}
        </Pressable>
      </Animated.View>
    );
  }

  if (variant === "featured") {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} style={styles.featuredCard} testID="recipe-card-featured">
          <Image source={{ uri: recipe.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={["transparent", "rgba(13,11,10,0.85)"]} style={styles.featuredOverlay} />
          <View style={styles.featuredContent}>
            <View style={styles.featuredBadgeRow}>
              <View style={styles.diffBadge}>
                <ChefHat size={11} color={Colors.white} />
                <Text style={styles.diffText}>{recipe.difficulty}</Text>
              </View>
              {onFavorite && (
                <Pressable onPress={onFavorite} style={styles.favBtn} hitSlop={8}>
                  <Heart size={16} color={recipe.isFavorite ? Colors.coral : Colors.white} fill={recipe.isFavorite ? Colors.coral : "transparent"} />
                </Pressable>
              )}
            </View>
            <Text style={styles.featuredTitle} numberOfLines={2}>{recipe.title}</Text>
            <Text style={styles.featuredDesc} numberOfLines={1}>{recipe.description}</Text>
            <View style={styles.featuredMeta}>
              <View style={styles.metaPill}>
                <Clock size={12} color={Colors.accent} />
                <Text style={styles.metaPillText}>{recipe.cookTime + recipe.prepTime}m</Text>
              </View>
              <View style={styles.metaPill}>
                <Flame size={12} color={Colors.accentSecondary} />
                <Text style={styles.metaPillText}>{recipe.calories} cal</Text>
              </View>
              <View style={styles.metaPill}>
                <Users size={12} color={Colors.accent} />
                <Text style={styles.metaPillText}>{recipe.servings}</Text>
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} style={styles.card} testID="recipe-card">
        <Image source={{ uri: recipe.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={["transparent", "rgba(13,11,10,0.7)", "rgba(13,11,10,0.92)"]} style={styles.overlay} />
        <View style={styles.cardContent}>
          <View style={styles.topRow}>
            <View style={styles.diffBadge}>
              <ChefHat size={11} color={Colors.white} />
              <Text style={styles.diffText}>{recipe.difficulty}</Text>
            </View>
            {onFavorite && (
              <Pressable onPress={onFavorite} style={styles.favBtn} hitSlop={8}>
                <Heart size={16} color={recipe.isFavorite ? Colors.coral : Colors.white} fill={recipe.isFavorite ? Colors.coral : "transparent"} />
              </Pressable>
            )}
          </View>
          <View style={styles.bottomContent}>
            <Text style={styles.title} numberOfLines={2}>{recipe.title}</Text>
            <Text style={styles.description} numberOfLines={2}>{recipe.description}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <Clock size={12} color={Colors.accent} />
                <Text style={styles.metaPillText}>{recipe.cookTime + recipe.prepTime}m</Text>
              </View>
              <View style={styles.metaPill}>
                <Flame size={12} color={Colors.accentSecondary} />
                <Text style={styles.metaPillText}>{recipe.calories} cal</Text>
              </View>
              {recipe.tags.slice(0, 1).map((tag) => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagPillText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    overflow: "hidden",
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    height: 260,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
    padding: Spacing.lg,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  bottomContent: {
    gap: Spacing.xs,
  },
  diffBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
  },
  diffText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: "600" as const,
  },
  favBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: Colors.white,
    fontSize: FontSize.xl,
    fontWeight: "700" as const,
    lineHeight: 26,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  metaPillText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: "500" as const,
  },
  tagPill: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: "rgba(245, 148, 58, 0.25)",
  },
  tagPillText: {
    color: Colors.accent,
    fontSize: FontSize.xs,
    fontWeight: "600" as const,
  },
  featuredCard: {
    borderRadius: Radius.xxl,
    overflow: "hidden",
    height: 320,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredContent: {
    flex: 1,
    justifyContent: "flex-end",
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  featuredBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  featuredTitle: {
    color: Colors.white,
    fontSize: FontSize.xxl,
    fontWeight: "800" as const,
    lineHeight: 30,
  },
  featuredDesc: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  featuredMeta: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  compactCard: {
    flexDirection: "row",
    backgroundColor: Colors.darkCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: "hidden",
    height: 108,
  },
  compactImage: {
    width: 108,
    height: "100%",
  },
  compactInfo: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: "center",
    gap: Spacing.xs,
  },
  compactTitle: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: "600" as const,
    lineHeight: 20,
  },
  compactMeta: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  compactTags: {
    flexDirection: "row",
    gap: 4,
  },
  compactHeart: {
    position: "absolute" as const,
    top: Spacing.sm,
    right: Spacing.sm,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaChipText: {
    color: Colors.textTertiary,
    fontSize: 10,
    fontWeight: "500" as const,
  },
  miniTag: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: "rgba(245, 148, 58, 0.2)",
  },
  miniTagText: {
    color: Colors.accent,
    fontSize: 10,
    fontWeight: "600" as const,
  },
});
