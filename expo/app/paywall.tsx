import React, { useRef, useEffect } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Crown, X, Check, Sparkles, Zap, Shield, Star } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors, { Radius, Spacing, FontSize } from "@/constants/colors";
import GlassCard from "@/components/GlassCard";
import { useAuth } from "@/contexts/AuthContext";

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();
  const crownAnim = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.spring(crownAnim, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, friction: 8 }),
      Animated.timing(contentFade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleUpgrade = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateProfile({ tier: "premium", scanLimit: 100, scansUsed: 0 });
    router.back();
  };

  const features = [
    { icon: <Zap size={17} color={Colors.accent} />, title: "100 scans per month", desc: "20x more than the free plan" },
    { icon: <Sparkles size={17} color={Colors.accentSecondary} />, title: "Priority AI processing", desc: "Faster, richer recipe generation" },
    { icon: <Crown size={17} color={Colors.coral} />, title: "Advanced personalization", desc: "Better taste matching over time" },
    { icon: <Shield size={17} color={Colors.lime} />, title: "Exclusive recipes", desc: "Chef-curated premium content" },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, presentation: "modal" }} />
      <LinearGradient colors={["#0D0B0A", "#1A1208", "#0D0B0A"]} style={StyleSheet.absoluteFill} />

      <Pressable onPress={() => router.back()} style={[styles.closeBtn, { top: insets.top + 12 }]} hitSlop={8}>
        <X size={18} color={Colors.textSecondary} />
      </Pressable>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 56 }]} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.crownWrap, { transform: [{ scale: crownAnim }] }]}>
          <LinearGradient colors={[Colors.accent, "#E8872E", Colors.accent]} style={styles.crownCircle}>
            <Crown size={36} color={Colors.dark} />
          </LinearGradient>
        </Animated.View>

        <Text style={styles.title}>Upgrade to Premium</Text>
        <Text style={styles.subtitle}>Unlock the full power of AI cooking</Text>

        <Animated.View style={{ transform: [{ scale: cardScale }], width: "100%" }}>
          <GlassCard style={styles.compareCard} intensity="medium">
            <View style={styles.compareHeader}>
              <View style={styles.compareCol}>
                <Text style={styles.planLabel}>Free</Text>
                <Text style={styles.planPrice}>$0</Text>
                <Text style={styles.planPeriod}>forever</Text>
              </View>
              <View style={styles.vs}>
                <Text style={styles.vsText}>vs</Text>
              </View>
              <View style={styles.compareCol}>
                <View style={styles.premBadge}>
                  <Star size={10} color={Colors.accent} />
                  <Text style={styles.planLabelPrem}>Premium</Text>
                </View>
                <Text style={[styles.planPrice, { color: Colors.accent }]}>$4.99</Text>
                <Text style={styles.planPeriod}>/month</Text>
              </View>
            </View>

            <View style={styles.compareDivider} />

            <CompareRow label="Scans" free="5/week" prem="100/month" />
            <CompareRow label="AI quality" free="Standard" prem="Priority" />
            <CompareRow label="Personalization" free="Basic" prem="Advanced" />
            <CompareRow label="Premium recipes" free="—" prem="✓" />
          </GlassCard>
        </Animated.View>

        <Animated.View style={{ opacity: contentFade, width: "100%" }}>
          <View style={styles.featuresList}>
            {features.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={styles.featureIconWrap}>{f.icon}</View>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
                <Check size={15} color={Colors.accent} />
              </View>
            ))}
          </View>

          <Pressable onPress={handleUpgrade} style={styles.upgradeBtn} testID="upgrade-button">
            <LinearGradient colors={[Colors.accent, "#E8872E"]} style={styles.upgradeBtnGrad}>
              <Crown size={18} color={Colors.dark} />
              <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
            </LinearGradient>
          </Pressable>

          <Pressable style={styles.restoreBtn} hitSlop={8}>
            <Text style={styles.restoreText}>Restore purchases</Text>
          </Pressable>

          <Text style={styles.termsText}>Cancel anytime · Terms of Service · Privacy Policy</Text>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function CompareRow({ label, free, prem }: { label: string; free: string; prem: string }) {
  return (
    <View style={compareStyles.row}>
      <Text style={compareStyles.label}>{label}</Text>
      <Text style={compareStyles.free}>{free}</Text>
      <Text style={compareStyles.prem}>{prem}</Text>
    </View>
  );
}

const compareStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 9 },
  label: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm },
  free: { width: 72, textAlign: "center" as const, color: Colors.textTertiary, fontSize: FontSize.sm },
  prem: { width: 72, textAlign: "center" as const, color: Colors.accent, fontSize: FontSize.sm, fontWeight: "600" as const },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  closeBtn: {
    position: "absolute" as const,
    right: Spacing.xl,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glass,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: { paddingHorizontal: Spacing.xxl, alignItems: "center" },
  crownWrap: { marginBottom: Spacing.xl },
  crownCircle: { width: 76, height: 76, borderRadius: 38, justifyContent: "center", alignItems: "center" },
  title: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: "800" as const, textAlign: "center" as const, marginBottom: Spacing.sm },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.md, textAlign: "center" as const, marginBottom: Spacing.xxl, maxWidth: 280 },
  compareCard: { padding: Spacing.xl, marginBottom: Spacing.xxl },
  compareHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", marginBottom: Spacing.lg },
  compareCol: { alignItems: "center" },
  vs: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.glass, justifyContent: "center", alignItems: "center" },
  vsText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: "600" as const },
  planLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: "600" as const, marginBottom: 4 },
  planLabelPrem: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: "700" as const },
  premBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    marginBottom: 4,
  },
  planPrice: { color: Colors.white, fontSize: FontSize.xxxl, fontWeight: "800" as const },
  planPeriod: { color: Colors.textTertiary, fontSize: FontSize.xs },
  compareDivider: { height: 1, backgroundColor: Colors.glassBorder, marginBottom: Spacing.sm },
  featuresList: { width: "100%", gap: Spacing.md, marginBottom: Spacing.xxl },
  featureRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, paddingVertical: 4 },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: Colors.glass,
    justifyContent: "center",
    alignItems: "center",
  },
  featureInfo: { flex: 1 },
  featureTitle: { color: Colors.white, fontSize: FontSize.md, fontWeight: "600" as const },
  featureDesc: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },
  upgradeBtn: { width: "100%", borderRadius: Radius.xl, overflow: "hidden", marginBottom: Spacing.lg },
  upgradeBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
  },
  upgradeBtnText: { color: Colors.dark, fontSize: FontSize.lg, fontWeight: "700" as const },
  restoreBtn: { paddingVertical: Spacing.sm },
  restoreText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: "500" as const },
  termsText: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: "center" as const, marginTop: Spacing.sm },
});
