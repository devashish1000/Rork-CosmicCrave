import * as React from "react";
import { readUserScoped, writeUserScoped } from "@/lib/user-storage";

export type Cookbook = {
  id: string;
  name: string;
  emoji?: string;
  color?: string;
  createdAt: number;
};

export type SavedRecipe = {
  recipeId: string;
  savedAt: number;
  expiresAt?: number;
  status?: "to_cook" | "save_24h" | "skip";
};

type CookbooksState = {
  cookbooks: Cookbook[];
  savedByCookbook: Record<string, SavedRecipe[]>;
  lastSaved?: {
    recipeId: string;
    cookbookId: string;
    at: number;
  } | null;
};

type CookbooksActions = {
  createCookbook: (name: string, opts?: { emoji?: string; color?: string }) => Cookbook;
  renameCookbook: (id: string, name: string) => void;
  deleteCookbook: (id: string) => void;
  saveRecipeToCookbook: (
    recipeId: string,
    cookbookId: string,
    opts?: { status?: "to_cook" | "save_24h" | "skip"; expiresAt?: number },
  ) => { added: boolean };
  removeRecipeFromCookbook: (recipeId: string, cookbookId: string) => void;
  isRecipeSavedInCookbook: (recipeId: string, cookbookId: string) => boolean;
  getCookbookCount: (cookbookId: string) => number;
  getCookbookSaved: (cookbookId: string) => SavedRecipe[];
};

type CookbooksStore = CookbooksState & CookbooksActions;

const CookbooksContext = React.createContext<CookbooksStore | null>(null);

const normalize = (s: string) => s.trim().replace(/\s+/g, " ");

const now = () => Date.now();
const SAVED_COOKBOOK_ID = "saved";

const defaultCookbooks: Cookbook[] = [
  { id: SAVED_COOKBOOK_ID, name: "Saved", emoji: "★", createdAt: now() },
];

const defaultSaved: Record<string, SavedRecipe[]> = {
  [SAVED_COOKBOOK_ID]: [],
};

const STORAGE_KEY = "cookbooks:v1";
const LEGACY_STORAGE_KEYS = ["snapcook:cookbooks:v1"];

function safeParseJSON<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

type Persisted = {
  cookbooks: Cookbook[];
  savedByCookbook: Record<string, SavedRecipe[]>;
};

function ensureSavedCookbook(input: Persisted): Persisted {
  const hasSavedBook = input.cookbooks.some((book) => book.id === SAVED_COOKBOOK_ID);
  const savedByCookbook = { ...input.savedByCookbook };
  if (!savedByCookbook[SAVED_COOKBOOK_ID]) {
    savedByCookbook[SAVED_COOKBOOK_ID] = [];
  }

  if (hasSavedBook) {
    return { cookbooks: input.cookbooks, savedByCookbook };
  }

  return {
    cookbooks: [{ id: SAVED_COOKBOOK_ID, name: "Saved", emoji: "★", createdAt: now() }, ...input.cookbooks],
    savedByCookbook,
  };
}

// One-time guard for legacy demo-seeded local snapshots.
function isLegacyDemoSeed(input: Persisted) {
  const byId = new Map(input.cookbooks.map((book) => [book.id, book]));
  const ids = Array.from(byId.keys()).sort();
  const hasOnlyDemoBooks = ids.length === 3 && ids[0] === "mealprep" && ids[1] === "saved" && ids[2] === "weeknight";
  if (!hasOnlyDemoBooks) return false;

  if (byId.get("saved")?.name !== "Saved") return false;
  if (byId.get("weeknight")?.name !== "Weeknight Wins") return false;
  if (byId.get("mealprep")?.name !== "Meal Prep") return false;

  const saved = (input.savedByCookbook.saved ?? []).map((entry) => entry.recipeId).sort();
  const weeknight = (input.savedByCookbook.weeknight ?? []).map((entry) => entry.recipeId).sort();
  const mealprep = (input.savedByCookbook.mealprep ?? []).map((entry) => entry.recipeId).sort();

  const isExpectedDemoRecipes =
    saved.length === 1 &&
    saved[0] === "r1" &&
    weeknight.length === 1 &&
    weeknight[0] === "r3" &&
    mealprep.length === 1 &&
    mealprep[0] === "r2";

  if (!isExpectedDemoRecipes) return false;

  const nonDemoKeyHasEntries = Object.entries(input.savedByCookbook).some(
    ([key, list]) => key !== "saved" && key !== "weeknight" && key !== "mealprep" && Array.isArray(list) && list.length > 0,
  );

  return !nonDemoKeyHasEntries;
}

