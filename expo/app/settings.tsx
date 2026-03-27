import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Shield, HelpCircle, Info, ChevronRight } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Colors, { Radius, Spacing, FontSize } from "@/constants/colors";
import GlassCard from "@/components/GlassCard";

const STORAGE_KEYS = {
  analytics: "rork_privacy_analytics",
  personalization: "rork_privacy_personalization",
  notifications: "rork_notifications",
};

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [allowAnalytics, setAllowAnalytics] = useState(true);
  const [allowPersonalization, setAllowPersonalization] = useState(true);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [a, p, n] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.analytics),
          AsyncStorage.getItem(STORAGE_KEYS.personalization),
          AsyncStorage.getItem(STORAGE_KEYS.notifications),
        ]);
        if (a !== null) setAllowAnalytics(a === "1");
        if (p !== null) setAllowPersonalization(p === "1");
        if (n !== null) setNotifications(n === "1");
      } catch {}
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.analytics, allowAnalytics ? "1" : "0");
  }, [allowAnalytics]);
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.personalization, allowPersonalization ? "1" : "0");
  }, [allowPersonalization]);
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.notifications, notifications ? "1" : "0");
  }, [notifications]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0D0B0A", "#110E0B", "#0A0806"]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
            style={styles.backBtn}
          >
            <ArrowLeft size={22} color={Colors.white} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Support, privacy, and account controls</Text>
          </View>
        </View>

        <GlassCard style={styles.section} intensity="medium">
          <View style={styles.sectionHeader}>
            <Shield size={18} color={Colors.textSecondary} />
            <Text style={styles.sectionTitle}>Privacy</Text>
          </View>
          <Row
            label="Analytics"
            sub="Help us improve the app"
            value={<Switch value={allowAnalytics} onValueChange={(v) => { setAllowAnalytics(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} trackColor={{ false: Colors.glass, true: Colors.accent }} thumbColor={Colors.white} />}
          />
          <Row
            label="Personalization"
            sub="Tailor recipes to your preferences"
            value={<Switch value={allowPersonalization} onValueChange={(v) => { setAllowPersonalization(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} trackColor={{ false: Colors.glass, true: Colors.accent }} thumbColor={Colors.white} />}
            isLast
          />
        </GlassCard>

        <GlassCard style={styles.section} intensity="medium">
          <View style={styles.sectionHeader}>
            <Info size={18} color={Colors.textSecondary} />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>
          <Row
            label="Push notifications"
            sub="Reminders and recipe tips"
            value={<Switch value={notifications} onValueChange={(v) => { setNotifications(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} trackColor={{ false: Colors.glass, true: Colors.accent }} thumbColor={Colors.white} />}
            isLast
          />
        </GlassCard>

        <GlassCard style={styles.section} intensity="light">
          <Pressable onPress={() => {}} style={styles.menuRow}>
            <HelpCircle size={18} color={Colors.textSecondary} />
            <Text style={styles.menuLabel}>Help & Support</Text>
            <ChevronRight size={18} color={Colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => {}} style={[styles.menuRow, styles.menuRowLast]}>
            <Info size={18} color={Colors.textSecondary} />
            <Text style={styles.menuLabel}>About</Text>
            <Text style={styles.menuSub}>v1.0.0</Text>
            <ChevronRight size={18} color={Colors.textMuted} />
          </Pressable>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

function Row({
  label,
  sub,
  value,
  isLast,
}: {
  label: string;
  sub?: string;
  value: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {value}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scrollContent: { paddingHorizontal: Spacing.xl },
  header: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.xxl, gap: Spacing.lg },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.inputBg,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: { flex: 1 },
  title: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: "700" },
  subtitle: { color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: 4 },
  section: { padding: Spacing.xl, marginBottom: Spacing.xl, borderRadius: Radius.xxl },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.lg },
  sectionTitle: { color: Colors.white, fontSize: FontSize.lg, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: Spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.glass },
  rowLeft: { flex: 1 },
  rowLabel: { color: Colors.white, fontSize: FontSize.md, fontWeight: "500" },
  rowSub: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, paddingVertical: Spacing.lg },
  menuRowLast: { borderTopWidth: 1, borderTopColor: Colors.glass },
  menuLabel: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.md },
  menuSub: { color: Colors.textMuted, fontSize: FontSize.sm },
});
