import { randomUUID } from "crypto";
import { z } from "zod";
import { AI_LIMITS, SCAN_SOURCE_VALUES, type ScanSource } from "@shared/ai-constraints";
import { env } from "./env";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const analyzeRequestSchema = z.object({
  scanId: z.string().trim().max(AI_LIMITS.maxScanIdLength).optional(),
  source: z.enum(SCAN_SOURCE_VALUES).optional(),
  imageDataUrl: z.string().max(AI_LIMITS.maxImageDataUrlLength).optional(),
  detectedHint: z.array(z.string()).max(AI_LIMITS.maxDetectedItems * 10).optional(),
  dietaryPreferences: z.object({
    dietType: z.string().optional(),
    allergies: z.array(z.string()).optional(),
  }).optional(),
});

type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export type AnalyzeDetectedItem = {
  name: string;
  confidence?: number;
  source?: ScanSource | "hint" | "ai";
};

export type AnalyzeRecipe = {
  id: string;
  title: string;
  minutes: number;
  blurb: string;
  tags: string[];
  cuisine?: string;
  servings: number;
  calories?: string;
  difficulty?: string;
  imageHint?: "pasta" | "salad" | "smoothie";
  ingredients: Array<{ name: string; qty: string }>;
  steps: Array<{ text: string; timerSeconds?: number }>;
};

export type AnalyzeResponse = {
  scanId: string;
  mode: "live" | "fallback";
  detectedItems: AnalyzeDetectedItem[];
  recipes: AnalyzeRecipe[];
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeScanId(scanId: string | undefined) {
  const normalized = sanitizeText(scanId, AI_LIMITS.maxScanIdLength).replace(/[^a-zA-Z0-9:_-]/g, "");
  if (normalized) return normalized;
  return `scan_${randomUUID().slice(0, 12)}`;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, 48) || "recipe";
}

function normalizeDetectedItems(raw: unknown, fallbackSource: AnalyzeDetectedItem["source"]): AnalyzeDetectedItem[] {
  if (!Array.isArray(raw)) return [];
  const byName = new Map<string, AnalyzeDetectedItem>();

  const maxCandidates = AI_LIMITS.maxDetectedItems * 8;
  const slice = raw.slice(0, maxCandidates);

  for (const entry of slice) {
    const name = sanitizeText((entry as { name?: unknown })?.name, AI_LIMITS.maxDetectedNameLength);
    if (!name) continue;
    const confidenceRaw = (entry as { confidence?: unknown })?.confidence;
    const confidence =
      typeof confidenceRaw === "number" && Number.isFinite(confidenceRaw)
        ? clamp(confidenceRaw, 0, 1)
        : undefined;
    const key = name.toLowerCase();
    const prev = byName.get(key);
    if (!prev || (confidence ?? -1) > (prev.confidence ?? -1)) {
      byName.set(key, { name, confidence, source: fallbackSource });
    }
  }

  return Array.from(byName.values())
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0) || a.name.localeCompare(b.name))
    .slice(0, AI_LIMITS.maxDetectedItems);
}

function normalizeTagList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
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

function normalizeIngredients(raw: unknown, detected: AnalyzeDetectedItem[]) {
  const out: Array<{ name: string; qty: string }> = [];
  const seen = new Set<string>();

  if (Array.isArray(raw)) {
    for (const entry of raw.slice(0, AI_LIMITS.maxIngredientsPerRecipe * 3)) {
      const name = sanitizeText((entry as { name?: unknown })?.name, AI_LIMITS.maxIngredientNameLength);
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      const qty = sanitizeText((entry as { qty?: unknown })?.qty, AI_LIMITS.maxIngredientQtyLength) || "to taste";
      seen.add(key);
      out.push({ name, qty });
      if (out.length >= AI_LIMITS.maxIngredientsPerRecipe) break;
    }
  }

  if (out.length === 0) {
    const detectedAsIngredients = detected.slice(0, Math.min(6, AI_LIMITS.maxIngredientsPerRecipe)).map((item) => ({
      name: item.name,
      qty: "1",
    }));
    out.push(...detectedAsIngredients);
  }

  if (out.length === 0) {
    out.push(
      { name: "olive oil", qty: "1 tbsp" },
      { name: "salt", qty: "to taste" },
      { name: "black pepper", qty: "to taste" },
    );
  }

  return out.slice(0, AI_LIMITS.maxIngredientsPerRecipe);
}

function normalizeSteps(raw: unknown) {
  const out: Array<{ text: string; timerSeconds?: number }> = [];
  if (Array.isArray(raw)) {
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
  }

  if (out.length === 0) {
    out.push(
      { text: "Prep your ingredients and season to taste." },
      { text: "Cook over medium heat until tender and aromatic.", timerSeconds: 180 },
      { text: "Plate, garnish, and serve warm." },
    );
  }

  return out.slice(0, AI_LIMITS.maxStepsPerRecipe);
}

