import * as React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

const SAVED_COOKBOOK_ID = "saved";
const now = () => Date.now();

const defaultCookbooks: Cookbook[] = [
  { id: SAVED_COOKBOOK_ID, name: "Saved", emoji: "★", createdAt: now() },
];

type CookbooksState = {
  cookbooks: Cookbook[];
  savedByCookbook: Record<string, SavedRecipe[]>;
};

type CookbooksActions = {
  createCookbook: (name: string, opts?: { emoji?: string; color?: string }) => Cookbook;
  renameCookbook: (id: string, name: string) => void;
  deleteCookbook: (id: string) => void;
  saveRecipeToCookbook: (recipeId: string, cookbookId: string, opts?: { status?: SavedRecipe["status"]; expiresAt?: number }) => { added: boolean };
  removeRecipeFromCookbook: (recipeId: string, cookbookId: string) => void;
  isRecipeSavedInCookbook: (recipeId: string, cookbookId: string) => boolean;
  getCookbookCount: (cookbookId: string) => number;
  getCookbookSaved: (cookbookId: string) => SavedRecipe[];
};

type CookbooksStore = CookbooksState & CookbooksActions;

const CookbooksContext = React.createContext<CookbooksStore | null>(null);

const STORAGE_KEY = "rork_cookbooks:v1";

function normalize(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

function isExpired(entry: SavedRecipe) {
  return typeof entry.expiresAt === "number" && entry.expiresAt <= now();
}

function normalizeSavedList(list: SavedRecipe[]) {
  return list.filter((x) => !isExpired(x));
}

type Persisted = {
  cookbooks: Cookbook[];
  savedByCookbook: Record<string, SavedRecipe[]>;
};

function safeParseJSON<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function CookbooksProvider({ children }: { children: React.ReactNode }) {
  const [cookbooks, setCookbooks] = React.useState<Cookbook[]>(defaultCookbooks);
  const [savedByCookbook, setSavedByCookbook] = React.useState<Record<string, SavedRecipe[]>>({ [SAVED_COOKBOOK_ID]: [] });
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = safeParseJSON<Persisted>(raw);
      if (parsed?.cookbooks?.length) setCookbooks(parsed.cookbooks);
      if (parsed?.savedByCookbook && typeof parsed.savedByCookbook === "object") {
        const cleaned: Record<string, SavedRecipe[]> = {};
        for (const [key, list] of Object.entries(parsed.savedByCookbook)) {
          if (Array.isArray(list)) cleaned[key] = list.filter((x) => x && typeof x.recipeId === "string" && typeof x.savedAt === "number");
        }
        if (!cleaned[SAVED_COOKBOOK_ID]) cleaned[SAVED_COOKBOOK_ID] = [];
        setSavedByCookbook(cleaned);
      }
      setHydrated(true);
    })();
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ cookbooks, savedByCookbook }));
  }, [cookbooks, savedByCookbook, hydrated]);

  const getCookbookSaved = React.useCallback(
    (cookbookId: string) => normalizeSavedList(savedByCookbook[cookbookId] ?? []),
    [savedByCookbook]
  );

  const createCookbook = React.useCallback((name: string, opts?: { emoji?: string; color?: string }) => {
    const n = normalize(name);
    const id = "cb_" + String(Date.now()) + Math.random().toString(16).slice(2);
    const cb: Cookbook = { id, name: n || "Untitled", emoji: opts?.emoji, color: opts?.color, createdAt: now() };
    setCookbooks((prev) => [cb, ...prev]);
    setSavedByCookbook((prev) => ({ ...prev, [id]: [] }));
    return cb;
  }, []);

  const renameCookbook = React.useCallback((id: string, name: string) => {
    const n = normalize(name);
    if (!n) return;
    setCookbooks((prev) => prev.map((c) => (c.id === id ? { ...c, name: n } : c)));
  }, []);

  const deleteCookbook = React.useCallback((id: string) => {
    if (id === SAVED_COOKBOOK_ID) return;
    setCookbooks((prev) => prev.filter((c) => c.id !== id));
    setSavedByCookbook((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const saveRecipeToCookbook = React.useCallback(
    (recipeId: string, cookbookId: string, opts?: { status?: SavedRecipe["status"]; expiresAt?: number }) => {
      const status = opts?.status ?? "to_cook";
      const list = normalizeSavedList(savedByCookbook[cookbookId] ?? []);
      const exists = list.some((x) => x.recipeId === recipeId);
      if (exists) {
        setSavedByCookbook((prev) => ({
          ...prev,
          [cookbookId]: list.map((x) => (x.recipeId === recipeId ? { ...x, savedAt: now(), status } : x)),
        }));
        return { added: false };
      }
      setSavedByCookbook((prev) => ({
        ...prev,
        [cookbookId]: [{ recipeId, savedAt: now(), status, expiresAt: opts?.expiresAt }, ...list],
      }));
      return { added: true };
    },
    [savedByCookbook]
  );

  const removeRecipeFromCookbook = React.useCallback((recipeId: string, cookbookId: string) => {
    setSavedByCookbook((prev) => ({
      ...prev,
      [cookbookId]: (prev[cookbookId] ?? []).filter((x) => x.recipeId !== recipeId),
    }));
  }, []);

  const isRecipeSavedInCookbook = React.useCallback(
    (recipeId: string, cookbookId: string) => getCookbookSaved(cookbookId).some((x) => x.recipeId === recipeId),
    [getCookbookSaved]
  );

  const getCookbookCount = React.useCallback(
    (cookbookId: string) => getCookbookSaved(cookbookId).length,
    [getCookbookSaved]
  );

  const value = React.useMemo<CookbooksStore>(
    () => ({
      cookbooks,
      savedByCookbook,
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
      createCookbook,
      renameCookbook,
      deleteCookbook,
      saveRecipeToCookbook,
      removeRecipeFromCookbook,
      isRecipeSavedInCookbook,
      getCookbookCount,
      getCookbookSaved,
    ]
  );

  return <CookbooksContext.Provider value={value}>{children}</CookbooksContext.Provider>;
}

export function useCookbooks() {
  const ctx = React.useContext(CookbooksContext);
  if (!ctx) throw new Error("useCookbooks must be used within CookbooksProvider");
  return ctx;
}
