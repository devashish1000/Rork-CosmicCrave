import * as React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ShoppingItem = {
  id: string;
  name: string;
  checked: boolean;
  have?: boolean;
  source?: "recipe" | "manual";
  recipeId?: string;
};

type ShoppingState = { items: ShoppingItem[] };

type ShoppingActions = {
  addMany: (names: string[], meta?: { source?: ShoppingItem["source"]; recipeId?: string }) => { added: string[]; already: string[] };
  addOne: (name: string, meta?: { source?: ShoppingItem["source"]; recipeId?: string }) => { added: boolean };
  toggle: (id: string) => void;
  toggleHave: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  clearChecked: () => void;
  clearByRecipe: (recipeId: string) => void;
};

type ShoppingStore = ShoppingState & ShoppingActions;

const ShoppingContext = React.createContext<ShoppingStore | null>(null);

const STORAGE_KEY = "rork_shopping:v1";
const MAX_ITEM_NAME_LENGTH = 140;

const normalize = (s: string) => s.trim().toLowerCase();

function normalizeItemName(value: string) {
  return value.trim().slice(0, MAX_ITEM_NAME_LENGTH);
}

function safeParseJSON<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

type Persisted = { items: ShoppingItem[] };

function normalizePersistedItems(input: unknown): ShoppingItem[] {
  if (!Array.isArray(input)) return [];
  const uniqueByName = new Set<string>();
  const out: ShoppingItem[] = [];
  input.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") return;
    const item = raw as Partial<ShoppingItem>;
    const name = normalizeItemName(typeof item.name === "string" ? item.name : "");
    if (!name) return;
    const key = normalize(name);
    if (uniqueByName.has(key)) return;
    uniqueByName.add(key);
    const id = typeof item.id === "string" ? item.id.trim() || undefined : undefined;
    out.push({
      id: id || `${Date.now()}_${index}_${Math.random().toString(16).slice(2)}`,
      name,
      checked: !!item.checked,
      have: !!item.have,
      source: item.source === "recipe" || item.source === "manual" ? item.source : undefined,
      recipeId: item.source === "recipe" && typeof item.recipeId === "string" ? item.recipeId.trim().slice(0, 180) : undefined,
    });
  });
  return out;
}

export function ShoppingProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ShoppingItem[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = safeParseJSON<Persisted>(raw);
      setItems(normalizePersistedItems(parsed?.items));
      setHydrated(true);
    })();
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ items }));
  }, [items, hydrated]);

  const addMany = React.useCallback((names: string[], meta?: { source?: ShoppingItem["source"]; recipeId?: string }) => {
    const cleaned = names.map((n) => n.trim()).filter(Boolean);
    const existing = new Set(items.map((i) => normalize(i.name)));
    const added: string[] = [];
    const already: string[] = [];
    const next: ShoppingItem[] = [...items];
    cleaned.forEach((n) => {
      const key = normalize(n);
      if (!key || existing.has(key)) {
        if (key) already.push(n);
        return;
      }
      existing.add(key);
      added.push(n);
      next.unshift({
        id: `${Date.now()}${Math.random().toString(16).slice(2)}`,
        name: n,
        checked: false,
        have: false,
        source: meta?.source,
        recipeId: meta?.recipeId,
      });
    });
    setItems(next);
    return { added, already };
  }, [items]);

  const addOne = React.useCallback((name: string, meta?: { source?: ShoppingItem["source"]; recipeId?: string }) => {
    const n = name.trim();
    if (!n) return { added: false };
    const key = normalize(n);
    if (items.some((i) => normalize(i.name) === key)) return { added: false };
    setItems((prev) => [
      {
        id: `${Date.now()}${Math.random().toString(16).slice(2)}`,
        name: n,
        checked: false,
        have: false,
        source: meta?.source,
        recipeId: meta?.recipeId,
      },
      ...prev,
    ]);
    return { added: true };
  }, [items]);

  const toggle = React.useCallback((id: string) => {
    setItems((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, checked: !p.checked, have: p.checked ? p.have : false } : p
      )
    );
  }, []);

  const toggleHave = React.useCallback((id: string) => {
    setItems((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, have: !(p.have ?? false), checked: p.have ? p.checked : false } : p
      )
    );
  }, []);

  const remove = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clear = React.useCallback(() => setItems([]), []);
  const clearChecked = React.useCallback(() => setItems((prev) => prev.filter((p) => !p.checked)), []);
  const clearByRecipe = React.useCallback((recipeId: string) => {
    setItems((prev) => prev.filter((p) => p.recipeId !== recipeId));
  }, []);

  const value = React.useMemo<ShoppingStore>(
    () => ({ items, addMany, addOne, toggle, toggleHave, remove, clear, clearChecked, clearByRecipe }),
    [items, addMany, addOne, toggle, toggleHave, remove, clear, clearChecked, clearByRecipe]
  );

  return <ShoppingContext.Provider value={value}>{children}</ShoppingContext.Provider>;
}

export function useShopping() {
  const ctx = React.useContext(ShoppingContext);
  if (!ctx) throw new Error("useShopping must be used within ShoppingProvider");
  return ctx;
}
