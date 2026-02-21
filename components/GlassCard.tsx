import React, { useRef, useCallback } from "react";
import { Animated, Pressable, StyleSheet, View, ViewStyle, Platform } from "react-native";
import Colors from "@/constants/colors";
import { Radius } from "@/constants/colors";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: "light" | "medium" | "heavy";
  onPress?: () => void;
  animated?: boolean;
}

export default function GlassCard({ children, style, intensity = "medium", onPress, animated = false }: GlassCardProps) {
  const bgOpacity = intensity === "light" ? 0.04 : intensity === "heavy" ? 0.13 : 0.07;
  const borderOpacity = intensity === "light" ? 0.08 : intensity === "heavy" ? 0.18 : 0.12;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    if (!animated) return;
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, friction: 8 }).start();
  }, [animated, scaleAnim]);

  const handlePressOut = useCallback(() => {
    if (!animated) return;
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
  }, [animated, scaleAnim]);

  const cardStyle = [
    styles.card,
    {
      backgroundColor: `rgba(255, 236, 214, ${bgOpacity})`,
      borderColor: `rgba(255, 255, 255, ${borderOpacity})`,
    },
    style,
  ];

  if (onPress) {
    return (
      <Animated.View style={animated ? { transform: [{ scale: scaleAnim }] } : undefined}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={cardStyle}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
});