function parseMinutes(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return clamp(Math.round(value), 5, 120);
  if (typeof value === "string") {
    const matched = value.match(/\d+/);
    if (!matched) return 20;
    return clamp(Number(matched[0]), 5, 120);
  }
  return 20;
}

function parseServings(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return clamp(Math.round(value), 1, 12);
  if (typeof value === "string") {
    const matched = value.match(/\d+/);
    if (!matched) return 2;
    return clamp(Number(matched[0]), 1, 12);
  }
  return 2;
}

function parseCalories(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return `${clamp(Math.round(value), 80, 1800)} kcal`;
  if (typeof value === "string") {
    const matched = value.match(/\d+/);
    if (!matched) return undefined;
    return `${clamp(Number(matched[0]), 80, 1800)} kcal`;
  }
  return undefined;
}

function parseImageHint(value: unknown): AnalyzeRecipe["imageHint"] {
  const next = sanitizeText(value, 24).toLowerCase();
  if (next === "pasta" || next === "salad" || next === "smoothie") return next;
  return undefined;
}

function normalizeRecipe(raw: unknown, index: number, scanId: string, detected: AnalyzeDetectedItem[]): AnalyzeRecipe {
  const title = sanitizeText((raw as { title?: unknown })?.title, AI_LIMITS.maxRecipeTitleLength) || `Recipe Idea ${index + 1}`;
  const idRaw = sanitizeText((raw as { id?: unknown })?.id, 64);
  const id = idRaw || `g:${scanId}:${slugify(title)}:${index + 1}`;
  const blurb =
    sanitizeText((raw as { blurb?: unknown })?.blurb, AI_LIMITS.maxRecipeBlurbLength) ||
    "A balanced idea based on your detected ingredients.";
  const tags = normalizeTagList((raw as { tags?: unknown })?.tags);
  const cuisine = sanitizeText((raw as { cuisine?: unknown })?.cuisine, AI_LIMITS.maxRecipeTagLength) || undefined;
  const difficulty = sanitizeText((raw as { difficulty?: unknown })?.difficulty, 24) || undefined;
  const minutes = parseMinutes((raw as { minutes?: unknown })?.minutes);
  const servings = parseServings((raw as { servings?: unknown })?.servings);
  const calories = parseCalories((raw as { calories?: unknown })?.calories);
  const ingredients = normalizeIngredients((raw as { ingredients?: unknown })?.ingredients, detected);
  const steps = normalizeSteps((raw as { steps?: unknown })?.steps);
  const imageHint = parseImageHint((raw as { imageHint?: unknown })?.imageHint) ?? (index === 0 ? "pasta" : index === 1 ? "salad" : "smoothie");

  return {
    id,
    title,
    minutes,
    blurb,
    tags: tags.length ? tags : ["Quick"],
    cuisine,
    servings,
    calories,
    difficulty,
    imageHint,
    ingredients,
    steps,
  };
}

function extractImagePayload(imageDataUrl: string | undefined) {
  if (!imageDataUrl) return null;
  if (imageDataUrl.length > AI_LIMITS.maxImageDataUrlLength) return null;
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  const data = match[2].replace(/\s+/g, "");
  if (!allowedMimeTypes.has(mimeType)) return null;
  if (!data) return null;
  return { mimeType, data };
}

function parseJsonFromText(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

const RETRYABLE_GEMINI_STATUS = new Set([429, 500, 502, 503, 504]);
const GEMINI_MAX_ATTEMPTS = 3;
const GEMINI_REQUEST_TIMEOUT_MS = 20000;
const GEMINI_BACKOFF_BASE_MS = 450;
const GEMINI_BACKOFF_MAX_MS = 3500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, GEMINI_BACKOFF_MAX_MS);
  }

  const asDate = Date.parse(value);
  if (Number.isNaN(asDate)) return null;
  const delta = asDate - Date.now();
  if (delta <= 0) return null;
  return Math.min(delta, GEMINI_BACKOFF_MAX_MS);
}

function nextBackoffMs(attempt: number) {
  const exp = Math.min(
    GEMINI_BACKOFF_MAX_MS,
    GEMINI_BACKOFF_BASE_MS * 2 ** Math.max(0, attempt - 1),
  );
  const jitter = Math.floor(Math.random() * 150);
  return exp + jitter;
}

