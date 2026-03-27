const ACTIVE_USER_KEY = "cosmiccrave:activeUserId";
const USER_PREFIX = "cosmiccrave:user:";
const LEGACY_CLEANUP_KEY = "cosmiccrave:legacyCleanup:v1";
const ACCOUNT_REGISTRY_KEY = "cosmiccrave:accounts";

const normalizeUserId = (id: string) => id.trim().toLowerCase().replace(/\s+/g, "_");

const normalizeKey = (key: string) => key.replace(/^(?:snapcook|cosmiccrave)[:.]/, "");

export function getActiveUserId() {
  if (typeof window === "undefined") return "guest";
  try {
    const raw = window.localStorage.getItem(ACTIVE_USER_KEY);
    if (!raw) return "guest";
    const normalized = normalizeUserId(raw);
    return normalized || "guest";
  } catch {
    return "guest";
  }
}

export function setActiveUserId(id: string) {
  if (typeof window === "undefined") return;
  try {
    const normalized = normalizeUserId(id) || "guest";
    window.localStorage.setItem(ACTIVE_USER_KEY, normalized);
  } catch {
    // ignore storage errors
  }
}

export function clearActiveUserId() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ACTIVE_USER_KEY);
  } catch {
    // ignore
  }
}

const readAccountRegistry = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACCOUNT_REGISTRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x === "string");
  } catch {
    return [];
  }
};

const writeAccountRegistry = (ids: string[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACCOUNT_REGISTRY_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
};

export function registerAccount(id: string) {
  const normalized = normalizeUserId(id);
  if (!normalized || normalized === "guest") return;
  const current = readAccountRegistry();
  if (current.includes(normalized)) return;
  writeAccountRegistry([normalized, ...current]);
}

export function unregisterAccount(id: string) {
  const normalized = normalizeUserId(id);
  if (!normalized) return;
  const next = readAccountRegistry().filter((x) => x !== normalized);
  writeAccountRegistry(next);
}

export function isRegisteredAccount(id: string) {
  const normalized = normalizeUserId(id);
  if (!normalized) return false;
  return readAccountRegistry().includes(normalized);
}

export function getUserScopedKey(key: string, userId?: string) {
  if (key.startsWith(USER_PREFIX)) return key;
  const uid = userId ?? getActiveUserId();
  const normalizedKey = normalizeKey(key);
  return `${USER_PREFIX}${uid}:${normalizedKey}`;
}

export function readUserScoped(key: string, legacyKeys: readonly string[] = []) {
  if (typeof window === "undefined") return null;
  const scopedKey = getUserScopedKey(key);
  try {
    const current = window.localStorage.getItem(scopedKey);
    if (current != null) return current;

    for (const legacy of legacyKeys) {
      const legacyValue = window.localStorage.getItem(legacy);
      if (legacyValue != null) {
        window.localStorage.setItem(scopedKey, legacyValue);
        window.localStorage.removeItem(legacy);
        return legacyValue;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function writeUserScoped(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getUserScopedKey(key), value);
  } catch {
    // ignore
  }
}

export function removeUserScoped(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getUserScopedKey(key));
  } catch {
    // ignore
  }
}

export function clearUserScopedData(userId?: string) {
  if (typeof window === "undefined") return;
  const uid = userId ?? getActiveUserId();
  const prefix = `${USER_PREFIX}${uid}:`;
  try {
    Object.keys(window.localStorage).forEach((key) => {
      if (key.startsWith(prefix)) {
        window.localStorage.removeItem(key);
      }
    });
  } catch {
    // ignore
  }
}

export function clearLegacyAppData() {
  if (typeof window === "undefined") return;
  try {
    Object.keys(window.localStorage).forEach((key) => {
      if (key.startsWith(USER_PREFIX)) return;
      if (key === ACTIVE_USER_KEY) return;
      if (key === ACCOUNT_REGISTRY_KEY) return;
      if (key === LEGACY_CLEANUP_KEY) return;
      if (key.startsWith("snapcook:") || key.startsWith("snapcook.") || key.startsWith("cosmiccrave:") || key.startsWith("cosmiccrave.")) {
        window.localStorage.removeItem(key);
      }
    });
  } catch {
    // ignore
  }
}

export function clearAllAppData(userId?: string) {
  clearUserScopedData(userId);
  clearLegacyAppData();
  clearActiveUserId();
}

const LEGACY_MIGRATION_MAP: Array<{ legacy: string; next: string }> = [
  { legacy: "snapcook:cookbooks:v1", next: "cookbooks:v1" },
  { legacy: "snapcook:cooked:v1", next: "cooked:v1" },
  { legacy: "snapcook:plan:v1", next: "plan:v1" },
  { legacy: "snapcook:cookingSession:v1", next: "cookingSession:v1" },
  { legacy: "snapcook:theme", next: "theme" },
  { legacy: "snapcook:glass:enabled", next: "glass:enabled" },
  { legacy: "snapcook:glass:level", next: "glass:level" },
  { legacy: "snapcook:privacy:analytics", next: "privacy:analytics" },
  { legacy: "snapcook:privacy:personalization", next: "privacy:personalization" },
  { legacy: "snapcook:profile:photo", next: "profile:photo" },
  { legacy: "snapcook:selectedRecipeId", next: "selectedRecipeId" },
  { legacy: "snapcook:scanSessionId", next: "scanSessionId" },
  { legacy: "snapcook:auth", next: "auth" },
  { legacy: "snapcook:prefs", next: "prefs" },
  { legacy: "snapcook:onboarding:complete", next: "onboarding:complete" },
];

export function runLegacyCleanupOnce() {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(LEGACY_CLEANUP_KEY) === "1") return;

    LEGACY_MIGRATION_MAP.forEach(({ legacy, next }) => {
      const legacyValue = window.localStorage.getItem(legacy);
      if (legacyValue == null) return;
      const scopedKey = getUserScopedKey(next);
      if (window.localStorage.getItem(scopedKey) == null) {
        window.localStorage.setItem(scopedKey, legacyValue);
      }
      window.localStorage.removeItem(legacy);
    });

    Object.keys(window.localStorage).forEach((key) => {
      if (key.startsWith(USER_PREFIX)) return;
      if (key === ACTIVE_USER_KEY) return;
      if (key === ACCOUNT_REGISTRY_KEY) return;
      if (key === LEGACY_CLEANUP_KEY) return;
      if (key.startsWith("snapcook:") || key.startsWith("snapcook.") || key.startsWith("cosmiccrave:") || key.startsWith("cosmiccrave.")) {
        window.localStorage.removeItem(key);
      }
    });

    window.localStorage.setItem(LEGACY_CLEANUP_KEY, "1");
  } catch {
    // ignore
  }
}
