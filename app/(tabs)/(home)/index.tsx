import React, { useRef, useEffect, useMemo } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ScanLine,
  Sparkles,
  Crown,
  ChefHat,
  Bell,
  Maximize2,
  Plus,
  Check,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors, { Radius, Spacing, FontSize } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useRecipes } from "@/contexts/RecipeContext";

const CHEF_PLAN_PURPLE = "#A855F7";
const CHEF_PLAN_PURPLE_SOFT = "rgba(168, 85, 247, 0.2)";

// Build current week (Sunday .. Saturday) with day label and date number
function useWeekDays() {
  return useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    const days = [];
    const labels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        label: labels[i],
        dateNum: d.getDate(),
        isToday: i === dayOfWeek,
      });
    }
    return days;
  }, []);
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, canScan } = useAuth();
  const { recipes } = useRecipes();
  const headerFade = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const weekDays = useWeekDays();

  useEffect(() => {
    Animated.stagger(200, [
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(contentFade, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleScanPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (!canScan) {
      router.push("/paywall" as any);
      return;
    }
    router.push("/(tabs)/scan" as any);
  };

  const displayName = user.name || "Chef";
  const recentlyCooked = [...recipes]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const mealsNeeded = 7;
  const cardWidth = (Dimensions.get("window").width - Spacing.xl * 2 - Spacing.md) / 2;

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0D0B0A", "#110E0B", "#0A0806"]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: Welcome back + Chef, avatar with green dot, bell */}
        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarWrap}>
              <Pressable onPress={() => router.push("/(tabs)/profile" as any)} style={styles.avatarBtn} hitSlop={8}>
                <LinearGradient colors={[Colors.accent, "#E8872E"]} style={styles.avatarGrad}>
                  <ChefHat size={22} color={Colors.dark} strokeWidth={2.5} />
                </LinearGradient>
              </Pressable>
              <View style={styles.greenDot} />
            </View>
            <View>
              <Text style={styles.welcomeBack}>WELCOME BACK,</Text>
              <Text style={styles.userName}>{displayName}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => {}}
            style={styles.bellWrap}
            hitSlop={8}
          >
            <Bell size={24} color={Colors.textPrimary} />
            <View style={styles.bellDot} />
          </Pressable>
        </Animated.View>

        <Animated.View style={{ opacity: contentFade }}>
          {/* This Week - day circles */}
          <Text style={styles.thisWeekLabel}>This Week</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekRow}
          >
            {weekDays.map((day) => (
              <Pressable
                key={day.key}
                style={[styles.dayCircle, day.isToday && styles.dayCircleToday]}
                onPress={() => {}}
              >
                <Text style={[styles.dayCircleLabel, day.isToday && styles.dayCircleLabelToday]}>
                  {day.label} {day.dateNum}
                </Text>
                <View style={styles.dayCirclePlus}>
                  <Plus size={28} color={day.isToday ? Colors.accent : Colors.textSecondary} strokeWidth={2.5} />
                </View>
              </Pressable>
            ))}
          </ScrollView>

          {/* Two cards: Scan Ingredients + Chef's Plan */}
          <View style={styles.twoCardsRow}>
            <Pressable onPress={handleScanPress} style={[styles.bigCard, { width: cardWidth }]} testID="scan-action">
              <LinearGradient
                colors={["#1a1510", "#0D0B0A"]}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={["rgba(245,148,58,0.25)", "transparent"]}
                style={styles.scanCardGrad}
              />
              <View style={styles.scanCardContent}>
                <View style={styles.scanCardTop}>
                  <View style={styles.scanCardIconWrap}>
                    <Maximize2 size={20} color={Colors.accent} strokeWidth={2.5} />
                  </View>
                  <View style={styles.aiLensBadge}>
                    <Sparkles size={10} color={Colors.white} />
                    <Text style={styles.aiLensText}>AI LENS</Text>
                  </View>
                </View>
                <Text style={styles.scanCardTitle}>Scan Ingredients</Text>
                <Text style={styles.scanCardSub}>Snap food, get recipes</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push("/(tabs)/history" as any)}
              style={[styles.bigCard, styles.chefPlanCard, { width: cardWidth }]}
            >
              <LinearGradient
                colors={["#1a1510", "#0D0B0A"]}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={[CHEF_PLAN_PURPLE_SOFT, "transparent"]}
                style={styles.chefPlanGrad}
              />
              <View style={styles.chefPlanContent}>
                <View style={styles.chefPlanIconWrap}>
                  <ChefHat size={24} color={CHEF_PLAN_PURPLE} strokeWidth={2.5} />
                </View>
                <Text style={styles.chefPlanTitle}>Chef's Plan</Text>
                <Text style={styles.chefPlanSub}>{mealsNeeded} meals needed</Text>
                <View style={styles.chefPlanDots}>
                  <View style={styles.chefPlanDotGray} />
                  <View style={styles.chefPlanDotGray} />
                  <View style={styles.chefPlanDotGray} />
                  <View style={styles.chefPlanDotPurple}>
                    <Text style={styles.chefPlanDotText}>+{mealsNeeded}</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          </View>

          {!canScan && (
            <Pressable onPress={() => router.push("/paywall" as any)} style={styles.limitBanner} testID="limit-banner">
              <Crown size={15} color={Colors.amber} />
              <Text style={styles.limitText}>Scan limit reached — Upgrade to Premium</Text>
            </Pressable>
          )}

          {/* Recently Cooked */}
          <Text style={styles.recentSectionTitle}>RECENTLY COOKED</Text>
          {recentlyCooked.length > 0 ? (
            <View style={styles.recentList}>
              {recentlyCooked.map((recipe) => (
                <Pressable
                  key={recipe.id}
                  style={styles.recentItem}
                  onPress={() => router.push(`/recipe/${recipe.id}` as any)}
                >
                  <View style={styles.recentItemLeft}>
                    <Text style={styles.recentItemTitle}>{recipe.title}</Text>
                    <Text style={styles.recentItemSub}>Cook it again or open the recipe details</Text>
                  </View>
                  <View style={styles.recentItemCheck}>
                    <Check size={18} color={Colors.dark} strokeWidth={3} />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.recentEmpty}>
              <Text style={styles.recentEmptyText}>No recent cooks yet. Scan ingredients to get started.</Text>
            </View>
          )}

          <View style={{ height: 32 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scrollContent: { paddingHorizontal: Spacing.xl },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  avatarWrap: { position: "relative" },
  avatarBtn: { width: 48, height: 48, borderRadius: 24, overflow: "hidden" },
  avatarGrad: { flex: 1, justifyContent: "center", alignItems: "center" },
  greenDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: Colors.dark,
  },
  welcomeBack: {
    color: Colors.textTertiary,
    fontSize: FontSize.xs,
    fontWeight: "600",
    letterSpacing: 1,
  },
  userName: {
    color: Colors.white,
    fontSize: FontSize.xxl,
    fontWeight: "700",
    marginTop: 2,
  },
  bellWrap: { position: "relative", padding: 4 },
  bellDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.coral,
  },
  thisWeekLabel: {
    color: Colors.textPrimary,
    fontSize: FontSize.xs,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  weekRow: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  dayCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.darkCard,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  dayCircleToday: {
    borderColor: "rgba(245,148,58,0.5)",
    backgroundColor: Colors.darkElevated,
  },
  dayCircleLabel: {
    position: "absolute",
    top: 6,
    left: 0,
    right: 0,
    textAlign: "center",
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
  },
  dayCircleLabelToday: { color: Colors.accent },
  dayCirclePlus: { justifyContent: "center", alignItems: "center" },
  twoCardsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  bigCard: {
    height: 200,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  scanCardGrad: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
  },
  scanCardContent: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: "space-between",
  },
  scanCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  scanCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: "rgba(30,26,22,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  aiLensBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245,148,58,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: "rgba(245,148,58,0.3)",
  },
  aiLensText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  scanCardTitle: {
    color: Colors.white,
    fontSize: FontSize.xl,
    fontWeight: "800",
  },
  scanCardSub: {
    color: Colors.textTertiary,
    fontSize: FontSize.xs,
  },
  chefPlanCard: {},
  chefPlanGrad: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
  },
  chefPlanContent: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: "space-between",
  },
  chefPlanIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: "rgba(30,26,22,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  chefPlanTitle: {
    color: Colors.white,
    fontSize: FontSize.xl,
    fontWeight: "800",
  },
  chefPlanSub: {
    color: Colors.textTertiary,
    fontSize: FontSize.xs,
  },
  chefPlanDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chefPlanDotGray: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.darkSurface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  chefPlanDotPurple: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: CHEF_PLAN_PURPLE,
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  chefPlanDotText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: "800",
  },
  limitBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.amberSoft,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(245,166,62,0.18)",
  },
  limitText: { flex: 1, color: Colors.amber, fontSize: FontSize.sm, fontWeight: "600" as const },
  recentSectionTitle: {
    color: Colors.textTertiary,
    fontSize: FontSize.xs,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  recentList: { gap: Spacing.sm },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.darkCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  recentItemLeft: { flex: 1 },
  recentItemTitle: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  recentItemSub: {
    color: Colors.textTertiary,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  recentItemCheck: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: Spacing.md,
  },
  recentEmpty: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  recentEmptyText: {
    color: Colors.textTertiary,
    fontSize: FontSize.sm,
  },
});
