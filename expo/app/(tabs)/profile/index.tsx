import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Crown,
  LogOut,
  ChevronRight,
  Heart,
  BookOpen,
  Shield,
  FileText,
  Trash2,
  Bell,
  Settings,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors, { Radius, Spacing, FontSize } from "@/constants/colors";
import GlassCard from "@/components/GlassCard";
import IngredientChip from "@/components/IngredientChip";
import { useAuth } from "@/contexts/AuthContext";
import { useRecipes } from "@/contexts/RecipeContext";
import { DIETARY_OPTIONS } from "@/mocks/recipes";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateProfile, logout } = useAuth();
  const { recipes, favorites } = useRecipes();
  const [showDietPicker, setShowDietPicker] = useState(false);

  const toggleDiet = (diet: string) => {
    const current = user.dietaryPreferences;
    const updated = current.includes(diet)
      ? current.filter((d) => d !== diet)
      : [...current, diet];
    updateProfile({ dietaryPreferences: updated });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login" as any);
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/login" as any);
          },
        },
      ]
    );
  };

  const usagePercent = Math.min((user.scansUsed / user.scanLimit) * 100, 100);

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0D0B0A", "#110E0B", "#0A0806"]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarRing}>
            <LinearGradient colors={[Colors.accent, "#E8872E"]} style={styles.avatarLarge}>
              <Text style={styles.avatarLargeText}>{(user.name || "C")[0].toUpperCase()}</Text>
            </LinearGradient>
          </View>
          <Text style={styles.profileName}>{user.name || "Chef"}</Text>
          <Text style={styles.profileEmail}>{user.email || "Set up your email"}</Text>
        </View>

        <GlassCard style={styles.subCard} intensity="medium">
          <View style={styles.subHeader}>
            <View style={styles.subTierWrap}>
              <Crown size={17} color={user.tier === "premium" ? Colors.accent : Colors.textTertiary} />
              <Text style={styles.subTierText}>
                {user.tier === "premium" ? "Premium" : "Free Plan"}
              </Text>
            </View>
            {user.tier === "free" && (
              <Pressable onPress={() => router.push("/paywall" as any)} style={styles.upgradeBtn} testID="upgrade-button">
                <LinearGradient colors={[Colors.accent, "#E8872E"]} style={styles.upgradeBtnGrad}>
                  <Text style={styles.upgradeBtnText}>Upgrade</Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>
          <View style={styles.usageMeter}>
            <View style={styles.usageLabels}>
              <Text style={styles.usageLabel}>Scans used</Text>
              <Text style={styles.usageCount}>
                {user.scansUsed} / {user.scanLimit}
              </Text>
            </View>
            <View style={styles.usageBarBg}>
              <LinearGradient
                colors={usagePercent > 80 ? [Colors.coral, "#E84C4C"] : [Colors.accent, Colors.accentSecondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.usageBarFill, { width: `${usagePercent}%` as `${number}%` }]}
              />
            </View>
            <Text style={styles.usagePeriod}>
              Resets {user.tier === "free" ? "weekly" : "monthly"}
            </Text>
          </View>
        </GlassCard>

        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard} intensity="light">
            <Text style={styles.statValue}>{recipes.length}</Text>
            <Text style={styles.statLabel}>Recipes</Text>
          </GlassCard>
          <GlassCard style={styles.statCard} intensity="light">
            <Text style={styles.statValue}>{favorites.length}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </GlassCard>
          <GlassCard style={styles.statCard} intensity="light">
            <Text style={styles.statValue}>{user.scansUsed}</Text>
            <Text style={styles.statLabel}>Scans</Text>
          </GlassCard>
        </View>

        <View style={styles.section}>
          <Pressable onPress={() => setShowDietPicker(!showDietPicker)} style={styles.sectionHeader} hitSlop={8}>
            <Text style={styles.sectionTitle}>Dietary Preferences</Text>
            <ChevronRight
              size={17}
              color={Colors.textTertiary}
              style={showDietPicker ? { transform: [{ rotate: "90deg" }] } : undefined}
            />
          </Pressable>
          {showDietPicker && (
            <View style={styles.dietChips}>
              {DIETARY_OPTIONS.map((diet) => (
                <IngredientChip
                  key={diet}
                  label={diet}
                  selected={user.dietaryPreferences.includes(diet)}
                  onPress={() => toggleDiet(diet)}
                  color={Colors.accent}
                />
              ))}
            </View>
          )}
          {!showDietPicker && user.dietaryPreferences.length > 0 && (
            <View style={styles.dietChips}>
              {user.dietaryPreferences.map((diet) => (
                <IngredientChip key={diet} label={diet} selected color={Colors.accent} />
              ))}
            </View>
          )}
        </View>

        <GlassCard style={styles.menuCard} intensity="light">
          <MenuItem
            icon={<BookOpen size={18} color={Colors.textSecondary} />}
            label="Cookbook"
            onPress={() => router.push("/(tabs)/history" as any)}
          />
          <MenuItem
            icon={<Heart size={18} color={Colors.coral} />}
            label="Favorites"
            count={favorites.length}
            onPress={() => router.push("/(tabs)/history" as any)}
          />
          <MenuItem
            icon={<Bell size={18} color={Colors.accent} />}
            label="Notifications"
            onPress={() => router.push("/settings" as any)}
            isLast={false}
          />
          <MenuItem
            icon={<Settings size={18} color={Colors.textSecondary} />}
            label="Settings"
            onPress={() => router.push("/settings" as any)}
            isLast={false}
          />
          <MenuItem
            icon={<BookOpen size={18} color={Colors.textSecondary} />}
            label="Cookbooks"
            onPress={() => router.push("/cookbooks" as any)}
            isLast
          />
        </GlassCard>

        <GlassCard style={styles.menuCard} intensity="light">
          <MenuItem
            icon={<Shield size={18} color={Colors.textSecondary} />}
            label="Privacy Policy"
            onPress={() => {}}
          />
          <MenuItem
            icon={<FileText size={18} color={Colors.textSecondary} />}
            label="Terms of Service"
            onPress={() => {}}
          />
          <MenuItem
            icon={<Trash2 size={18} color={Colors.coral} />}
            label="Delete Account"
            labelColor={Colors.coral}
            onPress={handleDeleteAccount}
            isLast
          />
        </GlassCard>

        <Pressable onPress={handleLogout} style={styles.logoutBtn} testID="logout-button">
          <LogOut size={17} color={Colors.coral} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  labelColor?: string;
  count?: number;
  onPress: () => void;
  isLast?: boolean;
}

