import * as React from "react";
import { readUserScoped, writeUserScoped } from "@/lib/user-storage";

export type ShoppingItem = {
  id: string;
  name: string;
  checked: boolean; // purchased / in cart
  have?: boolean; // already have / pantry
  source?: "recipe" | "manual";
  recipeId?: string;
};

type ShoppingState = {
  items: ShoppingItem[];
};

type ShoppingActions = {
  addMany: (names: string[], meta?: { source?: ShoppingItem["source"]; recipeId?: string }) => {
    added: string[];
    already: string[];
  };
  toggle: (id: string) => void;
  toggleHave: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  clearChecked: () => void;
  clearByRecipe: (recipeId: string) => void;
  addOne: (name: string, meta?: { source?: ShoppingItem["source"]; recipeId?: string }) => {
    added: boolean;
  };
};
type ShoppingStore = ShoppingState & ShoppingActions;

const ShoppingContext = React.createContext<ShoppingStore | null>(null);

const normalize = (s: string) => s.trim().toLowerCase();
const STORAGE_KEY = "shopping:v1";
const LEGACY_STORAGE_KEYS = ["snapcook:shopping:v1"];
const MAX_ITEM_NAME_LENGTH = 140;

type PersistedShoppingState = {
  items: ShoppingItem[];
};

function safeParseJSON<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeItemName(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_ITEM_NAME_LENGTH);
}

function normalizeItemSource(value: unknown): ShoppingItem["source"] | undefined {
  if (value === "recipe" || value === "manual") return value;
  return undefined;
}

function normalizePersistedItems(input: unknown): ShoppingItem[] {
  if (!Array.isArray(input)) return [];
  const uniqueByName = new Set<string>();
  const out: ShoppingItem[] = [];

  input.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") return;
    const item = raw as Partial<ShoppingItem>;
    const name = normalizeItemName(item.name);
    if (!name) return;
    const normalizedName = normalize(name);
    if (uniqueByName.has(normalizedName)) return;
    uniqueByName.add(normalizedName);

    const persistedId = typeof item.id === "string" ? item.id.trim() : "";
    const id = persistedId || `${Date.now()}_${index}_${Math.random().toString(16).slice(2)}`;
    const source = normalizeItemSource(item.source);
    const recipeId =
      source === "recipe" && typeof item.recipeId === "string" ? item.recipeId.trim().slice(0, 180) : undefined;

    out.push({
      id,
      name,
      checked: !!item.checked,
      have: !!item.have,
      source,
      recipeId,
    });
  });

  return out;
}

function readInitialItems() {
  if (typeof window === "undefined") return [] as ShoppingItem[];
  const raw = readUserScoped(STORAGE_KEY, LEGACY_STORAGE_KEYS);
  const parsed = safeParseJSON<PersistedShoppingState>(raw);
  return normalizePersistedItems(parsed?.items);
}

export function ShoppingProvider({ children }: { children: React.ReactNode }) {
  const initialItems = React.useMemo(() => readInitialItems(), []);
  const [items, setItems] = React.useState<ShoppingItem[]>(initialItems);

  const addMany = React.useCallback(
    (names: string[], meta?: { source?: ShoppingItem["source"]; recipeId?: string }) => {
      const cleaned = names.map((n) => n.trim()).filter(Boolean);
      const existing = new Set(items.map((i) => normalize(i.name)));

      const added: string[] = [];
      const already: string[] = [];

      const next: ShoppingItem[] = [...items];

      cleaned.forEach((n) => {
        const key = normalize(n);
        if (!key) return;
        if (existing.has(key)) {
          already.push(n);
          return;
        }
        existing.add(key);
        added.push(n);
        next.unshift({
          id: String(Date.now()) + Math.random().toString(16).slice(2),
          name: n,
          checked: false,
          have: false,
          source: meta?.source,
          recipeId: meta?.recipeId,
        });
      });

      setItems(next);
      return { added, already };
    },
    [items],
  );

  const addOne = React.useCallback(
    (name: string, meta?: { source?: ShoppingItem["source"]; recipeId?: string }) => {
      const n = name.trim();
      if (!n) return { added: false };
      const existing = new Set(items.map((i) => normalize(i.name)));
      if (existing.has(normalize(n))) return { added: false };
      setItems((prev) => [
        {
          id: String(Date.now()) + Math.random().toString(16).slice(2),
          name: n,
          checked: false,
          have: false,
          source: meta?.source,
          recipeId: meta?.recipeId,
        },
        ...prev,
      ]);
      return { added: true };
    },
    [items],
  );

  const toggle = React.useCallback((id: string) => {
    setItems((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              checked: !p.checked,
              have: p.checked ? p.have : false,
            }
          : p,
      ),
    );
  }, []);

  const toggleHave = React.useCallback((id: string) => {
    setItems((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              have: !(p.have ?? false),
              checked: p.have ? p.checked : false,
            }
          : p,
      ),
    );
  }, []);

  const remove = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clear = React.useCallback(() => {
    setItems([]);
  }, []);

  const clearChecked = React.useCallback(() => {
    setItems((prev) => prev.filter((p) => !p.checked));
  }, []);

  const clearByRecipe = React.useCallback((recipeId: string) => {
    setItems((prev) => prev.filter((p) => p.recipeId !== recipeId));
  }, []);

  React.useEffect(() => {
    writeUserScoped(
      STORAGE_KEY,
      JSON.stringify({
        items,
      } satisfies PersistedShoppingState),
    );
  }, [items]);

  const value = React.useMemo<ShoppingStore>(
    () => ({ items, addMany, addOne, toggle, toggleHave, remove, clear, clearChecked, clearByRecipe }),
    [items, addMany, addOne, toggle, toggleHave, remove, clear, clearChecked, clearByRecipe],
  );

  return <ShoppingContext.Provider value={value}>{children}</ShoppingContext.Provider>;
}

export function useShopping() {
  const ctx = React.useContext(ShoppingContext);
  if (!ctx) throw new Error("useShopping must be used within ShoppingProvider");
  return ctx;
}