async function requestGeminiWithRetry(
  body: string,
  apiKey: string,
  model: string,
): Promise<Response | null> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller.signal,
      });

      if (response.ok) {
        return response;
      }

      const isRetryable = RETRYABLE_GEMINI_STATUS.has(response.status);
      if (!isRetryable || attempt === GEMINI_MAX_ATTEMPTS) {
        return null;
      }

      const retryDelay =
        parseRetryAfterMs(response.headers.get("retry-after")) ??
        nextBackoffMs(attempt);
      await sleep(retryDelay);
    } catch {
      if (attempt === GEMINI_MAX_ATTEMPTS) {
        return null;
      }
      await sleep(nextBackoffMs(attempt));
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

async function generateWithGemini(payload: AnalyzeRequest, normalizedScanId: string): Promise<AnalyzeResponse | null> {
  if (!env.geminiApiKey) return null;

  const imagePayload = extractImagePayload(payload.imageDataUrl);
  const hintDetected = normalizeDetectedItems(
    (payload.detectedHint ?? []).map((name) => ({ name, confidence: 0.6 })),
    "hint",
  );
  const hintText = hintDetected.length ? hintDetected.map((item) => item.name).join(", ") : "none";

  // Build dietary preferences text
  const dietaryText = payload.dietaryPreferences
    ? (() => {
        const { dietType, allergies } = payload.dietaryPreferences;
        const parts: string[] = [];
        if (dietType && dietType !== "Flexible") {
          parts.push(`Diet type: ${dietType}`);
        }
        if (allergies && allergies.length > 0 && !allergies.includes("None")) {
          parts.push(`Allergies to avoid: ${allergies.filter(a => a !== "None").join(", ")}`);
        }
        return parts.length > 0 ? parts.join(". ") : null;
      })()
    : null;

  const prompt = [
    "Analyze the input and return strict JSON only.",
    "Output shape:",
    "{",
    '  "detectedItems": [{ "name": string, "confidence": number }],',
    '  "recipes": [{',
    '    "id": string,',
    '    "title": string,',
    '    "blurb": string,',
    '    "minutes": number,',
    '    "servings": number,',
    '    "calories": string,',
    '    "difficulty": string,',
    '    "cuisine": string,',
    '    "tags": string[],',
    '    "imageHint": "pasta"|"salad"|"smoothie",',
    '    "ingredients": [{ "name": string, "qty": string }],',
    '    "steps": [{ "text": string, "timerSeconds": number }]',
    "  }]",
    "}",
    "",
    "Rules:",
    `- detectedItems max ${AI_LIMITS.maxDetectedItems}`,
    `- recipes exactly ${AI_LIMITS.maxRecipesPerScan}`,
    `- ingredients per recipe max ${AI_LIMITS.maxIngredientsPerRecipe}`,
    `- steps per recipe max ${AI_LIMITS.maxStepsPerRecipe}`,
    "- do not include markdown",
    "- ensure each recipe is distinct and practical",
    `- scan id context: ${normalizedScanId}`,
    `- user-provided hint ingredients: ${hintText}`,
    dietaryText ? `- IMPORTANT: User dietary restrictions: ${dietaryText}. Only generate recipes that comply with these restrictions. Do not include any ingredients that match the user's allergies.` : "",
  ].filter(Boolean).join("\n");

  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  if (imagePayload) {
    parts.push({
      inlineData: {
        mimeType: imagePayload.mimeType,
        data: imagePayload.data,
      },
    });
  }

  try {
    const requestBody = JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: "application/json",
      },
    });

    const response = await requestGeminiWithRetry(
      requestBody,
      env.geminiApiKey,
      env.geminiModel,
    );
    if (!response) {
      return null;
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const candidateText =
      data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "";
    const parsed = parseJsonFromText(candidateText);
    if (!parsed || typeof parsed !== "object") return null;

    const detected = normalizeDetectedItems(
      (parsed as { detectedItems?: unknown }).detectedItems,
      imagePayload ? (payload.source ?? "camera") : "ai",
    );
    const recipesRaw = Array.isArray((parsed as { recipes?: unknown }).recipes)
      ? ((parsed as { recipes: unknown[] }).recipes)
      : [];

    const normalizedRecipes = recipesRaw
      .slice(0, AI_LIMITS.maxRecipesPerScan)
      .map((recipe, idx) => normalizeRecipe(recipe, idx, normalizedScanId, detected));

    if (normalizedRecipes.length === 0) return null;

    while (normalizedRecipes.length < AI_LIMITS.maxRecipesPerScan) {
      const fallbackIdx = normalizedRecipes.length;
      normalizedRecipes.push(...buildFallbackRecipes(normalizedScanId, detected).slice(fallbackIdx, fallbackIdx + 1));
    }

    return {
      scanId: normalizedScanId,
      mode: "live",
      detectedItems: detected.length ? detected : hintDetected,
      recipes: normalizedRecipes.slice(0, AI_LIMITS.maxRecipesPerScan),
    };
  } catch {
    return null;
  }
}

