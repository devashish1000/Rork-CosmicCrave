import React, { useRef, useState, useEffect } from "react";
import {
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { Aperture, Check, Eye, EyeOff } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Svg, { Path } from "react-native-svg";
import Colors, { Radius, Spacing, FontSize } from "@/constants/colors";
import GlassCard from "@/components/GlassCard";
import { useAuth } from "@/contexts/AuthContext";

type Mode = "login" | "signup";

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </Svg>
  );
}

function AppleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#000" d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 17.5c-.169.47-.537.872-1.03 1.16-.494.29-1.06.44-1.638.44-.578 0-1.144-.15-1.638-.44-.493-.288-.861-.69-1.03-1.16-.17-.47-.17-.98 0-1.45.169-.47.537-.872 1.03-1.16.494-.29 1.06-.44 1.638-.44.578 0 1.144.15 1.638.44.493.288.861.69 1.03 1.16.17.47.17.98 0 1.45z" />
    </Svg>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"IDLE" | "SYNCING" | "SUCCESS">("IDLE");
  const spinAnim = useRef(new Animated.Value(0)).current;
  const apertureSpin = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const formFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, friction: 8 }),
      Animated.timing(formFade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (status === "SYNCING") {
      const anim = Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
      );
      anim.start();
      return () => { anim.stop(); spinAnim.setValue(0); };
    }
  }, [status]);

  useEffect(() => {
    if (status === "SYNCING") {
      const anim = Animated.loop(
        Animated.timing(apertureSpin, { toValue: 1, duration: 2 * 1000, useNativeDriver: true })
      );
      anim.start();
      return () => { anim.stop(); apertureSpin.setValue(0); };
    }
  }, [status]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const apertureRotate = apertureSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const switchMode = (nextMode: Mode) => {
    if (mode === nextMode) return;
    setMode(nextMode);
    setError("");
    setPassword("");
    setConfirmPassword("");
    if (nextMode === "login") setAgreedToTerms(false);
  };

  const handleSubmit = async () => {
    setError("");
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (!agreedToTerms) {
        setError("Please agree to the terms and conditions");
        return;
      }
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStatus("SYNCING");
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    const name = mode === "signup" ? email.split("@")[0] : "";
    await login(email.trim(), name);
    setStatus("SUCCESS");
    setIsLoading(false);
    setTimeout(() => {
      router.replace("/(tabs)/(home)" as any);
    }, 700);
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      setError("Please enter your email first");
      return;
    }
    setError("");
    Alert.alert("Reset email sent!", "Check your email for password reset instructions.");
  };

  const statusSubtitle =
    status === "IDLE" ? "PALATE PROFILE SYNC" : status === "SYNCING" ? "Syncing Pantry DB..." : "Cookbook Loaded";

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={["#0D0B0A", "#110E0B", "#0A0806"]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.cardWrap, { transform: [{ scale: cardScale }], opacity: formFade }]}>
            <GlassCard style={styles.glassCard} intensity="medium">
              {/* Logo: Aperture (spins when SYNCING), Check when SUCCESS; ring spins when SYNCING */}
              <View style={styles.logoWrap}>
                <View style={styles.logoRingOuter} />
                {status === "SYNCING" && (
                  <Animated.View style={[styles.logoSpinRing, { transform: [{ rotate: spin }] }]} />
                )}
                <Animated.View style={[styles.logoInner, { transform: [{ rotate: apertureRotate }] }]}>
                  {status === "SUCCESS" ? (
                    <Check size={32} color="#10B981" />
                  ) : (
                    <Aperture size={32} color={Colors.accent} />
                  )}
                </Animated.View>
              </View>
              <Text style={styles.appTitle}>SnapCook OS</Text>
              <Text style={styles.statusSubtitle}>{statusSubtitle}</Text>

              {/* Login / Create Account toggle */}
              <View style={styles.toggleWrap}>
                <Pressable
                  onPress={() => switchMode("login")}
                  style={[styles.toggleBtn, mode === "login" && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleText, mode === "login" && styles.toggleTextActive]}>Login</Text>
                </Pressable>
                <Pressable
                  onPress={() => switchMode("signup")}
                  style={[styles.toggleBtn, mode === "signup" && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleText, mode === "signup" && styles.toggleTextActive]}>Create Account</Text>
                </Pressable>
              </View>

              {error ? (
                <View style={styles.errorWrap}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(""); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <Text style={styles.label}>Password</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputWithIcon]}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(""); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  {showPassword ? <EyeOff size={18} color={Colors.textTertiary} /> : <Eye size={18} color={Colors.textTertiary} />}
                </Pressable>
              </View>

              {mode === "signup" && (
                <>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={[styles.input, styles.inputWithIcon]}
                      placeholder="Confirm your password"
                      placeholderTextColor={Colors.textMuted}
                      value={confirmPassword}
                      onChangeText={(t) => { setConfirmPassword(t); setError(""); }}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                    />
                    <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                      {showConfirmPassword ? <EyeOff size={18} color={Colors.textTertiary} /> : <Eye size={18} color={Colors.textTertiary} />}
                    </Pressable>
                  </View>
                  {confirmPassword.length > 0 && password !== confirmPassword && (
                    <Text style={styles.inlineError}>Passwords do not match</Text>
                  )}
                </>
              )}

              {mode === "login" && (
                <View style={styles.forgotWrap}>
                  <Pressable onPress={handleForgotPassword}>
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                  </Pressable>
                </View>
              )}

              {mode === "signup" && (
                <Pressable
                  onPress={() => setAgreedToTerms(!agreedToTerms)}
                  style={styles.termsRow}
                >
                  <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                    {agreedToTerms ? <Text style={styles.checkmark}>✓</Text> : null}
                  </View>
                  <Text style={styles.termsText}>
                    I agree to the <Text style={styles.link}>Terms of Service</Text> and <Text style={styles.link}>Privacy Policy</Text>
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={handleSubmit}
                disabled={status !== "IDLE" || (mode === "signup" && (!agreedToTerms || password !== confirmPassword))}
                style={[
                  styles.submitBtn,
                  (status !== "IDLE" || (mode === "signup" && (!agreedToTerms || password !== confirmPassword))) && styles.submitBtnDisabled,
                ]}
              >
                <LinearGradient
                  colors={[Colors.accent, "#E8872E"]}
                  style={styles.submitBtnGrad}
                >
                  <Text style={styles.submitBtnText}>
                    {status === "IDLE" && (mode === "login" ? "Sign In" : "Create Account")}
                    {status === "SYNCING" && (mode === "login" ? "Signing in..." : "Creating account...")}
                    {status === "SUCCESS" && "Success!"}
                  </Text>
                </LinearGradient>
              </Pressable>

              <View style={styles.dividerWrap}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialRow}>
                <Pressable
                  style={styles.socialBtn}
                  onPress={async () => {
                    await login("user@google.com", "Google");
                    router.replace("/(tabs)/(home)" as any);
                  }}
                >
                  <GoogleIcon size={20} />
                  <Text style={styles.socialText}>Google</Text>
                </Pressable>
                <Pressable
                  style={styles.socialBtn}
                  onPress={async () => {
                    await login("user@apple.com", "Apple");
                    router.replace("/(tabs)/(home)" as any);
                  }}
                >
                  <AppleIcon size={20} />
                  <Text style={styles.socialText}>Apple</Text>
                </Pressable>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  By continuing, you agree to our <Text style={styles.link}>Terms of Service</Text> and <Text style={styles.link}>Privacy Policy</Text>
                </Text>
              </View>
            </GlassCard>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: Spacing.xl, paddingVertical: 40 },
  cardWrap: { maxWidth: 400, width: "100%", alignSelf: "center" },
  glassCard: { padding: Spacing.xxl, borderRadius: Radius.xxl, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  logoWrap: {
    width: 96,
    height: 96,
    alignSelf: "center",
    marginBottom: Spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  logoRingOuter: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  logoSpinRing: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: Colors.accent,
    opacity: 0.5,
  },
  logoInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  appTitle: {
    color: Colors.white,
    fontSize: FontSize.xxl,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  statusSubtitle: {
    color: Colors.textTertiary,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 1,
    marginBottom: Spacing.xl,
  },
  toggleWrap: {
    flexDirection: "row",
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.xl,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.xl,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: Colors.accent,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  toggleText: { color: Colors.textTertiary, fontSize: FontSize.sm, fontWeight: "600" },
  toggleTextActive: { color: Colors.dark, fontSize: FontSize.sm, fontWeight: "600" },
  errorWrap: {
    backgroundColor: "rgba(232,76,76,0.1)",
    borderWidth: 1,
    borderColor: "rgba(232,76,76,0.3)",
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: { color: Colors.coral, fontSize: FontSize.sm },
  inlineError: { color: "#F87171", fontSize: 12, marginBottom: Spacing.lg },
  label: { color: Colors.white, fontSize: 12, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    color: Colors.white,
    fontSize: FontSize.sm,
    marginBottom: Spacing.lg,
  },
  inputRow: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.lg },
  inputWithIcon: { flex: 1, marginBottom: 0, paddingRight: 48 },
  eyeBtn: { position: "absolute", right: 12, width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  forgotWrap: { alignSelf: "flex-end", marginBottom: Spacing.lg },
  forgotText: { color: Colors.accent, fontSize: 12 },
  termsRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: Spacing.lg, gap: 10 },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.inputBg,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: { borderColor: Colors.accent, backgroundColor: Colors.accent },
  checkmark: { color: Colors.dark, fontSize: 10, fontWeight: "700" },
  termsText: { color: Colors.textTertiary, fontSize: 12, flex: 1 },
  link: { color: Colors.accent },
  submitBtn: { borderRadius: Radius.xl, overflow: "hidden", marginBottom: Spacing.lg },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnGrad: { height: 56, justifyContent: "center", alignItems: "center", borderRadius: Radius.xl },
  submitBtnText: { color: Colors.dark, fontSize: FontSize.sm, fontWeight: "700" },
  dividerWrap: { flexDirection: "row", alignItems: "center", marginVertical: Spacing.xl, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.inputBorder },
  dividerText: { color: Colors.textMuted, fontSize: 12 },
  socialRow: { flexDirection: "row", gap: 12 },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    height: 50,
  },
  socialText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: "500" },
  footer: { marginTop: Spacing.xl, paddingTop: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.inputBorder },
  footerText: { color: Colors.textMuted, fontSize: 12, textAlign: "center" },
});
