import type { ScanSource } from "@shared/ai-constraints";
import { readUserScoped, writeUserScoped } from "@/lib/user-storage";

const SCAN_USAGE_KEY = "scan:usage:v1";
const SCAN_USAGE_LEGACY_KEYS = ["snapcook:scan:usage:v1"];
const SCAN_USAGE_EVENT = "cosmiccrave:scan-usage-updated";
const MAX_USAGE_ENTRIES = 600;
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 400; // keep a little over a year

type ScanUsageEntry = {
  id: string;
  at: number;
  source: ScanSource;
};

type ScanUsageState = {
  entries: ScanUsageEntry[];
};

function safeParse(raw: string | null): ScanUsageState | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ScanUsageState;
  } catch {
    return null;
  }
}

function isValidSource(value: unknown): value is ScanSource {
  return value === "camera" || value === "gallery";
}

function normalizeEntries(entries: unknown): ScanUsageEntry[] {
  if (!Array.isArray(entries)) return [];
  const now = Date.now();
  const minTimestamp = now - MAX_AGE_MS;
  const uniqueById = new Map<string, ScanUsageEntry>();

  entries.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const typed = item as Partial<ScanUsageEntry>;
    if (typeof typed.id !== "string" || !typed.id.trim()) return;
    if (typeof typed.at !== "number" || !Number.isFinite(typed.at)) return;
    if (!isValidSource(typed.source)) return;
    if (typed.at < minTimestamp || typed.at > now + 1000 * 60 * 5) return;
    uniqueById.set(typed.id, {
      id: typed.id,
      at: typed.at,
      source: typed.source,
    });
  });

  return Array.from(uniqueById.values())
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_USAGE_ENTRIES);
}

function readState(): ScanUsageState {
  if (typeof window === "undefined") return { entries: [] };
  const raw = readUserScoped(SCAN_USAGE_KEY, SCAN_USAGE_LEGACY_KEYS);
  const parsed = safeParse(raw);
  const entries = normalizeEntries(parsed?.entries);
  return { entries };
}

function writeState(next: ScanUsageState) {
  if (typeof window === "undefined") return;
  writeUserScoped(SCAN_USAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(SCAN_USAGE_EVENT));
}

export function recordScanUsage(entry: { id: string; source: ScanSource; at?: number }) {
  const id = entry.id.trim();
  if (!id) return;
  if (!isValidSource(entry.source)) return;

  const state = readState();
  if (state.entries.some((item) => item.id === id)) return;

  const nextEntries = normalizeEntries([
    { id, source: entry.source, at: entry.at ?? Date.now() },
    ...state.entries,
  ]);
  writeState({ entries: nextEntries });
}

export function removeScanUsage(id: string) {
  const normalizedId = id.trim();
  if (!normalizedId) return;

  const state = readState();
  if (!state.entries.some((item) => item.id === normalizedId)) return;

  writeState({
    entries: state.entries.filter((item) => item.id !== normalizedId),
  });
}

export function getScanUsageForMonth(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return readState().entries.filter((entry) => {
    const d = new Date(entry.at);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export function getScanUsageCountForMonth(date = new Date()) {
  return getScanUsageForMonth(date).length;
}

export function subscribeToScanUsage(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onCustom = () => listener();
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key.endsWith(`:${SCAN_USAGE_KEY}`)) {
      listener();
    }
  };

  window.addEventListener(SCAN_USAGE_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(SCAN_USAGE_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
