import { readUserScoped, removeUserScoped, writeUserScoped } from "@/lib/user-storage";

export type CookingSession = {
  recipeId: string;
  step: number;
  totalSteps: number;
  updatedAt: number;
};

const STORAGE_KEY = "cookingSession:v1";
const LEGACY_STORAGE_KEYS = ["snapcook:cookingSession:v1"];
const MAX_RECIPE_ID_LENGTH = 160;
const MAX_STEPS = 400;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeRecipeId(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_RECIPE_ID_LENGTH);
}

function normalizeSession(input: unknown): CookingSession | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Partial<CookingSession>;

  const recipeId = normalizeRecipeId(data.recipeId);
  if (!recipeId) return null;

  const totalStepsRaw = Number(data.totalSteps);
  if (!Number.isFinite(totalStepsRaw)) return null;
  const totalSteps = clamp(Math.round(totalStepsRaw), 1, MAX_STEPS);

  const stepRaw = Number(data.step);
  if (!Number.isFinite(stepRaw)) return null;
  const step = clamp(Math.round(stepRaw), 0, totalSteps - 1);

  const updatedAtRaw = Number(data.updatedAt);
  const updatedAt = Number.isFinite(updatedAtRaw) && updatedAtRaw > 0 ? updatedAtRaw : Date.now();

  return { recipeId, step, totalSteps, updatedAt };
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getCookingSession(): CookingSession | null {
  if (!canUseStorage()) return null;
  try {
    const raw = readUserScoped(STORAGE_KEY, LEGACY_STORAGE_KEYS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeSession(parsed);
  } catch {
    return null;
  }
}

export function setCookingSession(input: { recipeId: string; step: number; totalSteps: number }) {
  if (!canUseStorage()) return;
  const normalized = normalizeSession({ ...input, updatedAt: Date.now() });
  if (!normalized) return;
  try {
    writeUserScoped(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // ignore write failures
  }
}

export function clearCookingSession(recipeId?: string) {
  if (!canUseStorage()) return;
  if (!recipeId) {
    removeUserScoped(STORAGE_KEY);
    return;
  }

  const active = getCookingSession();
  if (!active || active.recipeId !== recipeId) return;
  removeUserScoped(STORAGE_KEY);
}
