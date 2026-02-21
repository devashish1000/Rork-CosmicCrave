import { AI_LIMITS } from "@shared/ai-constraints";
import type { RecipeFull } from "@/lib/recipes";
import { registerRuntimeRecipes } from "@/lib/recipes";
import type { DetectedItem } from "@/lib/scan-payload";
import { sanitizeDetectedItems } from "@/lib/scan-payload";

export type ScanIdeasPayload = {
  scanId: string;
  mode: "live" | "fallback";
  detectedItems: DetectedItem[];
  recipes: RecipeFull[];
};

const SCAN_IDEAS_PREFIX = "cosmiccrave:scanIdeas:";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function payloadKey(scanId: string) {
  return `${SCAN_IDEAS_PREFIX}${scanId}`;
}

function normalizeScanId(scanId: unknown) {
  return sanitizeText(scanId, AI_LIMITS.maxScanIdLength).replace(/[^a-zA-Z0-9:_-]/g, "");
}

function mapImageFromHint(hint: unknown, index: number) {
  const normalized = sanitizeText(hint, 24).toLowerCase();
  if (normalized === "salad") return "/images/recipe-salad.png";
  if (normalized === "smoothie") return "/images/recipe-smoothie.png";
  if (normalized === "pasta") return "/images/recipe-pasta.png";
  if (index % 3 === 1) return "/images/recipe-salad.png";
  if (index % 3 === 2) return "/images/recipe-smoothie.png";
  return "/images/recipe-pasta.png";
}

function normalizeIngredients(raw: unknown): RecipeFull["ingredients"] {
  if (!Array.isArray(raw)) return [];
  const out: RecipeFull["ingredients"] = [];
  const seen = new Set<string>();
  for (const entry of raw.slice(0, AI_LIMITS.maxIngredientsPerRecipe * 3)) {
    const name = sanitizeText((entry as { name?: unknown })?.name, AI_LIMITS.maxIngredientNameLength);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      qty: sanitizeText((entry as { qty?: unknown })?.qty, AI_LIMITS.maxIngredientQtyLength) || "to taste",
    });
    if (out.length >= AI_LIMITS.maxIngredientsPerRecipe) break;
  }
  return out;
}

function normalizeSteps(raw: unknown): RecipeFull["steps"] {
  if (!Array.isArray(raw)) return [];
  const out: RecipeFull["steps"] = [];
  for (const entry of raw.slice(0, AI_LIMITS.maxStepsPerRecipe * 3)) {
    const text = sanitizeText((entry as { text?: unknown })?.text, AI_LIMITS.maxStepTextLength);
    if (!text) continue;
    const timerRaw = (entry as { timerSeconds?: unknown })?.timerSeconds;
    const timerSeconds =
      typeof timerRaw === "number" && Number.isFinite(timerRaw)
        ? clamp(Math.round(timerRaw), 0, 3600)
        : undefined;
    out.push({ text, timerSeconds: timerSeconds && timerSeconds > 0 ? timerSeconds : undefined });
    if (out.length >= AI_LIMITS.maxStepsPerRecipe) break;
  }
  return out;
}

function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw.slice(0, AI_LIMITS.maxRecipeTags * 3)) {
    const next = sanitizeText(value, AI_LIMITS.maxRecipeTagLength);
    if (!next) continue;
    const key = next.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(next);
    if (out.length >= AI_LIMITS.maxRecipeTags) break;
  }
  return out;
}

