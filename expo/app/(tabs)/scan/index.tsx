import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Flashlight, Image as ImageIcon, Sparkles } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Colors, { Radius, Spacing, FontSize } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

const VIEWFINDER_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80";

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { canScan } = useAuth();
  const [isBusy, setIsBusy] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(tabs)/(home)" as any);
  };

  const handleCapture = async () => {
    if (isBusy) return;
    if (!canScan) {
      router.push("/paywall" as any);
      return;
    }
    setIsBusy(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Camera access", "Camera permission is needed to scan ingredients.");
        setIsBusy(false);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push({ pathname: "/(tabs)/scan/preview", params: { imageUri: uri, source: "camera" } } as any);
      }
    } catch (err) {
      Alert.alert("Camera error", "Could not open camera. Try gallery instead.");
    }
    setIsBusy(false);
  };

  const handleGallery = async () => {
    if (isBusy) return;
    if (!canScan) {
      router.push("/paywall" as any);
      return;
    }
    setIsBusy(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Gallery access", "Photo library permission is needed.");
        setIsBusy(false);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push({ pathname: "/(tabs)/scan/preview", params: { imageUri: uri, source: "gallery" } } as any);
      }
    } catch (err) {
      Alert.alert("Gallery error", "Could not open photos.");
    }
    setIsBusy(false);
  };

  const handleFlash = () => {
    setFlashOn((prev) => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS !== "web") {
      Alert.alert(flashOn ? "Flash Off" : "Flash On", flashOn ? "Camera flash disabled" : "Flash will be used when available.");
    }
  };

  const handleTypeIngredients = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(tabs)/scan/input" as any);
  };

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFill}>
        <Image source={{ uri: VIEWFINDER_IMAGE }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.4)"]} style={StyleSheet.absoluteFill} />
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={handleBack} style={styles.topBtn} hitSlop={8}>
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
        <View style={styles.badge}>
          <Sparkles size={12} color={Colors.accent} />
          <Text style={styles.badgeText}>AI LENS ACTIVE</Text>
        </View>
        <Pressable onPress={handleFlash} style={[styles.topBtn, flashOn && styles.topBtnActive]}>
          <Flashlight size={20} color={flashOn ? Colors.accent : "#fff"} fill={flashOn ? Colors.accent : "transparent"} />
        </Pressable>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable onPress={handleGallery} disabled={isBusy} style={styles.galleryBtn}>
          <ImageIcon size={20} color="#fff" />
        </Pressable>
        <Pressable
          onPress={handleCapture}
          disabled={isBusy}
          style={[styles.captureBtn, isBusy && styles.captureBtnBusy]}
        >
          <View style={styles.captureInner}>
            <Text style={styles.captureText}>Snap</Text>
          </View>
        </Pressable>
        <Pressable onPress={handleTypeIngredients} style={styles.galleryBtn}>
          <Text style={styles.typeText}>Type</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  topBtnActive: {
    borderColor: "rgba(245,148,58,0.6)",
    backgroundColor: "rgba(245,148,58,0.2)",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xxl,
  },
  galleryBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.xl,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  typeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  captureBtnBusy: { opacity: 0.6 },
  captureInner: {
    width: "100%",
    height: "100%",
    borderRadius: 36,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  captureText: { fontSize: 10, fontWeight: "700", color: "rgba(0,0,0,0.7)", letterSpacing: 0.5 },
});
