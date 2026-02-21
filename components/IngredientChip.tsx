import React, { useRef, useCallback } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { X } from "lucide-react-native";
import Colors, { Radius } from "@/constants/colors";

interface IngredientChipProps {
  label: string;
  onRemove?: () => void;
  color?: string;
  selected?: boolean;
  onPress?: () => void;
}

export default function IngredientChip({ label, onRemove, color = Colors.accent, selected = true, onPress }: IngredientChipProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true, friction: 8 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={[
          styles.chip,
          {
            backgroundColor: selected ? `${color}18` : Colors.glass,
            borderColor: selected ? `${color}35` : Colors.glassBorder,
          },
        ]}
        testID="ingredient-chip"
      >
        <Text style={[styles.label, { color: selected ? color : Colors.textSecondary }]}>{label}</Text>
        {onRemove && (
          <Pressable onPress={onRemove} hitSlop={10} style={styles.removeBtn}>
            <X size={12} color={selected ? color : Colors.textTertiary} />
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    borderWidth: 1,
    gap: 6,
    minHeight: 36,
  },
  label: {
    fontSize: 14,
    fontWeight: "500" as const,
  },
  removeBtn: {
    marginLeft: 2,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
