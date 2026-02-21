import * as React from "react";
import { readUserScoped, writeUserScoped } from "@/lib/user-storage";

export type PlanSlot = "breakfast" | "lunch" | "dinner";

export type PlanEntry = {
  dateKey: string; // YYYY-MM-DD
  slot: PlanSlot;
  recipeId: string;
  createdAt: number;
  source?: "saved" | "cookbook" | "scan" | "manual";
};

type PlanState = {
  selectedDateKey: string;
  entries: PlanEntry[];
  lastAdded?: { dateKey: string; slot: PlanSlot; recipeId: string; at: number } | null;
};

type PlanActions = {
  setSelectedDateKey: (dateKey: string) => void;
  setEntry: (entry: Omit<PlanEntry, "createdAt">) => void;
  removeEntry: (dateKey: string, slot: PlanSlot) => void;
  getEntry: (dateKey: string, slot: PlanSlot) => PlanEntry | null;
  getDayEntries: (dateKey: string) => Partial<Record<PlanSlot, PlanEntry>>;
};

type PlanStore = PlanState & PlanActions;

const PlanContext = React.createContext<PlanStore | null>(null);
const STORAGE_KEY = "plan:v1";
const LEGACY_STORAGE_KEYS = ["snapcook:plan:v1"];
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_SLOTS: PlanSlot[] = ["breakfast", "lunch", "dinner"];
const VALID_SOURCES = ["saved", "cookbook", "scan", "manual"] as const;
const MAX_RECIPE_ID_LENGTH = 180;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function dayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

export function dateNumber(date: Date) {
  return date.getDate();
}

const todayKey = toDateKey(new Date());

const initialEntries: PlanEntry[] = [];

type PersistedState = {
  selectedDateKey: string;
  entries: PlanEntry[];
};

function normalizeDateKey(dateKey: unknown, fallback = todayKey) {
  if (typeof dateKey !== "string") return fallback;
  const trimmed = dateKey.trim();
  return DATE_KEY_RE.test(trimmed) ? trimmed : fallback;
}

function normalizeSlot(slot: unknown): PlanSlot | null {
  if (typeof slot !== "string") return null;
  return (VALID_SLOTS as string[]).includes(slot) ? (slot as PlanSlot) : null;
}

function normalizeRecipeId(recipeId: unknown) {
  if (typeof recipeId !== "string") return "";
  return recipeId.trim().slice(0, MAX_RECIPE_ID_LENGTH);
}

function normalizeCreatedAt(createdAt: unknown) {
  const value = Number(createdAt);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : Date.now();
}

function normalizeSource(source: unknown): PlanEntry["source"] | undefined {
  if (typeof source !== "string") return undefined;
  return (VALID_SOURCES as readonly string[]).includes(source)
    ? (source as PlanEntry["source"])
    : undefined;
}

function normalizeEntries(entries: unknown): PlanEntry[] {
  if (!Array.isArray(entries)) return initialEntries;
  const latestBySlot = new Map<string, PlanEntry>();

  entries.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const raw = entry as Partial<PlanEntry>;
    const dateKey = normalizeDateKey(raw.dateKey);
    const slot = normalizeSlot(raw.slot);
    const recipeId = normalizeRecipeId(raw.recipeId);
    if (!slot || !recipeId) return;
    const createdAt = normalizeCreatedAt(raw.createdAt);
    const source = normalizeSource(raw.source);

    const key = `${dateKey}:${slot}`;
    const current = latestBySlot.get(key);
    if (current && current.createdAt >= createdAt) return;

    latestBySlot.set(key, {
      dateKey,
      slot,
      recipeId,
      createdAt,
      source,
    });
  });

  return Array.from(latestBySlot.values()).sort((a, b) => b.createdAt - a.createdAt);
}

function readInitialState(): PersistedState {
  if (typeof window === "undefined") return { selectedDateKey: todayKey, entries: initialEntries };
  try {
    const raw = readUserScoped(STORAGE_KEY, LEGACY_STORAGE_KEYS);
    if (!raw) return { selectedDateKey: todayKey, entries: initialEntries };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      selectedDateKey: normalizeDateKey(parsed?.selectedDateKey, todayKey),
      entries: normalizeEntries(parsed?.entries),
    };
  } catch {
    return { selectedDateKey: todayKey, entries: initialEntries };
  }
}

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const initialState = React.useMemo(() => readInitialState(), []);
  const [selectedDateKey, setSelectedDateKeyState] = React.useState(initialState.selectedDateKey);
  const [entries, setEntries] = React.useState<PlanEntry[]>(initialState.entries);
  const [lastAdded, setLastAdded] = React.useState<PlanState["lastAdded"]>(null);

  const setSelectedDateKey = React.useCallback((dateKey: string) => {
    setSelectedDateKeyState(normalizeDateKey(dateKey, todayKey));
  }, []);

  const setEntry = React.useCallback((entry: Omit<PlanEntry, "createdAt">) => {
    const dateKey = normalizeDateKey(entry.dateKey, todayKey);
    const slot = normalizeSlot(entry.slot);
    const recipeId = normalizeRecipeId(entry.recipeId);
    if (!slot || !recipeId) return;
    const source = normalizeSource(entry.source);
    const createdAt = Date.now();

    setEntries((prev) => {
      const next = prev.filter((p) => !(p.dateKey === dateKey && p.slot === slot));
      next.unshift({ dateKey, slot, recipeId, source, createdAt });
      return next;
    });
    setLastAdded({ dateKey, slot, recipeId, at: createdAt });
  }, []);

  const removeEntry = React.useCallback((dateKey: string, slot: PlanSlot) => {
    const normalizedDateKey = normalizeDateKey(dateKey, todayKey);
    setEntries((prev) => prev.filter((p) => !(p.dateKey === normalizedDateKey && p.slot === slot)));
  }, []);

  const getEntry = React.useCallback(
    (dateKey: string, slot: PlanSlot) => {
      return entries.find((e) => e.dateKey === dateKey && e.slot === slot) ?? null;
    },
    [entries],
  );

  const getDayEntries = React.useCallback(
    (dateKey: string) => {
      const out: Partial<Record<PlanSlot, PlanEntry>> = {};
      entries.forEach((e) => {
        if (e.dateKey !== dateKey) return;
        out[e.slot] = e;
      });
      return out;
    },
    [entries],
  );

  React.useEffect(() => {
    writeUserScoped(
      STORAGE_KEY,
      JSON.stringify({
        selectedDateKey,
        entries,
      } satisfies PersistedState),
    );
  }, [selectedDateKey, entries]);

  const value = React.useMemo<PlanStore>(
    () => ({
      selectedDateKey,
      entries,
      lastAdded,
      setSelectedDateKey,
      setEntry,
      removeEntry,
      getEntry,
      getDayEntries,
    }),
    [selectedDateKey, entries, lastAdded, setEntry, removeEntry, getEntry, getDayEntries],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const ctx = React.useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used within PlanProvider");
  return ctx;
}
