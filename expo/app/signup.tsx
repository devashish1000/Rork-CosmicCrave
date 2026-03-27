import React, { useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { ChefHat, Mail, Lock, User, ArrowLeft, AlertCircle, Eye, EyeOff } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors, { Radius, Spacing, FontSize } from "@/constants/colors";
import GlassCard from "@/components/GlassCard";
import { useAuth } from "@/contexts/AuthContext";

export default function SignupScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const buttonScale = useRef(new Animated.Value(1)).current;

  const handleSignup = async () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, friction: 6 }),
    ]).start();
    setIsLoading(true);
    await new Promise((res) => setTimeout(res, 800));
    await login(email, name);
    setIsLoading(false);
    router.replace("/(tabs)/(home)" as any);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={["#0D0B0A", "#110E0B", "#0A0806"]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <ArrowLeft size={22} color={Colors.textSecondary} />
          </Pressable>

          <View style={styles.logoWrap}>
            <LinearGradient colors={[Colors.accent, "#E8872E"]} style={styles.logoCircle}>
              <ChefHat size={30} color={Colors.dark} />
            </LinearGradient>
            <Text style={styles.heading}>Create Account</Text>
            <Text style={styles.subheading}>Join ChefAI and start cooking smarter</Text>
          </View>

          <GlassCard style={styles.formCard} intensity="medium">
            {error ? (
              <View style={styles.errorWrap}>
                <AlertCircle size={14} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={[styles.inputWrap, nameFocused && styles.inputFocused]}>
              <User size={18} color={nameFocused ? Colors.accent : Colors.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={(t) => { setName(t); setError(""); }}
                autoCapitalize="words"
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                testID="name-input"
              />
            </View>

            <View style={[styles.inputWrap, emailFocused && styles.inputFocused]}>
              <Mail size={18} color={emailFocused ? Colors.accent : Colors.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(""); }}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                testID="email-input"
              />
            </View>

            <View style={[styles.inputWrap, passFocused && styles.inputFocused]}>
              <Lock size={18} color={passFocused ? Colors.accent : Colors.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="Password (min 6 characters)"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(""); }}
                secureTextEntry={!showPassword}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                testID="password-input"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10} style={styles.eyeBtn}>
                {showPassword ? <EyeOff size={18} color={Colors.textTertiary} /> : <Eye size={18} color={Colors.textTertiary} />}
              </Pressable>
            </View>

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Pressable
                onPress={handleSignup}
                style={[styles.signupBtn, isLoading && styles.btnDisabled]}
                disabled={isLoading}
                testID="signup-button"
              >
                <LinearGradient colors={[Colors.accent, "#E8872E"]} style={styles.signupBtnGrad}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color={Colors.dark} />
                  ) : (
                    <Text style={styles.signupBtnText}>Create Account</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </GlassCard>

          <Pressable onPress={() => router.back()} style={styles.loginLink}>
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginBold}>Sign in</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: Spacing.xxl, paddingVertical: 60 },
  backBtn: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.glass,
    justifyContent: "center",
    alignItems: "center",
  },
  logoWrap: { alignItems: "center", marginBottom: Spacing.xxxl },
  logoCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", marginBottom: Spacing.md },
  heading: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: "800" as const },
  subheading: { color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: 4 },
  formCard: { padding: Spacing.xxl, marginBottom: Spacing.xl },
  errorWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.coralSoft,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  errorText: { color: Colors.error, fontSize: FontSize.sm, fontWeight: "500" as const, flex: 1 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: Spacing.lg,
    height: 54,
    gap: 12,
    marginBottom: Spacing.md,
  },
  inputFocused: {
    borderColor: Colors.inputFocusBorder,
    backgroundColor: "rgba(245, 148, 58, 0.04)",
  },
  input: { flex: 1, color: Colors.white, fontSize: FontSize.md },
  eyeBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  signupBtn: { borderRadius: Radius.xl, overflow: "hidden", marginTop: Spacing.sm },
  btnDisabled: { opacity: 0.7 },
  signupBtnGrad: { height: 54, justifyContent: "center", alignItems: "center", borderRadius: Radius.xl },
  signupBtnText: { color: Colors.dark, fontSize: FontSize.lg, fontWeight: "700" as const },
  loginLink: { alignItems: "center", paddingVertical: Spacing.lg },
  loginText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  loginBold: { color: Colors.accent, fontWeight: "600" as const },
});
