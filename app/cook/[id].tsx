import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, ChevronLeft, ChevronRight, List, Check, Play, Pause, RotateCcw, Clock, PartyPopper } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors, { Radius, Spacing, FontSize } from "@/constants/colors";
import GlassCard from "@/components/GlassCard";
import { useRecipes } from "@/contexts/RecipeContext";

export default function CookModeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getRecipeById } = useRecipes();
  const recipe = getRecipeById(id ?? "");
  const [currentStep, setCurrentStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerTarget, setTimerTarget] = useState(0);
  const stepAnim = useRef(new Animated.Value(1)).current;
  const completionScale = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((s) => {
          if (s >= timerTarget && timerTarget > 0) {
            setTimerRunning(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (timerRef.current) clearInterval(timerRef.current);
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning, timerTarget]);

  if (!recipe) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient colors={["#0D0B0A", "#110E0B", "#0A0806"]} style={StyleSheet.absoluteFill} />
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>Recipe not found</Text>
          <Pressable onPress={() => router.back()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const step = recipe.steps[currentStep];
  const totalSteps = recipe.steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const animateStep = () => {
    Animated.sequence([
      Animated.timing(stepAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(stepAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const goNext = () => {
    if (currentStep < totalSteps - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      animateStep();
      setTimeout(() => {
        setCurrentStep((s) => s + 1);
        resetTimer();
      }, 120);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsCompleted(true);
      Animated.spring(completionScale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      animateStep();
      setTimeout(() => {
        setCurrentStep((s) => s - 1);
        resetTimer();
      }, 120);
    }
  };

  const startTimer = useCallback(() => {
    const dur = step?.duration ? step.duration * 60 : 0;
    setTimerTarget(dur);
    setTimerSeconds(0);
    setTimerRunning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [step]);

  const toggleTimer = useCallback(() => {
    setTimerRunning((r) => !r);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const resetTimer = useCallback(() => {
    setTimerRunning(false);
    setTimerSeconds(0);
    setTimerTarget(0);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (isCompleted) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient colors={["#0D0B0A", "#1A1208", "#0D0B0A"]} style={StyleSheet.absoluteFill} />
        <View style={styles.centerWrap}>
          <Animated.View style={[styles.completionCircle, { transform: [{ scale: completionScale }] }]}>
            <PartyPopper size={40} color={Colors.accent} />
          </Animated.View>
          <Text style={styles.completionTitle}>Recipe Complete!</Text>
          <Text style={styles.completionSub}>{recipe.title}</Text>
          <Text style={styles.completionMsg}>Enjoy your meal 🎉</Text>
          <Pressable onPress={() => router.back()} style={styles.doneBtn}>
            <LinearGradient colors={[Colors.accent, "#E8872E"]} style={styles.doneBtnGrad}>
              <Check size={18} color={Colors.dark} />
              <Text style={styles.doneBtnText}>Done</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={["#0D0B0A", "#110E0B", "#0A0806"]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={8}>
          <X size={18} color={Colors.textSecondary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{recipe.title}</Text>
          <Text style={styles.headerStep}>Step {currentStep + 1} of {totalSteps}</Text>
        </View>
        <Pressable onPress={() => setShowIngredients(true)} style={styles.listBtn} hitSlop={8}>
          <List size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.progressBar}>
          <LinearGradient
            colors={[Colors.accent, Colors.accentSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${progress}%` as `${number}%` }]}
          />
        </View>
        <View style={styles.progressDots}>
          {recipe.steps.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i < currentStep && styles.progressDotDone,
                i === currentStep && styles.progressDotCurrent,
              ]}
            />
          ))}
        </View>
      </View>

      <Animated.View style={[styles.stepContent, { opacity: stepAnim }]}>
        <LinearGradient colors={[Colors.accent, "#E8872E"]} style={styles.stepNumLarge}>
          <Text style={styles.stepNumLargeText}>{step?.step ?? currentStep + 1}</Text>
        </LinearGradient>
        <Text style={styles.stepTitleLarge}>{step?.title ?? ""}</Text>
        <Text style={styles.stepDescLarge}>{step?.description ?? ""}</Text>

        {step?.duration && (
          <View style={styles.timerSection}>
            {!timerRunning && timerSeconds === 0 ? (
              <Pressable onPress={startTimer} style={styles.timerStartBtn} testID="start-timer">
                <Clock size={16} color={Colors.accent} />
                <Text style={styles.timerStartText}>Start {step.duration}min Timer</Text>
              </Pressable>
            ) : (
              <View style={styles.timerControls}>
                <Text style={[
                  styles.timerDisplay,
                  timerSeconds >= timerTarget && timerTarget > 0 && styles.timerDone,
                ]}>
                  {formatTime(timerSeconds)}
                  {timerTarget > 0 && <Text style={styles.timerOf}> / {formatTime(timerTarget)}</Text>}
                </Text>
                <View style={styles.timerBtns}>
                  <Pressable onPress={toggleTimer} style={styles.timerBtn}>
                    {timerRunning ? <Pause size={16} color={Colors.accent} /> : <Play size={16} color={Colors.accent} />}
                  </Pressable>
                  <Pressable onPress={resetTimer} style={styles.timerBtn}>
                    <RotateCcw size={16} color={Colors.textTertiary} />
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}
      </Animated.View>

      <View style={[styles.navBar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={goPrev}
          style={[styles.navBtn, currentStep === 0 && styles.navBtnDisabled]}
          disabled={currentStep === 0}
          hitSlop={8}
        >
          <ChevronLeft size={22} color={currentStep === 0 ? Colors.textMuted : Colors.white} />
          <Text style={[styles.navBtnText, currentStep === 0 && styles.navBtnTextDisabled]}>Prev</Text>
        </Pressable>

        <Pressable onPress={goNext} style={styles.nextStepBtn} testID="next-step">
          <LinearGradient
            colors={currentStep === totalSteps - 1 ? [Colors.accentSecondary, Colors.accent] : [Colors.accent, "#E8872E"]}
            style={styles.nextStepGrad}
          >
            {currentStep === totalSteps - 1 ? (
              <>
                <Check size={18} color={Colors.dark} />
                <Text style={styles.nextStepText}>Complete</Text>
              </>
            ) : (
              <>
                <Text style={styles.nextStepText}>Next Step</Text>
                <ChevronRight size={18} color={Colors.dark} />
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>

      {showIngredients && (
        <Pressable style={styles.sheetOverlay} onPress={() => setShowIngredients(false)}>
          <View style={styles.sheetOverlayBg} />
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Ingredients</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetScroll}>
              {recipe.ingredients.map((ing, i) => (
                <View key={i} style={styles.sheetIngRow}>
                  <View style={styles.sheetDot} />
                  <Text style={styles.sheetIngName}>{ing.name}</Text>
                  <Text style={styles.sheetIngAmount}>{ing.amount} {ing.unit}</Text>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  centerWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: Spacing.lg, paddingHorizontal: Spacing.xxxl },
  errorText: { color: Colors.textSecondary, fontSize: FontSize.lg, fontWeight: "600" as const },
  retryBtn: { backgroundColor: Colors.accent, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md, borderRadius: Radius.pill },
  retryText: { color: Colors.dark, fontSize: FontSize.md, fontWeight: "600" as const },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.lg, gap: Spacing.md },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glass,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: Colors.white, fontSize: FontSize.md, fontWeight: "600" as const },
  headerStep: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },
  listBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glass,
    justifyContent: "center",
    alignItems: "center",
  },
  progressWrap: { paddingHorizontal: Spacing.xxl, marginTop: Spacing.xl, gap: Spacing.sm },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: Colors.glass, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  progressDots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.glass,
  },
  progressDotDone: { backgroundColor: Colors.accent },
  progressDotCurrent: { backgroundColor: Colors.accent, width: 20, borderRadius: 4 },
  stepContent: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: Spacing.xxxl },
  stepNumLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xxl,
  },
  stepNumLargeText: { color: Colors.dark, fontSize: FontSize.xxl, fontWeight: "800" as const },
  stepTitleLarge: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: "800" as const, textAlign: "center" as const, marginBottom: Spacing.lg },
  stepDescLarge: { color: Colors.textSecondary, fontSize: FontSize.lg, lineHeight: 28, textAlign: "center" as const },
  timerSection: { marginTop: Spacing.xxl },
  timerStartBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: "rgba(245,148,58,0.2)",
  },
  timerStartText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: "600" as const },
  timerControls: { alignItems: "center", gap: Spacing.md },
  timerDisplay: { color: Colors.white, fontSize: FontSize.hero, fontWeight: "800" as const },
  timerOf: { color: Colors.textTertiary, fontSize: FontSize.lg },
  timerDone: { color: Colors.accent },
  timerBtns: { flexDirection: "row", gap: Spacing.md },
  timerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.glass,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  navBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.xxl, gap: Spacing.md },
  navBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.sm },
  navBtnDisabled: { opacity: 0.35 },
  navBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: "500" as const },
  navBtnTextDisabled: { color: Colors.textMuted },
  nextStepBtn: { flex: 1, borderRadius: Radius.lg, overflow: "hidden" },
  nextStepGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, paddingVertical: Spacing.lg },
  nextStepText: { color: Colors.dark, fontSize: FontSize.md, fontWeight: "700" as const },
  completionCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.accentSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  completionTitle: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: "800" as const },
  completionSub: { color: Colors.textSecondary, fontSize: FontSize.md },
  completionMsg: { color: Colors.textTertiary, fontSize: FontSize.md, marginTop: Spacing.sm },
  doneBtn: { borderRadius: Radius.xl, overflow: "hidden", marginTop: Spacing.lg, width: "80%" },
  doneBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, paddingVertical: Spacing.lg },
  doneBtnText: { color: Colors.dark, fontSize: FontSize.lg, fontWeight: "700" as const },
  sheetOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end", zIndex: 100 },
  sheetOverlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(8,7,8,0.62)" },
  sheet: {
    backgroundColor: Colors.darkCard,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.xxl,
    maxHeight: "60%",
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.glassBorder,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.textMuted, alignSelf: "center", marginBottom: Spacing.lg },
  sheetTitle: { color: Colors.white, fontSize: FontSize.lg, fontWeight: "700" as const, marginBottom: Spacing.lg },
  sheetScroll: {},
  sheetIngRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glass,
  },
  sheetDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  sheetIngName: { flex: 1, color: Colors.white, fontSize: FontSize.md },
  sheetIngAmount: { color: Colors.textTertiary, fontSize: FontSize.sm },
});