function buildFallbackDetected(payload: AnalyzeRequest) {
  const hintDetected = normalizeDetectedItems(
    (payload.detectedHint ?? []).map((name) => ({ name, confidence: 0.7 })),
    "hint",
  );
  if (hintDetected.length) return hintDetected;
  return [
    { name: "Tomatoes", confidence: 0.92, source: "ai" as const },
    { name: "Basil", confidence: 0.89, source: "ai" as const },
    { name: "Pasta", confidence: 0.86, source: "ai" as const },
  ];
}

function buildFallbackRecipes(scanId: string, detected: AnalyzeDetectedItem[]): AnalyzeRecipe[] {
  const anchor = detected[0]?.name ?? "vegetables";
  const secondary = detected[1]?.name ?? "herbs";
  const tertiary = detected[2]?.name ?? "protein";

  const templates = [
    {
      title: `${anchor} Weeknight Skillet`,
      blurb: `Fast and cozy with ${secondary.toLowerCase()} and pantry staples.`,
      minutes: 20,
      servings: 2,
      calories: "430 kcal",
      difficulty: "Easy",
      cuisine: "Comfort",
      tags: ["Quick", "Weeknight"],
      imageHint: "pasta" as const,
      ingredients: [
        { name: anchor, qty: "2 cups" },
        { name: secondary, qty: "1 cup" },
        { name: "olive oil", qty: "1 tbsp" },
        { name: "garlic", qty: "2 cloves" },
        { name: "salt & pepper", qty: "to taste" },
      ],
      steps: [
        { text: "Prep and chop all ingredients." },
        { text: "Sauté aromatics and build flavor base.", timerSeconds: 120 },
        { text: "Add main ingredients and simmer until tender.", timerSeconds: 300 },
        { text: "Taste, finish, and serve warm." },
      ],
    },
    {
      title: `${secondary} Power Bowl`,
      blurb: `Balanced bowl with ${tertiary.toLowerCase()} and crisp textures.`,
      minutes: 15,
      servings: 2,
      calories: "360 kcal",
      difficulty: "Easy",
      cuisine: "Healthy",
      tags: ["Balanced", "High Fiber"],
      imageHint: "salad" as const,
      ingredients: [
        { name: secondary, qty: "1 cup" },
        { name: tertiary, qty: "1 cup" },
        { name: "greens", qty: "2 cups" },
        { name: "olive oil", qty: "1 tbsp" },
        { name: "lemon", qty: "1/2" },
      ],
      steps: [
        { text: "Cook grains or protein if needed." },
        { text: "Layer greens, prepared ingredients, and toppings." },
        { text: "Whisk dressing, toss, and serve." },
      ],
    },
    {
      title: `${anchor} Smoothie Blend`,
      blurb: `Simple blend using ${anchor.toLowerCase()} for a quick finish.`,
      minutes: 8,
      servings: 2,
      calories: "220 kcal",
      difficulty: "Easy",
      cuisine: "Breakfast",
      tags: ["Quick", "No Cook"],
      imageHint: "smoothie" as const,
      ingredients: [
        { name: anchor, qty: "1 cup" },
        { name: tertiary, qty: "1/2 cup" },
        { name: "milk or water", qty: "1 cup" },
        { name: "ice", qty: "1 cup" },
      ],
      steps: [
        { text: "Add ingredients to blender." },
        { text: "Blend until smooth.", timerSeconds: 60 },
        { text: "Taste and adjust sweetness if needed." },
      ],
    },
  ];

  return templates.map((template, index) =>
    normalizeRecipe(
      {
        ...template,
        id: `g:${scanId}:${slugify(template.title)}:${index + 1}`,
      },
      index,
      scanId,
      detected,
    ),
  );
}

export function parseAnalyzeRequest(payload: unknown): AnalyzeRequest {
  return analyzeRequestSchema.parse(payload);
}

export async function analyzeScan(payload: AnalyzeRequest): Promise<AnalyzeResponse> {
  const scanId = normalizeScanId(payload.scanId);
  const fallbackDetected = buildFallbackDetected(payload);

  const liveResult = await generateWithGemini(payload, scanId);
  if (liveResult) {
    return {
      ...liveResult,
      detectedItems: liveResult.detectedItems.length ? liveResult.detectedItems : fallbackDetected,
    };
  }

  return {
    scanId,
    mode: "fallback",
    detectedItems: fallbackDetected,
    recipes: buildFallbackRecipes(scanId, fallbackDetected),
  };
}