function removeLegacyDemoSeed(input: Persisted): Persisted {
  if (!isLegacyDemoSeed(input)) return input;
  const savedBook = input.cookbooks.find((book) => book.id === SAVED_COOKBOOK_ID);
  return {
    cookbooks: [
      savedBook ?? { id: SAVED_COOKBOOK_ID, name: "Saved", emoji: "★", createdAt: now() },
    ],
    savedByCookbook: { [SAVED_COOKBOOK_ID]: [] },
  };
}

function sanitizePersisted(input: Persisted | null): Persisted | null {
  if (!input) return null;
  if (!Array.isArray(input.cookbooks) || typeof input.savedByCookbook !== "object" || !input.savedByCookbook) return null;

  const cookbooks = input.cookbooks
    .filter((c) => c && typeof c.id === "string" && typeof c.name === "string" && typeof c.createdAt === "number")
    .map((c) => ({
      id: c.id,
      name: c.name,
      emoji: typeof c.emoji === "string" ? c.emoji : undefined,
      color: typeof c.color === "string" ? c.color : undefined,
      createdAt: c.createdAt,
    }));

  const savedByCookbook: Record<string, SavedRecipe[]> = {};
  for (const [key, list] of Object.entries(input.savedByCookbook)) {
    if (!Array.isArray(list)) continue;
    savedByCookbook[key] = list
      .filter((x) => x && typeof x.recipeId === "string" && typeof x.savedAt === "number")
      .map((x) => ({
        recipeId: x.recipeId,
        savedAt: x.savedAt,
        expiresAt: typeof x.expiresAt === "number" ? x.expiresAt : undefined,
        status: x.status === "save_24h" || x.status === "to_cook" || x.status === "skip" ? x.status : undefined,
      }));
  }

  const sanitized: Persisted = { cookbooks, savedByCookbook };
  return ensureSavedCookbook(removeLegacyDemoSeed(sanitized));
}

function isExpired(entry: SavedRecipe) {
  return typeof entry.expiresAt === "number" && entry.expiresAt <= now();
}

function normalizeSavedList(list: SavedRecipe[]) {
  return list.filter((x) => !isExpired(x));
}

