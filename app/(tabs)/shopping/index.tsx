import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  Share,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronDown, Plus, Share2, Trash2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors, { Radius, Spacing, FontSize } from "@/constants/colors";
import GlassCard from "@/components/GlassCard";
import { useShopping } from "@/contexts/ShoppingContext";
import { useRecipes } from "@/contexts/RecipeContext";
import type { ShoppingItem as Item } from "@/contexts/ShoppingContext";

const MAX_ITEM_LENGTH = 45;

function normalizeInput(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

type Group =
  | { kind: "manual"; title: string; subtitle: string; items: Item[] }
  | { kind: "recipe"; recipeId: string; title: string; subtitle: string; items: Item[] };

function stateRank(it: Item) {
  return it.checked ? 2 : it.have ? 1 : 0;
}

export default function ShoppingListScreen() {
  const insets = useSafeAreaInsets();
  const shopping = useShopping();
  const { getRecipeById } = useRecipes();
  const [draft, setDraft] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const remaining = useMemo(
    () => shopping.items.filter((i) => !i.checked && !(i.have ?? false)).length,
    [shopping.items]
  );
  const haveCount = useMemo(
    () => shopping.items.filter((i) => !!i.have && !i.checked).length,
    [shopping.items]
  );
  const checkedCount = useMemo(
    () => shopping.items.filter((i) => i.checked).length,
    [shopping.items]
  );

  const groups = useMemo<Group[]>(() => {
    const manual = shopping.items.filter((i) => i.source !== "recipe");
    const byRecipe = new Map<string, Item[]>();
    shopping.items
      .filter((i) => i.source === "recipe" && i.recipeId)
      .forEach((i) => {
        const key = i.recipeId!;
        const cur = byRecipe.get(key) ?? [];
        cur.push(i);
        byRecipe.set(key, cur);
      });
    const recipeGroups: Group[] = Array.from(byRecipe.entries()).map(([recipeId, items]) => {
      const r = getRecipeById(recipeId);
      const title = r?.title ?? "Recipe";
      return { kind: "recipe", recipeId, title, subtitle: title, items };
    });
    const out: Group[] = [...recipeGroups];
    if (manual.length > 0) {
      out.push({ kind: "manual", title: "Manual", subtitle: "Added by you", items: manual });
    }
    return out;
  }, [shopping.items, getRecipeById]);

  const remainingByGroup = useMemo(() => {
    const out = new Map<string, number>();
    groups.forEach((g) => {
      const key = g.kind === "recipe" ? `r_${g.recipeId}` : "manual";
      out.set(key, g.items.filter((i) => !i.checked).length);
    });
    return out;
  }, [groups]);

  const handleAdd = () => {
    const name = normalizeInput(draft);
    if (!name) return;
    if (name.length > MAX_ITEM_LENGTH) {
      Alert.alert("Too long", `Keep it under ${MAX_ITEM_LENGTH} characters.`);
      return;
    }
    const res = shopping.addOne(name, { source: "manual" });
    if (!res.added) {
      Alert.alert("Already in list", name);
      return;
    }
    setDraft("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleClearChecked = () => {
    if (checkedCount === 0) return;
    shopping.clearChecked();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleShare = async () => {
    const lines: string[] = [];
    groups.forEach((g) => {
      const need = g.items.filter((i) => !i.checked && !(i.have ?? false));
      if (need.length === 0) return;
      lines.push(g.title);
      need.forEach((it) => lines.push(`- ${it.name}`));
      lines.push("");
    });
    const text = lines.join("\n").trim() || "(No remaining items)";
    try {
      if (Platform.OS !== "web" && Share.share) {
        await Share.share({ title: "Shopping List", message: text });
      } else {
        Alert.alert("Copied", "Shopping list copied to clipboard.");
      }
    } catch {
      Alert.alert("Share canceled", "No worries.");
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0D0B0A", "#110E0B", "#0A0806"]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Shopping List</Text>
            <Text style={styles.subtitle}>
              {remaining} to buy
              {haveCount > 0 ? ` • ${haveCount} have` : ""}
              {checkedCount > 0 ? ` • ${checkedCount} checked` : ""}
            </Text>
          </View>
          <Pressable onPress={handleShare} style={styles.iconBtn}>
            <Share2 size={20} color={Colors.textTertiary} />
          </Pressable>
        </View>

        <GlassCard style={styles.addCard} intensity="medium">
          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              placeholder="Add an item"
              placeholderTextColor={Colors.textMuted}
              value={draft}
              onChangeText={setDraft}
              maxLength={MAX_ITEM_LENGTH}
              onSubmitEditing={handleAdd}
            />
            <Pressable onPress={handleAdd} style={styles.addBtn}>
              <Plus size={20} color={Colors.dark} />
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>
          <View style={styles.addFooter}>
            <Text style={styles.hint}>Grouped by recipe for faster shopping.</Text>
            <Pressable
              onPress={handleClearChecked}
              disabled={checkedCount === 0}
              style={[styles.clearBtn, checkedCount === 0 && styles.clearBtnDisabled]}
            >
              <Text style={styles.clearBtnText}>Clear checked</Text>
            </Pressable>
          </View>
        </GlassCard>

        {groups.map((g) => {
          const groupKey = g.kind === "recipe" ? `r_${g.recipeId}` : "manual";
          const isCollapsed = collapsed[groupKey] ?? false;
          const groupRemaining = remainingByGroup.get(groupKey) ?? 0;
          return (
            <View key={groupKey} style={styles.groupCard}>
              <GlassCard style={styles.groupInner} intensity="medium">
                <Pressable
                  onPress={() => {
                    setCollapsed((prev) => ({ ...prev, [groupKey]: !(prev[groupKey] ?? false) }));
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={styles.groupHeader}
                >
                  <View style={[styles.chevronWrap, !isCollapsed && styles.chevronWrapActive]}>
                    <ChevronDown
                      size={18}
                      color={Colors.textTertiary}
                      style={{ transform: [{ rotate: isCollapsed ? "-90deg" : "0deg" }] }}
                    />
                  </View>
                  <View style={styles.groupTitleWrap}>
                    <Text style={styles.groupTitle}>{g.title}</Text>
                    <Text style={styles.groupSub}>{groupRemaining} remaining</Text>
                  </View>
                </Pressable>
                {!isCollapsed && (
                  <View style={styles.itemsList}>
                    {[...g.items].sort((a, b) => stateRank(a) - stateRank(b)).map((it) => (
                      <Pressable
                        key={it.id}
                        onPress={() => shopping.toggle(it.id)}
                        style={styles.itemRow}
                      >
                        <View style={[styles.checkbox, it.checked && styles.checkboxChecked]}>
                          {it.checked ? <Check size={14} color={Colors.dark} strokeWidth={3} /> : null}
                        </View>
                        <Text style={[styles.itemText, it.checked && styles.itemTextChecked]} numberOfLines={1}>
                          {it.name}
                        </Text>
                        <Pressable
                          onPress={() => {
                            shopping.remove(it.id);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                          hitSlop={8}
                          style={styles.removeBtn}
                        >
                          <Trash2 size={16} color={Colors.textTertiary} />
                        </Pressable>
                      </Pressable>
                    ))}
                  </View>
                )}
              </GlassCard>
            </View>
          );
        })}

        {shopping.items.length === 0 && (
          <GlassCard style={styles.emptyCard} intensity="light">
            <Text style={styles.emptyTitle}>Shopping list is empty</Text>
            <Text style={styles.emptySub}>Add an item to get started.</Text>
          </GlassCard>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scrollContent: { paddingHorizontal: Spacing.xl },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xl,
  },
  title: { color: Colors.white, fontSize: FontSize.xxxl, fontWeight: "700" },
  subtitle: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: "600", marginTop: 4, letterSpacing: 0.5 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.inputBg,
    justifyContent: "center",
    alignItems: "center",
  },
  addCard: { padding: Spacing.xl, borderRadius: Radius.xxl, marginBottom: Spacing.xl },
  addRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  input: {
    flex: 1,
    height: 44,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.inputBg,
    paddingHorizontal: Spacing.lg,
    color: Colors.white,
    fontSize: FontSize.sm,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderRadius: Radius.xl,
  },
  addBtnText: { color: Colors.dark, fontSize: FontSize.sm, fontWeight: "700" },
  addFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: Spacing.lg },
  hint: { color: Colors.textMuted, fontSize: FontSize.xs },
  clearBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  clearBtnDisabled: { opacity: 0.5 },
  clearBtnText: { color: Colors.textTertiary, fontSize: FontSize.xs },
  groupCard: { marginBottom: Spacing.lg },
  groupInner: { padding: Spacing.xl, borderRadius: Radius.xxl },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  chevronWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.inputBg,
    justifyContent: "center",
    alignItems: "center",
  },
  chevronWrapActive: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  groupTitleWrap: { flex: 1 },
  groupTitle: { color: Colors.white, fontSize: FontSize.md, fontWeight: "600" },
  groupSub: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },
  itemsList: { marginTop: Spacing.lg, gap: Spacing.sm },
  itemRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: { borderColor: Colors.accent, backgroundColor: Colors.accent },
  itemText: { flex: 1, color: Colors.white, fontSize: FontSize.sm },
  itemTextChecked: { color: Colors.textTertiary, textDecorationLine: "line-through" },
  removeBtn: { padding: 4 },
  emptyCard: { padding: Spacing.xxl, alignItems: "center", gap: Spacing.sm },
  emptyTitle: { color: Colors.white, fontSize: FontSize.lg, fontWeight: "600" },
  emptySub: { color: Colors.textTertiary, fontSize: FontSize.sm },
});
