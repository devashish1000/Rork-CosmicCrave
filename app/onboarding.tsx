import React, { useRef, useState, useEffect } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, ChefHat } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors, { Radius, Spacing, FontSize } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

const { width, height } = Dimensions.get("window");
const SNAP_COOK_ENJOY = ["S", "n", "a", "p", ".", " ", "C", "o", "o", "k", ".", " ", "E", "n", "j", "o", "y", "."];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const scanLineY = useRef(new Animated.Value(0)).current;
  const pulseRing = useRef(new Animated.Value(1)).current;
  const pulseRingOpacity = useRef(new Animated.Value(0.5)).current;
  const dotScale0 = useRef(new Animated.Value(1.2)).current;
  const dotScale1 = useRef(new Animated.Value(1)).current;
  const dotScale2 = useRef(new Animated.Value(1)).current;
  const letterOpacities = useRef(SNAP_COOK_ENJOY.map(() => new Animated.Value(0))).current;
  const letterY = useRef(SNAP_COOK_ENJOY.map(() => new Animated.Value(20))).current;
  const emojiAnims = useRef([0, 1, 2].map(() => ({ opacity: new Animated.Value(0), y: new Animated.Value(100) }))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(dotScale0, { toValue: currentStep === 0 ? 1.2 : 1, useNativeDriver: true, friction: 8 }),
      Animated.spring(dotScale1, { toValue: currentStep === 1 ? 1.2 : 1, useNativeDriver: true, friction: 8 }),
      Animated.spring(dotScale2, { toValue: currentStep === 2 ? 1.2 : 1, useNativeDriver: true, friction: 8 }),
    ]).start();
  }, [currentStep]);

  useEffect(() => {
    if (currentStep === 1) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineY, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(scanLineY, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [currentStep]);

  useEffect(() => {
    if (currentStep === 1) {
      letterOpacities.forEach((o) => o.setValue(0));
      letterY.forEach((y) => y.setValue(20));
      const stagger = SNAP_COOK_ENJOY.map((_, i) =>
        Animated.parallel([
          Animated.timing(letterOpacities[i], { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.spring(letterY[i], { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 180 }),
        ])
      );
      Animated.stagger(50, stagger).start();
      emojiAnims.forEach((a) => {
        a.opacity.setValue(0);
        a.y.setValue(100);
      });
      Animated.stagger(100, emojiAnims.map((a) =>
        Animated.parallel([
          Animated.timing(a.opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(a.y, { toValue: 0, useNativeDriver: true, damping: 12, stiffness: 200 }),
        ])
      )).start();
    }
  }, [currentStep]);

  useEffect(() => {
    if (currentStep === 2) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseRing, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
            Animated.timing(pulseRingOpacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(pulseRing, { toValue: 1, duration: 1000, useNativeDriver: true }),
            Animated.timing(pulseRingOpacity, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
          ]),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [currentStep]);

  const handleNext = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < 2) {
      setCurrentStep((prev) => prev + 1);
    } else {
      await completeOnboarding();
      router.replace("/login" as any);
    }
  };

  const scanLineTranslate = scanLineY.interpolate({
    inputRange: [0, 1],
    outputRange: [-height, height],
  });

  // Page 0: Your ingredients. Infinite possibilities. (SnapCook: hero image + bottom gradient overlay)
  if (currentStep === 0) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={["#0D0B0A", "#1A1208", "#0D0B0A"]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.6)", "#000"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        </View>
        <View style={[styles.centerContent, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.heroTitle}>Your ingredients.</Text>
          <Text style={styles.heroTitleAccent}>Infinite possibilities.</Text>
          <Text style={styles.heroSub}>Swipe left or tap Next to begin your culinary journey</Text>
        </View>
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable onPress={handleNext} style={styles.nextBtnWhite} testID="button-onboarding-next-0">
            <Text style={styles.nextBtnWhiteText}>Next</Text>
          </Pressable>
        </View>
        <View style={[styles.dots, { top: insets.top + 48 }]}>
          <Animated.View style={[styles.dot, styles.dotActive, { transform: [{ scale: dotScale0 }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ scale: dotScale1 }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ scale: dotScale2 }] }]} />
        </View>
      </View>
    );
  }

  // Page 1: Snap. Cook. Enjoy. (camera viewfinder + full-height scan line, letter-by-letter, emoji pop-in)
  if (currentStep === 1) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[StyleSheet.absoluteFill, styles.blackBg]} />
        <View style={styles.viewfinderWrap}>
          <View style={[styles.viewfinderBorder, { margin: 0 }]} />
          <Animated.View
            style={[
              styles.scanLine,
              { transform: [{ translateY: scanLineTranslate }] },
            ]}
          />
          <View style={styles.emojiRow}>
            {["🍅", "🧄", "🌿"].map((emoji, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.emojiWrap,
                  {
                    left: i * 60,
                    top: i * 50,
                    opacity: emojiAnims[i].opacity,
                    transform: [{ translateY: emojiAnims[i].y }],
                  },
                ]}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </Animated.View>
            ))}
          </View>
          <View style={styles.cameraCircle}>
            <LinearGradient
              colors={[Colors.accent, "#C2410C"]}
              style={styles.cameraCircleGrad}
            >
              <Camera size={48} color="#fff" strokeWidth={2.5} />
            </LinearGradient>
          </View>
        </View>
        <View style={[styles.snapCookEnjoy, { paddingBottom: 100 }]}>
          <View style={styles.letterRow}>
            {SNAP_COOK_ENJOY.map((letter, i) => (
              <Animated.Text
                key={i}
                style={[
                  styles.snapCookEnjoyLetter,
                  {
                    opacity: letterOpacities[i],
                    transform: [{ translateY: letterY[i] }],
                  },
                ]}
              >
                {letter === " " ? "\u00A0" : letter}
              </Animated.Text>
            ))}
          </View>
        </View>
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable onPress={handleNext} style={styles.nextBtnWhite} testID="button-onboarding-next-1">
            <Text style={styles.nextBtnWhiteText}>Next</Text>
          </Pressable>
        </View>
        <View style={[styles.dots, { top: insets.top + 48 }]}>
          <Animated.View style={[styles.dot, { transform: [{ scale: dotScale0 }] }]} />
          <Animated.View style={[styles.dot, styles.dotActive, { transform: [{ scale: dotScale1 }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ scale: dotScale2 }] }]} />
        </View>
      </View>
    );
  }

  // Page 2: Get Started (SnapCook gradient 135deg + pulsing ring AROUND button)
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={["#C85A1C", "#E8A035"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.getStartedBottom, { paddingBottom: insets.bottom + 48 }]}>
        <View style={styles.getStartedBtnWrap}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.pulseRingAround,
              {
                transform: [{ scale: pulseRing }],
                opacity: pulseRingOpacity,
              },
            ]}
          />
          <Pressable onPress={handleNext} style={styles.getStartedBtn} testID="button-onboarding-start">
            <LinearGradient colors={["#fff", "#f5f5f5"]} style={styles.getStartedBtnGrad}>
              <Text style={styles.getStartedBtnText}>Get Started</Text>
              <ChefHat size={24} color="#0D0B0A" strokeWidth={2.5} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
      <View style={[styles.dots, { top: insets.top + 48 }]}>
        <Animated.View style={[styles.dot, { transform: [{ scale: dotScale0 }] }]} />
        <Animated.View style={[styles.dot, { transform: [{ scale: dotScale1 }] }]} />
        <Animated.View style={[styles.dot, styles.dotActive, { transform: [{ scale: dotScale2 }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  blackBg: { backgroundColor: "#000" },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xxl,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  heroTitleAccent: {
    color: Colors.accent,
    fontSize: 42,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  heroSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: FontSize.lg,
    textAlign: "center",
  },
  bottomBar: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xl,
  },
  nextBtnWhite: {
    height: 56,
    borderRadius: Radius.pill,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  nextBtnWhiteText: {
    color: "#000",
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  dots: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    zIndex: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: {
    width: 32,
    backgroundColor: Colors.accent,
  },
  viewfinderWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  viewfinderBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: Colors.accent,
    borderRadius: 24,
    opacity: 0.3,
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  emojiRow: { position: "absolute", width: 200, height: 200 },
  emojiWrap: { position: "absolute" },
  emoji: { fontSize: 48 },
  cameraCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    overflow: "hidden",
  },
  cameraCircleGrad: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  snapCookEnjoy: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: Spacing.xxl,
  },
  letterRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  snapCookEnjoyLetter: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "700",
  },
  snapCookEnjoyText: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "700",
    textAlign: "center",
  },
  getStartedBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.xxl,
    alignItems: "center",
  },
  getStartedBtnWrap: {
    width: "100%",
    height: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseRingAround: {
    width: "100%",
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: Colors.accent,
  },
  getStartedBtn: {
    width: "100%",
    height: 64,
    borderRadius: Radius.pill,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
  },
  getStartedBtnGrad: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: Radius.pill,
  },
  getStartedBtnText: {
    color: "#0D0B0A",
    fontSize: 20,
    fontWeight: "700",
  },
});
