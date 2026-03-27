import React, { useState, useMemo, useRef } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Heart, Clock, Filter, Search, ScanLine, BookOpen, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors, { Radius, Spacing, FontSize } from "@/constants/colors";
import RecipeCard from "@/components/RecipeCard";
import { useRecipes } from "@/contexts/RecipeContext";

type FilterType = "all" | "favorites" | "recent";

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { recipes, favorites, toggleFavorite } = useRecipes();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchAnim = useRef(new Animated.Value(0)).current;

  const toggleSearch = () => {
    const next = !showSearch;
    setShowSearch(next);
    Animated.timing(searchAnim, {
      toValue: next ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
    if (!next) setSearchQuery("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const filteredRecipes = useMemo(() => {
    let list = recipes;
    switch (activeFilter) {
      case "favorites":
        list = favorites;
        break;
      case "recent":
        list = [...recipes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);
        break;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) =>
        r.title.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q)) ||
        r.ingredients.some((i) => i.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeFilter, recipes, favorites, searchQuery]);

  const filters: { key: FilterType; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "All", icon: <BookOpen size={13} color={activeFilter === "all" ? Colors.dark : Colors.textSecondary} /> },
    { key: "favorites", label: "Favorites", icon: <Heart size={13} color={activeFilter === "favorites" ? Colors.dark : Colors.textSecondary} /> },
    { key: "recent", label: "Recent", icon: <Clock size={13} color={activeFilter === "recent" ? Colors.dark : Colors.textSecondary} /> },
  ];

  const searchHeight = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 52],
  });

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0D0B0A", "#110E0B", "#0A0806"]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Cookbook</Text>
            <Text style={styles.subtitle}>{recipes.length} recipe{recipes.length !== 1 ? "s" : ""} in your collection</Text>
          </View>
          <Pressable onPress={toggleSearch} style={[styles.searchToggle, showSearch && styles.searchToggleActive]} hitSlop={8} testID="search-toggle">
            {showSearch ? <X size={18} color={Colors.accent} /> : <Search size={18} color={Colors.textSecondary} />}
          </Pressable>
        </View>

        <Animated.View style={[styles.searchWrap, { height: searchHeight, opacity: searchAnim }]}>
          <View style={styles.searchInputWrap}>
            <Search size={16} color={Colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search recipes, tags, ingredients..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              testID="search-input"
            />
          </View>
        </Animated.View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {filters.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => {
                setActiveFilter(f.key);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.filterChip,
                activeFilter === f.key && styles.filterChipActive,
              ]}
              testID={`filter-${f.key}`}
            >
              {f.icon}
              <Text
                style={[
                  styles.filterLabel,
                  activeFilter === f.key && styles.filterLabelActive,
                ]}
              >
                {f.label}
              </Text>
              {f.key === "favorites" && favorites.length > 0 && (
                <View style={[styles.filterCount, activeFilter === f.key && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, activeFilter === f.key && styles.filterCountTextActive]}>
                    {favorites.length}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>

        {filteredRecipes.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              {activeFilter === "favorites" ? (
                <Heart size={32} color={Colors.textTertiary} />
              ) : (
                <BookOpen size={32} color={Colors.textTertiary} />
              )}
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery
                ? "No results found"
                : activeFilter === "favorites"
                  ? "No favorites yet"
                  : "No recipes yet"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `Try a different search term`
                : activeFilter === "favorites"
                  ? "Heart a recipe to save it here"
                  : "Scan some ingredients to generate recipes"}
            </Text>
            {!searchQuery && activeFilter !== "favorites" && (
              <Pressable
                onPress={() => router.push("/(tabs)/scan" as any)}
                style={styles.emptyCta}
                testID="empty-scan-cta"
              >
                <ScanLine size={16} color={Colors.dark} />
                <Text style={styles.emptyCtaText}>Start Scanning</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.recipesList}>
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onPress={() => router.push(`/recipe/${recipe.id}` as any)}
                variant="compact"
                onFavorite={() => toggleFavorite(recipe.id)}
              />
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scrollContent: { paddingHorizontal: Spacing.xl },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  title: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: "800" as const, marginBottom: 4 },
  subtitle: { color: Colors.textTertiary, fontSize: FontSize.sm },
  searchToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glass,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  searchToggleActive: {
    backgroundColor: Colors.accentSoft,
    borderColor: "rgba(245, 148, 58, 0.25)",
  },
  searchWrap: { overflow: "hidden", marginBottom: Spacing.md },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: Spacing.md,
    height: 46,
    gap: Spacing.sm,
  },
  searchInput: { flex: 1, color: Colors.white, fontSize: FontSize.sm },
  filtersRow: { gap: Spacing.sm, marginBottom: Spacing.xl, paddingRight: Spacing.xl },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    minHeight: 38,
  },
  filterChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: "600" as const },
  filterLabelActive: { color: Colors.dark },
  filterCount: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  filterCountActive: {
    backgroundColor: "rgba(13,11,10,0.2)",
  },
  filterCountText: { color: Colors.textTertiary, fontSize: 10, fontWeight: "700" as const },
  filterCountTextActive: { color: Colors.dark },
  recipesList: { gap: Spacing.md },
  emptyState: { alignItems: "center", paddingVertical: Spacing.huge },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.glass,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: { color: Colors.white, fontSize: FontSize.lg, fontWeight: "700" as const, marginBottom: Spacing.sm },
  emptySubtitle: { color: Colors.textTertiary, fontSize: FontSize.sm, textAlign: "center" as const, lineHeight: 22, maxWidth: 260 },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    marginTop: Spacing.xl,
  },
  emptyCtaText: { color: Colors.dark, fontSize: FontSize.sm, fontWeight: "600" as const },
});