export function CookbooksProvider({ children }: { children: React.ReactNode }) {
  const initial = React.useMemo(() => {
    if (typeof window === "undefined") return null;
    const stored = readUserScoped(STORAGE_KEY, LEGACY_STORAGE_KEYS);
    return sanitizePersisted(safeParseJSON<Persisted>(stored));
  }, []);

  const [cookbooks, setCookbooks] = React.useState<Cookbook[]>(initial?.cookbooks ?? defaultCookbooks);
  const [savedByCookbook, setSavedByCookbook] = React.useState<Record<string, SavedRecipe[]>>(initial?.savedByCookbook ?? defaultSaved);
  const [lastSaved, setLastSaved] = React.useState<CookbooksState["lastSaved"]>(null);

  const createCookbook = React.useCallback((name: string, opts?: { emoji?: string; color?: string }) => {
    const n = normalize(name);
    const id = "cb_" + String(Date.now()) + Math.random().toString(16).slice(2);
    const cb: Cookbook = { id, name: n || "Untitled", emoji: opts?.emoji, color: opts?.color, createdAt: now() };
    setCookbooks((prev) => [cb, ...prev]);
    setSavedByCookbook((prev) => ({ ...prev, [id]: prev[id] ?? [] }));
    return cb;
  }, []);

  const renameCookbook = React.useCallback((id: string, name: string) => {
    const n = normalize(name);
    if (!n) return;
    setCookbooks((prev) => prev.map((c) => (c.id === id ? { ...c, name: n } : c)));
  }, []);

  const deleteCookbook = React.useCallback((id: string) => {
    if (id === "saved") return;
    setCookbooks((prev) => prev.filter((c) => c.id !== id));
    setSavedByCookbook((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const getCookbookSaved = React.useCallback(
    (cookbookId: string) => {
      const list = savedByCookbook[cookbookId] ?? [];
      return normalizeSavedList(list);
    },
    [savedByCookbook],
  );

  const isRecipeSavedInCookbook = React.useCallback(
    (recipeId: string, cookbookId: string) => {
      const list = getCookbookSaved(cookbookId);
      return list.some((x) => x.recipeId === recipeId);
    },
    [getCookbookSaved],
  );

  const saveRecipeToCookbook = React.useCallback(
    (recipeId: string, cookbookId: string, opts?: { status?: "to_cook" | "save_24h" | "skip"; expiresAt?: number }) => {
      const status = opts?.status ?? "to_cook";
      const expiresAt = opts?.expiresAt;
      const list = normalizeSavedList(savedByCookbook[cookbookId] ?? []);
      const exists = list.some((x) => x.recipeId === recipeId);
      if (exists) {
        setSavedByCookbook((prev) => ({
          ...prev,
          [cookbookId]: list.map((x) =>
            x.recipeId === recipeId ? { ...x, savedAt: now(), status, expiresAt } : x,
          ),
        }));
        setLastSaved({ recipeId, cookbookId, at: now() });
        return { added: false };
      }
      setSavedByCookbook((prev) => ({
        ...prev,
        [cookbookId]: [{ recipeId, savedAt: now(), status, expiresAt }, ...list],
      }));
      setLastSaved({ recipeId, cookbookId, at: now() });
      return { added: true };
    },
    [savedByCookbook],
  );

  const removeRecipeFromCookbook = React.useCallback((recipeId: string, cookbookId: string) => {
    setSavedByCookbook((prev) => ({
      ...prev,
      [cookbookId]: (prev[cookbookId] ?? []).filter((x) => x.recipeId !== recipeId),
    }));
  }, []);

  const getCookbookCount = React.useCallback(
    (cookbookId: string) => getCookbookSaved(cookbookId).length,
    [getCookbookSaved],
  );

  React.useEffect(() => {
    const cleaned: Record<string, SavedRecipe[]> = {};
    let changed = false;
    for (const [key, list] of Object.entries(savedByCookbook)) {
      const next = normalizeSavedList(list);
      cleaned[key] = next;
      if (next.length !== list.length) changed = true;
    }
    if (changed) setSavedByCookbook(cleaned);
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: Persisted = { cookbooks, savedByCookbook };
    writeUserScoped(STORAGE_KEY, JSON.stringify(payload));
  }, [cookbooks, savedByCookbook]);

  const value = React.useMemo<CookbooksStore>(
    () => ({
      cookbooks,
      savedByCookbook,
      lastSaved,
      createCookbook,
      renameCookbook,
      deleteCookbook,
      saveRecipeToCookbook,
      removeRecipeFromCookbook,
      isRecipeSavedInCookbook,
      getCookbookCount,
      getCookbookSaved,
    }),
    [
      cookbooks,
      savedByCookbook,
      lastSaved,
      createCookbook,
      renameCookbook,
      deleteCookbook,
      saveRecipeToCookbook,
      removeRecipeFromCookbook,
      isRecipeSavedInCookbook,
      getCookbookCount,
      getCookbookSaved,
    ],
  );

  return <CookbooksContext.Provider value={value}>{children}</CookbooksContext.Provider>;
}

export function useCookbooks() {
  const ctx = React.useContext(CookbooksContext);
  if (!ctx) throw new Error("useCookbooks must be used within CookbooksProvider");
  return ctx;
}
