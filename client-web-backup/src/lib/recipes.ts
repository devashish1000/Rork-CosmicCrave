import { AI_LIMITS } from "@shared/ai-constraints";
import { getActiveUserId, readUserScoped, writeUserScoped } from "@/lib/user-storage";

export type RecipeFull = {
  id: string;
  title: string;
  minutes: number;
  blurb: string;
  tags: string[];
  cuisine?: string;
  servings: number;
  heroGradient: string;
  image?: string;
  calories?: string;
  difficulty?: string;
  ingredients: { name: string; qty: string }[];
  steps: { text: string; timerSeconds?: number }[];
};

const RUNTIME_RECIPES_KEY = "runtimeRecipes:v1";
const runtimeRecipes = new Map<string, RecipeFull>();
let runtimeHydrated = false;
let runtimeHydratedForUser: string | null = null;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const out: string[] = [];

  for (const entry of tags.slice(0, AI_LIMITS.maxRecipeTags * 3)) {
    const next = sanitizeText(entry, AI_LIMITS.maxRecipeTagLength);
    if (!next) continue;
    const key = next.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(next);
    if (out.length >= AI_LIMITS.maxRecipeTags) break;
  }

  return out;
}

function normalizeIngredients(ingredients: unknown): RecipeFull["ingredients"] {
  if (!Array.isArray(ingredients)) return [];
  const out: RecipeFull["ingredients"] = [];
  const seen = new Set<string>();

  for (const entry of ingredients.slice(0, AI_LIMITS.maxIngredientsPerRecipe * 3)) {
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

function normalizeSteps(steps: unknown): RecipeFull["steps"] {
  if (!Array.isArray(steps)) return [];
  const out: RecipeFull["steps"] = [];

  for (const entry of steps.slice(0, AI_LIMITS.maxStepsPerRecipe * 3)) {
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

function normalizeRecipe(value: unknown, index: number): RecipeFull | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<RecipeFull>;
  const fallback = RECIPES[index % RECIPES.length];
  const id = sanitizeText(raw.id, 96);
  if (!id) return null;

  const minutesRaw = typeof raw.minutes === "number" && Number.isFinite(raw.minutes) ? raw.minutes : fallback.minutes;
  const servingsRaw = typeof raw.servings === "number" && Number.isFinite(raw.servings) ? raw.servings : fallback.servings;
  const ingredients = normalizeIngredients(raw.ingredients);
  const steps = normalizeSteps(raw.steps);
  const tags = normalizeTags(raw.tags);

  return {
    id,
    title: sanitizeText(raw.title, AI_LIMITS.maxRecipeTitleLength) || fallback.title,
    minutes: clamp(Math.round(minutesRaw), 5, 120),
    blurb: sanitizeText(raw.blurb, AI_LIMITS.maxRecipeBlurbLength) || fallback.blurb,
    tags: tags.length ? tags : fallback.tags,
    cuisine: sanitizeText(raw.cuisine, AI_LIMITS.maxRecipeTagLength) || fallback.cuisine,
    servings: clamp(Math.round(servingsRaw), 1, 12),
    heroGradient: sanitizeText(raw.heroGradient, 900) || fallback.heroGradient,
    image: sanitizeText(raw.image, 1024) || fallback.image,
    calories: sanitizeText(raw.calories, 24) || fallback.calories,
    difficulty: sanitizeText(raw.difficulty, 24) || fallback.difficulty,
    ingredients: ingredients.length ? ingredients : fallback.ingredients,
    steps: steps.length ? steps : fallback.steps,
  };
}

function persistRuntimeRecipes() {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(Array.from(runtimeRecipes.values()));
    writeUserScoped(RUNTIME_RECIPES_KEY, serialized);
  } catch {
    // ignore storage failures
  }
}

function hydrateRuntimeRecipes() {
  const activeUserId = getActiveUserId();
  if (runtimeHydrated && runtimeHydratedForUser === activeUserId) return;

  runtimeRecipes.clear();
  runtimeHydrated = true;
  runtimeHydratedForUser = activeUserId;

  if (typeof window === "undefined") return;
  try {
    const raw = readUserScoped(RUNTIME_RECIPES_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    parsed.forEach((entry, index) => {
      const normalized = normalizeRecipe(entry, index);
      if (!normalized) return;
      runtimeRecipes.set(normalized.id, normalized);
    });
  } catch {
    // ignore parse errors
  }
}

export function registerRuntimeRecipes(recipes: unknown[]) {
  hydrateRuntimeRecipes();
  let changed = false;

  recipes.forEach((entry, index) => {
    const normalized = normalizeRecipe(entry, index);
    if (!normalized) return;
    runtimeRecipes.set(normalized.id, normalized);
    changed = true;
  });

  if (changed) {
    persistRuntimeRecipes();
  }
}

export function getAllRecipes(): RecipeFull[] {
  hydrateRuntimeRecipes();
  const byId = new Map<string, RecipeFull>();
  RECIPES.forEach((recipe) => byId.set(recipe.id, recipe));
  runtimeRecipes.forEach((recipe) => byId.set(recipe.id, recipe));
  return Array.from(byId.values());
}

export const RECIPES: RecipeFull[] = [
  {
    id: "s1",
    title: "Basil Tomato Pasta",
    minutes: 20,
    blurb: "Quick Italian comfort food with bright basil.",
    tags: ["Vegetarian", "One-pan"],
    cuisine: "Italian",
    servings: 2,
    heroGradient:
      "linear-gradient(135deg, hsl(20 100% 60% / 0.35), transparent 55%), radial-gradient(circle at 20% 10%, hsl(195 90% 55% / 0.18), transparent 45%), radial-gradient(circle at 90% 80%, hsl(275 80% 65% / 0.16), transparent 50%)",
    image: "/images/recipe-pasta.png",
    calories: "450 kcal",
    difficulty: "Easy",
    ingredients: [
      { qty: "200 g", name: "pasta" },
      { qty: "2", name: "tomatoes" },
      { qty: "handful", name: "fresh basil" },
      { qty: "2 cloves", name: "garlic" },
      { qty: "2 tbsp", name: "olive oil" },
      { qty: "to taste", name: "salt & pepper" },
    ],
    steps: [
      { text: "Boil pasta until al dente." },
      { text: "Sauté garlic in olive oil until fragrant.", timerSeconds: 45 },
      { text: "Add chopped tomatoes; simmer into a sauce.", timerSeconds: 180 },
      { text: "Toss pasta with sauce and finish with basil." },
    ],
  },
  {
    id: "s2",
    title: "Quinoa Power Bowl",
    minutes: 15,
    blurb: "Fresh, filling, and packed with protein.",
    tags: ["Healthy"],
    cuisine: "Healthy",
    servings: 2,
    heroGradient:
      "linear-gradient(135deg, hsl(150 70% 45% / 0.28), transparent 55%), radial-gradient(circle at 70% 25%, hsl(195 90% 55% / 0.16), transparent 45%), radial-gradient(circle at 25% 80%, hsl(45 95% 60% / 0.14), transparent 55%)",
    image: "/images/recipe-salad.png",
    calories: "320 kcal",
    difficulty: "Easy",
    ingredients: [
      { qty: "1 cup", name: "cooked quinoa" },
      { qty: "1/2", name: "cucumber" },
      { qty: "1", name: "avocado" },
      { qty: "handful", name: "greens" },
      { qty: "1", name: "lemon" },
      { qty: "2 tbsp", name: "olive oil" },
    ],
    steps: [
      { text: "Cook quinoa and let cool slightly." },
      { text: "Chop cucumber and slice avocado." },
      { text: "Assemble bowl with greens and quinoa." },
      { text: "Dress with lemon and olive oil." },
    ],
  },
  {
    id: "s3",
    title: "Berry Blast Smoothie",
    minutes: 5,
    blurb: "Fast breakfast you can sip.",
    tags: ["Breakfast"],
    cuisine: "Breakfast",
    servings: 2,
    heroGradient:
      "linear-gradient(135deg, hsl(275 80% 65% / 0.22), transparent 55%), radial-gradient(circle at 25% 20%, hsl(20 100% 60% / 0.18), transparent 50%), radial-gradient(circle at 85% 80%, hsl(150 70% 45% / 0.14), transparent 55%)",
    image: "/images/recipe-smoothie.png",
    calories: "180 kcal",
    difficulty: "Easy",
    ingredients: [
      { qty: "1 cup", name: "frozen berries" },
      { qty: "1", name: "banana" },
      { qty: "1 cup", name: "milk" },
      { qty: "1/2 cup", name: "yogurt" },
    ],
    steps: [
      { text: "Add all ingredients to blender." },
      { text: "Blend until smooth.", timerSeconds: 60 },
      { text: "Pour and enjoy." },
    ],
  },
  {
    id: "r1",
    title: "Smoky Chickpea Skillet",
    minutes: 18,
    blurb: "Paprika, lemon, garlic—fast, hearty, pantry-friendly.",
    tags: ["Vegan", "One-pan"],
    cuisine: "Vegan",
    servings: 2,
    heroGradient:
      "linear-gradient(135deg, hsl(20 100% 60% / 0.35), transparent 55%), radial-gradient(circle at 20% 10%, hsl(195 90% 55% / 0.18), transparent 45%), radial-gradient(circle at 90% 80%, hsl(275 80% 65% / 0.16), transparent 50%)",
    image: "/images/recipe-pasta.png",
    ingredients: [
      { qty: "1 can", name: "chickpeas" },
      { qty: "2 tbsp", name: "olive oil" },
      { qty: "2 cloves", name: "garlic" },
      { qty: "1 tsp", name: "smoked paprika" },
      { qty: "1/2", name: "lemon" },
      { qty: "1 cup", name: "spinach" },
      { qty: "to taste", name: "salt" },
    ],
    steps: [
      { text: "Warm olive oil in a skillet over medium heat." },
      { text: "Add garlic and smoked paprika; cook until fragrant.", timerSeconds: 45 },
      { text: "Add chickpeas and a pinch of salt. Toss until glossy." },
      { text: "Squeeze in lemon, then fold in spinach until just wilted.", timerSeconds: 60 },
      { text: "Taste and adjust salt/lemon. Serve warm." },
    ],
  },
  {
    id: "r2",
    title: "Orange-Ginger Salmon Bowl",
    minutes: 22,
    blurb: "Crisp greens, sticky glaze, and a bright citrus finish.",
    tags: ["High-protein"],
    cuisine: "High-protein",
    servings: 2,
    heroGradient:
      "linear-gradient(135deg, hsl(20 100% 60% / 0.25), transparent 55%), radial-gradient(circle at 70% 25%, hsl(195 90% 55% / 0.16), transparent 45%), radial-gradient(circle at 25% 80%, hsl(45 95% 60% / 0.14), transparent 55%)",
    image: "/images/recipe-salad.png",
    ingredients: [
      { qty: "2", name: "salmon fillets" },
      { qty: "1", name: "orange" },
      { qty: "1 tsp", name: "grated ginger" },
      { qty: "1 tbsp", name: "soy sauce" },
      { qty: "1 tsp", name: "honey" },
      { qty: "2 cups", name: "rice (cooked)" },
      { qty: "1 cup", name: "cucumber" },
    ],
    steps: [
      { text: "Mix orange juice, ginger, soy sauce, and honey." },
      { text: "Sear salmon skin-side down until crisp.", timerSeconds: 180 },
      { text: "Flip, pour glaze, and simmer until sticky.", timerSeconds: 120 },
      { text: "Build bowls with rice and cucumber; top with salmon." },
      { text: "Finish with orange zest (optional) and serve." },
    ],
  },
  {
    id: "r3",
    title: "Charred Corn & Avocado Tacos",
    minutes: 16,
    blurb: "Sweet heat, lime crema, and crunch—weeknight magic.",
    tags: ["Vegetarian"],
    cuisine: "Vegetarian",
    servings: 2,
    heroGradient:
      "linear-gradient(135deg, hsl(275 80% 65% / 0.22), transparent 55%), radial-gradient(circle at 25% 20%, hsl(20 100% 60% / 0.18), transparent 50%), radial-gradient(circle at 85% 80%, hsl(150 70% 45% / 0.14), transparent 55%)",
    image: "/images/recipe-smoothie.png",
    ingredients: [
      { qty: "2", name: "corn cobs (or 1 cup kernels)" },
      { qty: "1", name: "avocado" },
      { qty: "1", name: "lime" },
      { qty: "6", name: "small tortillas" },
      { qty: "1/2 tsp", name: "chili powder" },
      { qty: "2 tbsp", name: "sour cream" },
      { qty: "handful", name: "cilantro" },
    ],
    steps: [
      { text: "Char corn in a hot pan until blistered.", timerSeconds: 180 },
      { text: "Slice avocado; toss with lime and a pinch of salt." },
      { text: "Warm tortillas in the same pan.", timerSeconds: 45 },
      { text: "Assemble tacos with corn, avocado, crema, cilantro." },
      { text: "Sprinkle chili powder and serve immediately." },
    ],
  },
];

export function getRecipe(id: string) {
  hydrateRuntimeRecipes();
  return runtimeRecipes.get(id) ?? RECIPES.find((r) => r.id === id) ?? null;
}
