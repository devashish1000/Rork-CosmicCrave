import { readUserScoped, writeUserScoped, removeUserScoped } from "@/lib/user-storage";

export type CosmicCravePrefs = {
  cookingFor: string[];
};

type Session = {
  authed: boolean;
  prefs: CosmicCravePrefs;
  onboardingComplete: boolean;
};

const KEYS = {
  auth: "auth",
  prefs: "prefs",
  onboarding: "onboarding:complete",
} as const;

const LEGACY_KEYS = {
  auth: ["snapcook:auth"],
  prefs: ["snapcook:prefs"],
  onboarding: ["snapcook:onboarding:complete"],
} as const;

const safeGet = (key: string, legacyKeys: readonly string[] = []) => {
  try {
    return readUserScoped(key, legacyKeys);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string) => {
  try {
    writeUserScoped(key, value);
  } catch {
    // ignore
  }
};

const safeRemove = (key: string) => {
  try {
    removeUserScoped(key);
  } catch {
    // ignore
  }
};

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export function getSession(): Session {
  if (typeof window === "undefined") {
    return { authed: false, prefs: { cookingFor: [] }, onboardingComplete: false };
  }

  const authed = safeGet(KEYS.auth, LEGACY_KEYS.auth) === "1";
  const onboardingComplete = safeGet(KEYS.onboarding, LEGACY_KEYS.onboarding) === "1";
  const prefs = safeParse<CosmicCravePrefs>(safeGet(KEYS.prefs, LEGACY_KEYS.prefs), { cookingFor: [] });

  return { authed, prefs, onboardingComplete };
}

export function setAuthed(v: boolean) {
  if (typeof window === "undefined") return;
  if (v) safeSet(KEYS.auth, "1");
  else safeRemove(KEYS.auth);
}

export function setOnboardingComplete() {
  if (typeof window === "undefined") return;
  safeSet(KEYS.onboarding, "1");
}

export function setPrefs(prefs: CosmicCravePrefs) {
  if (typeof window === "undefined") return;
  safeSet(KEYS.prefs, JSON.stringify(prefs));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  safeRemove(KEYS.auth);
  safeRemove(KEYS.prefs);
  safeRemove(KEYS.onboarding);
}

export function resetToOnboarding() {
  if (typeof window === "undefined") return;
  safeRemove(KEYS.auth);
  safeRemove(KEYS.prefs);
  safeRemove(KEYS.onboarding);
}

function buildLoginPathFromCurrent() {
  if (typeof window === "undefined") return "/login";
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return "/login";
  }
  segments[segments.length - 1] = "login";
  return `/${segments.join("/")}`;
}

export function redirectToLogin(navigate?: (path: string) => void) {
  if (typeof window === "undefined") return;

  try {
    navigate?.("/login");
  } catch {
    // ignore and fallback to hard redirect below
  }

  window.setTimeout(() => {
    if (window.location.pathname.endsWith("/login")) return;
    window.location.assign(buildLoginPathFromCurrent());
  }, 0);
}
