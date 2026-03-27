import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Image as ImageIcon, RotateCcw, Sparkles } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";
import { generateObject } from "@rork-ai/toolkit-sdk";
import { z } from "zod";
import Colors, { Radius, Spacing, FontSize } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useRecipes } from "@/contexts/RecipeContext";
import { Recipe } from "@/types/recipe";

const HOLD_MS = 780;

const ingredientParseSchema = z.object({
  ingredients: z.array(z.string()).describe("List of ingredient names detected from the image. Each should be a simple name like 'tomato', 'chicken breast', 'olive oil'."),
});

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

export default function PreviewScreen() {
  const router = useRouter();
  const { imageUri, source } = useLocalSearchParams<{ imageUri: string; source: string }>();
  const insets = useSafeAreaInsets();
  const { canScan, incrementScan } = useAuth();
  const { addRecipes, addScan } = useRecipes();
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const holdStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const retakeLabel = source === "gallery" ? "Choose another (free)" : "Retake (free)";

  const onRetake = useCallback(() => {
    if (isScanning) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [isScanning, router]);

  const stopHold = useCallback(() => {
    setIsHolding(false);
    setHoldProgress(0);
    holdStartRef.current = null;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const runAnalyze = useCallback(async () => {
    if (!imageUri || !canScan) {
      if (!canScan) router.push("/paywall" as any);
      setIsScanning(false);
      return;
    }
    const scanId = `scan-${Date.now()}`;
    let base64Image = "";
    try {
      if (Platform.OS === "web" && imageUri.startsWith("data:")) {
        base64Image = imageUri.split(",")[1] ?? "";
      } else if (imageUri.startsWith("file://") || imageUri.startsWith("content://") || imageUri.startsWith("http")) {
        if (imageUri.startsWith("http")) {
          const res = await fetch(imageUri);
          const blob = await res.blob();
          base64Image = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result?.split(",")[1] ?? "");
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          }).then((s) => s.split(",")[1] ?? "");
        } else {
          base64Image = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
        }
      }
    } catch (e) {
      console.warn("Preview: read image", e);
      setIsScanning(false);
      Alert.alert("Image error", "Could not read the image. Try another photo.");
      return;
    }

    try {
      const dietPrefs = ""; // could use useAuth().user.dietaryPreferences
      const parsed = await generateObject({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Look at this image of food ingredients. Identify every distinct ingredient you can see. Return a list of ingredient names. Be specific." },
              ...(base64Image ? [{ type: "image", image: `data:image/jpeg;base64,${base64Image}` }] : []),
            ],
          },
        ],
        schema: ingredientParseSchema,
      });
      const ingredients: string[] = parsed.ingredients ?? [];
      const ingredientList = ingredients.length > 0 ? ingredients : ["tomato", "basil", "pasta"];

      const result = await generateObject({
        messages: [
          {
            role: "user",
            content: `You are a professional chef AI. Generate 2-3 creative, delicious recipes using these ingredients: ${ingredientList.join(", ")}. ${dietPrefs} Make them practical and tasty. Include realistic nutrition estimates.`,
          },
        ],
        schema: recipeSchema,
      });

      const newRecipes: Recipe[] = (result.recipes ?? []).map((r: any, i: number) => ({
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
        scanType: source === "gallery" ? "paste" : "camera",
        timestamp: new Date().toISOString(),
        recipesGenerated: newRecipes.length,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsScanning(false);
      router.replace({ pathname: "/(tabs)/scan/ideas", params: { scanId } } as any);
    } catch (err) {
      console.warn("Preview analyze error", err);
      setIsScanning(false);
      Alert.alert("Scan failed", err instanceof Error ? err.message : "Unable to analyze ingredients. Please try again.");
    }
  }, [imageUri, source, canScan, incrementScan, addRecipes, addScan, router]);

  const beginHold = useCallback(() => {
    if (isScanning) return;
    if (!canScan) {
      router.push("/paywall" as any);
      return;
    }
    setIsHolding(true);
    holdStartRef.current = performance.now();

    const tick = (t: number) => {
      const start = holdStartRef.current;
      if (!start) return;
      const elapsed = t - start;
      const p = Math.min(1, elapsed / HOLD_MS);
      setHoldProgress(p);

      if (p >= 1) {
        holdStartRef.current = null;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        setIsHolding(false);
        setIsScanning(true);
        runAnalyze();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [isScanning, canScan, runAnalyze, router]);

  if (!imageUri) {
    return (
      <View style={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.retakeBtn}>
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
        <Text style={styles.errorText}>No image</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.7)"]} style={StyleSheet.absoluteFill} />
      <View style={[styles.overlay, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.topRow}>
          <Pressable onPress={onRetake} style={styles.backBtn} disabled={isScanning}>
            <ArrowLeft size={20} color="#fff" />
          </Pressable>
          <View style={styles.previewBadge}>
            <Sparkles size={12} color={Colors.accent} />
            <Text style={styles.previewBadgeText}>PREVIEW</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>Ready to scan?</Text>
          <Text style={styles.subtitle}>Retakes are free. A scan is used only after you hold to analyze.</Text>
        </View>

        <View style={styles.actions}>
          <View style={styles.twoCol}>
            <Pressable onPress={onRetake} disabled={isScanning} style={styles.retakeBtn}>
              <RotateCcw size={18} color="#fff" />
              <Text style={styles.retakeBtnText}>{retakeLabel}</Text>
            </Pressable>
            <Pressable
              onPressIn={beginHold}
              onPressOut={() => holdProgress < 1 && stopHold()}
              disabled={isScanning}
              style={[styles.analyzeBtn, isScanning && styles.analyzeBtnDisabled]}
            >
              <View style={[styles.analyzeProgress, { width: `${holdProgress * 100}%` }]} />
              <Text style={styles.analyzeBtnText}>
                {isScanning ? "Analyzing…" : "Hold to Analyze • uses 1 scan"}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.scanIncludes}>Scan includes: photo + detection + ideas</Text>
          {isHolding && !isScanning && (
            <Text style={styles.keepHolding}>Keep holding…</Text>
          )}
        </View>
      </View>

      {isScanning && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)" }]} />
          <View style={styles.scanningBadge}>
            <Text style={styles.scanningText}>Detecting ingredients…</Text>
            <Text style={styles.scanningSub}>Generating 3 recipe ideas</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  overlay: { flex: 1, justifyContent: "space-between", paddingHorizontal: Spacing.xl },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  previewBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  titleBlock: {},
  title: { color: "#fff", fontSize: 24, fontWeight: "700" },
  subtitle: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 8, maxWidth: 280 },
  actions: {},
  twoCol: { flexDirection: "row", gap: 12, marginBottom: 12 },
  retakeBtn: {
    flex: 1,
    height: 56,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  retakeBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  analyzeBtn: {
    flex: 1,
    height: 56,
    borderRadius: Radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(245,148,58,0.3)",
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  analyzeBtnDisabled: { opacity: 0.7 },
  analyzeProgress: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  analyzeBtnText: { color: "#000", fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  scanIncludes: { color: "rgba(255,255,255,0.5)", fontSize: 11, textAlign: "center" },
  keepHolding: { color: "rgba(255,255,255,0.8)", fontSize: 11, textAlign: "center", marginTop: 8 },
  scanningBadge: {
    position: "absolute",
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 8,
  },
  scanningText: { color: Colors.accent, fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  scanningSub: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  errorText: { color: "#fff", fontSize: 16, textAlign: "center", marginTop: 40 },
});