function normalizeRecipe(raw: unknown, scanId: string, index: number): RecipeFull | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as {
    id?: unknown;
    title?: unknown;
    minutes?: unknown;
    blurb?: unknown;
    tags?: unknown;
    cuisine?: unknown;
    servings?: unknown;
    calories?: unknown;
    difficulty?: unknown;
    heroGradient?: unknown;
    image?: unknown;
    imageHint?: unknown;
    ingredients?: unknown;
    steps?: unknown;
  };

  const title = sanitizeText(data.title, AI_LIMITS.maxRecipeTitleLength);
  if (!title) return null;

  const safeId =
    sanitizeText(data.id, 96).replace(/[^a-zA-Z0-9:_-]/g, "") ||
    `g:${scanId}:recipe:${index + 1}`;
  const minutesRaw =
    typeof data.minutes === "number" && Number.isFinite(data.minutes)
      ? data.minutes
      : Number(String(data.minutes ?? "").match(/\d+/)?.[0] ?? 20);
  const servingsRaw =
    typeof data.servings === "number" && Number.isFinite(data.servings)
      ? data.servings
      : Number(String(data.servings ?? "").match(/\d+/)?.[0] ?? 2);
  const ingredients = normalizeIngredients(data.ingredients);
  const steps = normalizeSteps(data.steps);

  return {
    id: safeId,
    title,
    minutes: clamp(Math.round(minutesRaw), 5, 120),
    blurb:
      sanitizeText(data.blurb, AI_LIMITS.maxRecipeBlurbLength) ||
      "Recipe idea generated from your detected ingredients.",
    tags: normalizeTags(data.tags).length ? normalizeTags(data.tags) : ["Quick"],
    cuisine: sanitizeText(data.cuisine, AI_LIMITS.maxRecipeTagLength) || undefined,
    servings: clamp(Math.round(servingsRaw), 1, 12),
    heroGradient:
      sanitizeText(data.heroGradient, 900) ||
      "linear-gradient(135deg, hsl(20 100% 60% / 0.35), transparent 55%), radial-gradient(circle at 20% 10%, hsl(195 90% 55% / 0.18), transparent 45%), radial-gradient(circle at 90% 80%, hsl(275 80% 65% / 0.16), transparent 50%)",
    image: sanitizeText(data.image, 1024) || mapImageFromHint(data.imageHint, index),
    calories: sanitizeText(data.calories, 24) || undefined,
    difficulty: sanitizeText(data.difficulty, 24) || "Easy",
    ingredients: ingredients.length
      ? ingredients
      : [{ name: "olive oil", qty: "1 tbsp" }, { name: "salt", qty: "to taste" }],
    steps: steps.length
      ? steps
      : [
          { text: "Prepare all ingredients." },
          { text: "Cook until aromatic and tender.", timerSeconds: 180 },
          { text: "Plate and serve." },
        ],
  };
}

function normalizePayload(input: unknown): ScanIdeasPayload | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as {
    scanId?: unknown;
    mode?: unknown;
    detectedItems?: unknown;
    recipes?: unknown;
  };

  const scanId = normalizeScanId(raw.scanId);
  if (!scanId) return null;

  const mode = raw.mode === "live" ? "live" : "fallback";
  const detectedItems = sanitizeDetectedItems(raw.detectedItems);
  const recipesRaw = Array.isArray(raw.recipes) ? raw.recipes : [];
  const recipes = recipesRaw
    .slice(0, AI_LIMITS.maxRecipesPerScan)
    .map((recipe, index) => normalizeRecipe(recipe, scanId, index))
    .filter(Boolean) as RecipeFull[];

  if (!recipes.length) return null;

  return {
    scanId,
    mode,
    detectedItems,
    recipes,
  };
}

export function storeScanIdeas(payload: unknown): ScanIdeasPayload | null {
  const normalized = normalizePayload(payload);
  if (!normalized || !canUseStorage()) return normalized;

  try {
    window.sessionStorage.setItem(payloadKey(normalized.scanId), JSON.stringify(normalized));
  } catch {
    // ignore storage write failures
  }

  registerRuntimeRecipes(normalized.recipes);
  return normalized;
}

export function readScanIdeas(scanId: string | null | undefined): ScanIdeasPayload | null {
  if (!scanId) return null;
  const normalizedScanId = normalizeScanId(scanId);
  if (!normalizedScanId || !canUseStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(payloadKey(normalizedScanId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const normalized = normalizePayload(parsed);
    if (!normalized) return null;
    registerRuntimeRecipes(normalized.recipes);
    return normalized;
  } catch {
    return null;
  }
}

export function removeScanIdeas(scanId: string | null | undefined) {
  if (!scanId || !canUseStorage()) return;
  const normalizedScanId = normalizeScanId(scanId);
  if (!normalizedScanId) return;
  try {
    window.sessionStorage.removeItem(payloadKey(normalizedScanId));
  } catch {
    // ignore
  }
}
