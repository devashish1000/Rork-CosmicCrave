import { readUserScoped, writeUserScoped } from "@/lib/user-storage";

const COOKED_KEY = "cooked:v1";
const LEGACY_COOKED_KEYS = ["snapcook:cooked:v1"];
const MAX_RECIPE_ID_LENGTH = 180;

export type CookedEntry = {
  recipeId: string;
  cookedAt: number;
};

function normalizeRecipeId(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_RECIPE_ID_LENGTH);
}

function normalizeCookedAt(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function normalizeCookedEntries(input: unknown): CookedEntry[] {
  if (!Array.isArray(input)) return [];
  const latestByRecipe = new Map<string, CookedEntry>();

  input.forEach((item) => {
    if (typeof item === "string") {
      const recipeId = normalizeRecipeId(item);
      if (!recipeId) return;
      if (latestByRecipe.has(recipeId)) return;
      latestByRecipe.set(recipeId, { recipeId, cookedAt: 0 });
      return;
    }

    if (!item || typeof item !== "object") return;
    const raw = item as Partial<CookedEntry>;
    const recipeId = normalizeRecipeId(raw.recipeId);
    if (!recipeId) return;
    const cookedAt = normalizeCookedAt(raw.cookedAt);

    const prev = latestByRecipe.get(recipeId);
    if (prev && prev.cookedAt >= cookedAt) return;
    latestByRecipe.set(recipeId, { recipeId, cookedAt });
  });

  return Array.from(latestByRecipe.values()).sort((a, b) => b.cookedAt - a.cookedAt);
}

function readCookedEntries(): CookedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = readUserScoped(COOKED_KEY, LEGACY_COOKED_KEYS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return normalizeCookedEntries(parsed);
  } catch {
    return [];
  }
}

function writeCookedEntries(entries: CookedEntry[]) {
  if (typeof window === "undefined") return;
  writeUserScoped(COOKED_KEY, JSON.stringify(entries));
}

export function getCookedEntries() {
  return readCookedEntries();
}

export function getCookedIds() {
  return readCookedEntries().map((entry) => entry.recipeId);
}

export function isRecipeCooked(recipeId: string) {
  const normalizedRecipeId = normalizeRecipeId(recipeId);
  if (!normalizedRecipeId) return false;
  return readCookedEntries().some((entry) => entry.recipeId === normalizedRecipeId);
}

export function markRecipeCooked(recipeId: string) {
  const normalizedRecipeId = normalizeRecipeId(recipeId);
  if (!normalizedRecipeId) return getCookedIds();

  const existing = readCookedEntries().filter((entry) => entry.recipeId !== normalizedRecipeId);
  existing.unshift({ recipeId: normalizedRecipeId, cookedAt: Date.now() });
  writeCookedEntries(existing);
  return existing.map((entry) => entry.recipeId);
}