function MenuItem({ icon, label, labelColor, count, onPress, isLast = false }: MenuItemProps) {
  return (
    <Pressable onPress={onPress} style={[styles.menuItem, !isLast && styles.menuItemBorder]} hitSlop={4}>
      {icon}
      <Text style={[styles.menuLabel, labelColor ? { color: labelColor } : undefined]}>{label}</Text>
      {count !== undefined && count > 0 && (
        <View style={styles.menuCount}>
          <Text style={styles.menuCountText}>{count}</Text>
        </View>
      )}
      <ChevronRight size={15} color={Colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scrollContent: { paddingHorizontal: Spacing.xl },
  profileHeader: { alignItems: "center", marginBottom: Spacing.xxl },
  avatarRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: "rgba(245, 148, 58, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  avatarLarge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLargeText: { color: Colors.dark, fontSize: FontSize.xxxl, fontWeight: "800" as const },
  profileName: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: "700" as const },
  profileEmail: { color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: 4 },
  subCard: { padding: Spacing.xl, marginBottom: Spacing.xl },
  subHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg },
  subTierWrap: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  subTierText: { color: Colors.white, fontSize: FontSize.md, fontWeight: "700" as const },
  upgradeBtn: { borderRadius: Radius.md, overflow: "hidden" },
  upgradeBtnGrad: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.md },
  upgradeBtnText: { color: Colors.dark, fontSize: FontSize.sm, fontWeight: "700" as const },
  usageMeter: { gap: Spacing.sm },
  usageLabels: { flexDirection: "row", justifyContent: "space-between" },
  usageLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  usageCount: { color: Colors.white, fontSize: FontSize.sm, fontWeight: "600" as const },
  usageBarBg: { height: 8, borderRadius: 4, backgroundColor: Colors.glass, overflow: "hidden" },
  usageBarFill: { height: 8, borderRadius: 4 },
  usagePeriod: { color: Colors.textMuted, fontSize: FontSize.xs },
  statsRow: { flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.xxl },
  statCard: { flex: 1, padding: Spacing.lg, alignItems: "center" },
  statValue: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: "800" as const },
  statLabel: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 4 },
  section: { marginBottom: Spacing.xxl },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md },
  sectionTitle: { color: Colors.white, fontSize: FontSize.lg, fontWeight: "700" as const },
  dietChips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  menuCard: { marginBottom: Spacing.lg, overflow: "hidden" },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    minHeight: 52,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.glass,
  },
  menuLabel: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: "500" as const },
  menuCount: {
    backgroundColor: Colors.coralSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  menuCountText: { color: Colors.coral, fontSize: FontSize.xs, fontWeight: "700" as const },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.coralSoft,
    borderWidth: 1,
    borderColor: "rgba(232,76,76,0.18)",
  },
  logoutText: { color: Colors.coral, fontSize: FontSize.md, fontWeight: "600" as const },
});
