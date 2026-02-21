import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChefHat, ChevronRight, Image, Info, Sparkles, Target, Trash2, Wheat, Zap } from "lucide-react";
import { UserAvatar } from "@/components/app/user-avatar";
import { useLocation } from "wouter";
import { getActiveUserId, isRegisteredAccount, readUserScoped, writeUserScoped, removeUserScoped } from "@/lib/user-storage";
import { useCookbooks } from "@/lib/cookbooks-store";
import { getRecipe, type RecipeFull } from "@/lib/recipes";
import { usePlan, toDateKey, addDays } from "@/lib/plan-store";
import { getScanUsageCountForMonth, subscribeToScanUsage } from "@/lib/scan-usage";

import BottomNav from "@/components/app/bottom-nav";
import { toast } from "@/hooks/use-toast";
import { PAGE_TITLE_CLASS, EYEBROW_CLASS, SECTION_TITLE_SM_CLASS } from "@/lib/design-tokens";

type NutritionEstimate = {
  protein: number;
  fat: number;
  carbs: number;
  calories: number;
};

const PROFILE_PHOTO_KEY = "profile:photo";
const PROFILE_PHOTO_LEGACY_KEYS = ["snapcook:profile:photo"];
const PROFILE_PREFS_KEY = "profile:prefs:v1";
const PROFILE_PREFS_LEGACY_KEYS = ["snapcook:profile:prefs:v1"];
const PROFILE_PLAN_KEY = "profile:plan-tier:v1";
const PROFILE_PLAN_LEGACY_KEYS = ["snapcook:profile:plan-tier:v1"];
const FREE_SCAN_LIMIT = 5;
const PRO_SCAN_LIMIT = 30;
const APP_VERSION = "v1.0.0";
const WEEK_WINDOW_MS = 1000 * 60 * 60 * 24 * 7;
const MAX_PROFILE_PHOTO_DATA_URL_LENGTH = 1_800_000;

type ProfilePrefs = {
  dietType: string;
  allergies: string[];
  calorieGoal: number;
};

const DEFAULT_PROFILE_PREFS: ProfilePrefs = {
  dietType: "Flexible",
  allergies: ["None"],
  calorieGoal: 2000,
};

const NUTRITION_OVERRIDES: Record<string, NutritionEstimate> = {
  s1: { protein: 26, fat: 16, carbs: 39, calories: 450 },
  s2: { protein: 22, fat: 14, carbs: 32, calories: 320 },
  s3: { protein: 12, fat: 8, carbs: 52, calories: 180 },
  r1: { protein: 20, fat: 12, carbs: 34, calories: 360 },
  r2: { protein: 42, fat: 18, carbs: 35, calories: 478 },
  r3: { protein: 16, fat: 22, carbs: 28, calories: 370 },
};

function Orb({ className }: { className?: string }) {
  return (
    <div
      className={
        "pointer-events-none absolute rounded-full blur-3xl opacity-60 " +
        (className ?? "")
      }
    />
  );
}

function Glass({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={"glass-card sc-noise relative overflow-hidden border border-white/5 " + (className ?? "")}>
      {children}
    </div>
  );
}

function parseCalories(value?: string) {
  if (!value) return 0;
  const matched = value.match(/\d+/g);
  if (!matched?.length) return 0;
  const merged = Number(matched.join(""));
  return Number.isFinite(merged) ? merged : 0;
}

function estimateNutrition(recipe: RecipeFull): NutritionEstimate {
  const overridden = NUTRITION_OVERRIDES[recipe.id];
  if (overridden) return overridden;

  const baseCalories = parseCalories(recipe.calories) || Math.max(260, recipe.minutes * 18);
  const protein = Math.max(10, Math.round((baseCalories * 0.26) / 4));
  const fat = Math.max(8, Math.round((baseCalories * 0.28) / 9));
  const carbs = Math.max(16, Math.round((baseCalories * 0.46) / 4));

  return {
    protein,
    fat,
    carbs,
    calories: baseCalories,
  };
}

function sanitizeProfilePrefs(raw: unknown): ProfilePrefs {
  const fallback = { ...DEFAULT_PROFILE_PREFS };
  if (!raw || typeof raw !== "object") return fallback;

  const candidate = raw as Partial<ProfilePrefs>;
  const calorieCandidate = Number(candidate.calorieGoal);
  const calorieGoal = Number.isFinite(calorieCandidate)
    ? Math.min(5000, Math.max(900, Math.round(calorieCandidate)))
    : fallback.calorieGoal;

  const dietType =
    typeof candidate.dietType === "string" && candidate.dietType.trim().length > 0
      ? candidate.dietType.trim()
      : fallback.dietType;

  const allergies = normalizeAllergies(candidate.allergies);

  return {
    dietType,
    allergies,
    calorieGoal,
  };
}

function readStoredProfilePrefs() {
  const raw = readUserScoped(PROFILE_PREFS_KEY, PROFILE_PREFS_LEGACY_KEYS);
  if (!raw) return DEFAULT_PROFILE_PREFS;
  try {
    return sanitizeProfilePrefs(JSON.parse(raw));
  } catch {
    return DEFAULT_PROFILE_PREFS;
  }
}

function normalizeAllergies(raw: unknown): string[] {
  if (!Array.isArray(raw)) return ["None"];
  const deduped = Array.from(
    new Set(
      raw
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
  if (deduped.length === 0 || deduped.includes("None")) return ["None"];
  return deduped;
}

function getPlanTierFromStorage(): "free" | "pro" {
  return readUserScoped(PROFILE_PLAN_KEY, PROFILE_PLAN_LEGACY_KEYS) === "pro" ? "pro" : "free";
}

function formatDisplayName(userId: string) {
  const raw = userId.trim();
  if (!raw || raw === "guest") return "Chef";
  const normalized = raw.toLowerCase();
  // Local/dev placeholder identities should never surface as literal names.
  if (
    normalized.endsWith("@local") ||
    normalized === "apple" ||
    normalized === "google" ||
    normalized === "chef"
  ) {
    return "Chef";
  }
  const base = raw.includes("@") ? raw.slice(0, raw.indexOf("@")) : raw;
  const withSpaces = base.replace(/[._-]+/g, " ").trim();
  if (!withSpaces) return "Chef";
  return withSpaces
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
}

function compressDataUrl(dataUrl: string, maxDimension: number, quality: number) {
  return new Promise<string>((resolve) => {
    const image = new window.Image();
    image.onload = () => {
      const longestEdge = Math.max(image.width, image.height);
      const scale = longestEdge > maxDimension ? maxDimension / longestEdge : 1;
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(dataUrl);
        return;
      }
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

async function optimizeProfilePhoto(file: File) {
  const originalDataUrl = await fileToDataUrl(file);
  let optimized = await compressDataUrl(originalDataUrl, 1200, 0.85);
  if (optimized.length > MAX_PROFILE_PHOTO_DATA_URL_LENGTH) {
    optimized = await compressDataUrl(optimized, 900, 0.76);
  }
  if (optimized.length > MAX_PROFILE_PHOTO_DATA_URL_LENGTH) {
    throw new Error("photo-too-large");
  }
  return optimized;
}

function ScanRing({ used, total }: { used: number; total: number }) {
  const size = 128;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(1, used / total) : 0;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="relative h-32 w-32 shrink-0">
      <div className="pointer-events-none absolute inset-[-18px] rounded-full bg-[radial-gradient(circle,rgba(196,149,106,0.22),transparent_65%)]" />
      <svg width={size} height={size} className="relative z-[1] -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(196,149,106,0.28)"
          strokeWidth={stroke + 6}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="blur-[4px]"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--ring))"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center">
        <div className="font-mono text-3xl font-bold leading-none text-foreground">{used}</div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
          of {total} scans
        </div>
      </div>
    </div>
  );
}

function MacroSplitBar({ protein, fat, carbs }: { protein: number; fat: number; carbs: number }) {
  const total = protein + fat + carbs;
  const p = total > 0 ? Math.round((protein / total) * 100) : 0;
  const f = total > 0 ? Math.round((fat / total) * 100) : 0;
  const c = total > 0 ? Math.max(0, 100 - p - f) : 0;

  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--background)/0.55)]">
        <motion.div
          className="h-full bg-[hsl(164_50%_57%)]"
          initial={{ width: 0 }}
          animate={{ width: `${p}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.div
          className="h-full bg-[hsl(39_54%_62%)]"
          initial={{ width: 0 }}
          animate={{ width: `${f}%` }}
          transition={{ duration: 1, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.div
          className="h-full bg-[hsl(79_33%_58%)]"
          initial={{ width: 0 }}
          animate={{ width: `${c}%` }}
          transition={{ duration: 1.05, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <span className="inline-flex items-center gap-1 text-[hsl(164_50%_57%)]">
          <span className="h-1.5 w-1.5 rounded-[2px] bg-[hsl(164_50%_57%)]" />
          Protein {p}%
        </span>
        <span className="inline-flex items-center gap-1 text-[hsl(39_54%_62%)]">
          <span className="h-1.5 w-1.5 rounded-[2px] bg-[hsl(39_54%_62%)]" />
          Fat {f}%
        </span>
        <span className="inline-flex items-center gap-1 text-[hsl(79_33%_58%)]">
          <span className="h-1.5 w-1.5 rounded-[2px] bg-[hsl(79_33%_58%)]" />
          Carbs {c}%
        </span>
      </div>
    </div>
  );
}

function MacroMetric({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-white/8 bg-[hsl(var(--background)/0.26)] px-3 py-3 text-center">
      <div className={"font-mono text-xl font-bold " + colorClass}>{value}g</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">{label}</div>
    </div>
  );
}

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const activeUserId = getActiveUserId();
  const isAccountSession = isRegisteredAccount(activeUserId);
  const displayName = useMemo(() => formatDisplayName(activeUserId), [activeUserId]);
  const cookbooks = useCookbooks();
  const plan = usePlan();

  const [scanUsageVersion, setScanUsageVersion] = useState(0);
  const [calorieGoalOpen, setCalorieGoalOpen] = useState(false);
  const [prefsReady, setPrefsReady] = useState(false);
  const [dietaryOpen, setDietaryOpen] = useState(false);
  const [dietType, setDietType] = useState(DEFAULT_PROFILE_PREFS.dietType);
  const [allergies, setAllergies] = useState<string[]>(DEFAULT_PROFILE_PREFS.allergies);
  const [calorieGoal, setCalorieGoal] = useState(DEFAULT_PROFILE_PREFS.calorieGoal);
  const [calorieGoalDraft, setCalorieGoalDraft] = useState(String(DEFAULT_PROFILE_PREFS.calorieGoal));
  const [photoOpen, setPhotoOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const takePhotoRef = useRef<HTMLInputElement | null>(null);
  const choosePhotoRef = useRef<HTMLInputElement | null>(null);

  const dietOptions = [
    "Flexible",
    "Vegetarian",
    "Vegan",
    "Keto",
    "Pescatarian",
    "Paleo",
    "Low-carb",
    "Mediterranean",
    "Halal",
    "Kosher",
    "Whole30",
    "Dairy-free",
    "Gluten-free",
  ];

  const allergyOptions = [
    "Peanuts",
    "Tree nuts",
    "Dairy",
    "Eggs",
    "Gluten",
    "Soy",
    "Shellfish",
    "Fish",
    "Sesame",
    "Sulfites",
    "None",
  ];

  // Get planned recipes from the next 7 days (weekly plan)
  const plannedRecipeSnapshots = useMemo(() => {
    const today = new Date();
    const recipes: { plannedAt: number; recipe: RecipeFull; nutrition: NutritionEstimate; dateKey: string }[] = [];

    // Check next 7 days of planned meals
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = addDays(today, dayOffset);
      const dateKey = toDateKey(date);
      const dayEntries = plan.getDayEntries(dateKey);

      // Add all planned meals for this day
      Object.values(dayEntries).forEach((entry) => {
        if (!entry) return;
        const recipe = getRecipe(entry.recipeId);
        if (!recipe) return;

        recipes.push({
          plannedAt: entry.createdAt,
          recipe,
          nutrition: estimateNutrition(recipe),
          dateKey,
        });
      });
    }

    return recipes.sort((a, b) => b.plannedAt - a.plannedAt);
  }, [plan.entries]);

  const weeklyWindowRecipes = useMemo(() => {
    // All planned recipes are already within the week window
    return plannedRecipeSnapshots;
  }, [plannedRecipeSnapshots]);

  const weeklyRecipes = useMemo(() => weeklyWindowRecipes.slice(0, 5), [weeklyWindowRecipes]);
  const weeklyRecipeOverflowCount = Math.max(0, weeklyWindowRecipes.length - weeklyRecipes.length);

  const weeklyTotals = useMemo(() => {
    return weeklyWindowRecipes.reduce(
      (acc, item) => ({
        protein: acc.protein + item.nutrition.protein,
        fat: acc.fat + item.nutrition.fat,
        carbs: acc.carbs + item.nutrition.carbs,
        calories: acc.calories + item.nutrition.calories,
      }),
      { protein: 0, fat: 0, carbs: 0, calories: 0 },
    );
  }, [weeklyWindowRecipes]);

  const weeklyAverages = useMemo(() => {
    if (weeklyWindowRecipes.length === 0) return { protein: 0, fat: 0, carbs: 0 };
    return {
      protein: Math.round(weeklyTotals.protein / weeklyWindowRecipes.length),
      fat: Math.round(weeklyTotals.fat / weeklyWindowRecipes.length),
      carbs: Math.round(weeklyTotals.carbs / weeklyWindowRecipes.length),
    };
  }, [weeklyWindowRecipes, weeklyTotals]);

  const sortedWeeklyByCalories = useMemo(() => {
    return [...weeklyRecipes].sort((a, b) => b.nutrition.calories - a.nutrition.calories);
  }, [weeklyRecipes]);

  const scansUsedThisMonth = useMemo(() => getScanUsageCountForMonth(new Date()), [scanUsageVersion, activeUserId]);
  const planTier: "free" | "pro" = useMemo(() => getPlanTierFromStorage(), [activeUserId]);
  const scansLimit = planTier === "pro" ? PRO_SCAN_LIMIT : FREE_SCAN_LIMIT;
  const scansUsed = Math.min(scansLimit, scansUsedThisMonth);
  const scansRemaining = Math.max(0, scansLimit - scansUsed);

  useEffect(() => {
    setPrefsReady(false);
    const storedPrefs = readStoredProfilePrefs();
    setDietType(storedPrefs.dietType);
    setAllergies(storedPrefs.allergies);
    setCalorieGoal(storedPrefs.calorieGoal);
    setCalorieGoalDraft(String(storedPrefs.calorieGoal));
    setPrefsReady(true);
  }, [activeUserId]);

  useEffect(() => {
    if (!prefsReady) return;
    writeUserScoped(
      PROFILE_PREFS_KEY,
      JSON.stringify({
        dietType,
        allergies: normalizeAllergies(allergies),
        calorieGoal,
      } satisfies ProfilePrefs),
    );
  }, [dietType, allergies, calorieGoal, activeUserId, prefsReady]);

  useEffect(() => {
    const unsubscribe = subscribeToScanUsage(() => {
      setScanUsageVersion((value) => value + 1);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    try {
      const stored = readUserScoped(PROFILE_PHOTO_KEY, PROFILE_PHOTO_LEGACY_KEYS);
      setProfilePhoto(stored || null);
    } catch {
      // ignore
    }
  }, [activeUserId]);

  useEffect(() => {
    try {
      if (profilePhoto) {
        writeUserScoped(PROFILE_PHOTO_KEY, profilePhoto);
      } else {
        removeUserScoped(PROFILE_PHOTO_KEY);
      }
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('profilePhotoUpdated'));
    } catch {
      // ignore
    }
  }, [profilePhoto, activeUserId]);

  const allergySummary = useMemo(() => {
    const normalized = normalizeAllergies(allergies);
    if (normalized.includes("None")) return "No allergies";
    if (normalized.length <= 2) return normalized.join(", ");
    return `${normalized.slice(0, 2).join(", ")} +${normalized.length - 2} more`;
  }, [allergies]);

  const handlePhotoFile = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Unsupported file", description: "Please choose an image." });
      return;
    }
    try {
      const optimized = await optimizeProfilePhoto(file);
      setProfilePhoto(optimized);
      setPhotoOpen(false);
    } catch {
      toast({
        title: "Photo too large",
        description: "Use a smaller image so it can be saved reliably.",
      });
    }
  };

  const commitCalorieGoal = () => {
    const parsed = Number(calorieGoalDraft.replace(/[^\d]/g, ""));
    if (!Number.isFinite(parsed) || parsed < 900 || parsed > 5000) {
      toast({
        title: "Invalid goal",
        description: "Choose a daily calorie goal between 900 and 5,000.",
      });
      return;
    }
    setCalorieGoal(parsed);
    setCalorieGoalOpen(false);
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-hidden">
      <div
        className="relative mx-auto min-h-screen w-full max-w-[430px] px-4 pb-32 pt-8"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 10.5rem)" }}
      >
        {/* Cinematic top-left glow */}
        <div
          className="pointer-events-none fixed left-0 top-0 h-[600px] w-[600px] opacity-60"
          style={{
            background: 'radial-gradient(circle at 0% 0%, hsl(25 90% 55% / 0.35) 0%, hsl(30 85% 50% / 0.18) 25%, transparent 60%)',
            filter: 'blur(60px)',
          }}
        />

        <Orb className="-left-10 top-10 h-56 w-56 bg-[hsl(var(--ring)/0.45)]" />
        <Orb className="-right-14 top-44 h-72 w-72 bg-[hsl(30_82%_55%/0.20)]" />
        <Orb className="left-10 bottom-6 h-64 w-64 bg-[hsl(24_78%_58%/0.16)]" />

        <header className="relative z-10 mb-6">
          <div className={PAGE_TITLE_CLASS} data-testid="text-profile-title">
            Profile
          </div>
          <div className={"mt-1 " + EYEBROW_CLASS + " text-[hsl(var(--ring))]"}>
            Weekly Snapshot
          </div>
        </header>

        <main className="relative z-10 grid gap-6">
          <section>
            <Glass className="rounded-3xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <UserAvatar
                      size="lg"
                      showCameraIcon={true}
                      borderColor="ring"
                      onClick={() => setPhotoOpen(true)}
                      className="cursor-pointer"
                    />
                    <input
                      ref={takePhotoRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(event) => {
                        void handlePhotoFile(event.target.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                    <input
                      ref={choosePhotoRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        void handlePhotoFile(event.target.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className={SECTION_TITLE_SM_CLASS + " truncate"} data-testid="text-profile-user-name">
                      {displayName}
                    </div>
                    <div className="mt-1 inline-flex items-center rounded-full border border-white/10 bg-white/10 px-2.5 py-0.5 text-[10px] font-medium text-white/90">
                      {planTier === "free" ? "Free plan" : "Pro plan"}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] uppercase tracking-[0.1em] text-zinc-200">
                  Monthly cycle
                </div>
              </div>

              <div className="mt-4 flex flex-col items-center gap-4">
                <ScanRing used={scansUsed} total={scansLimit} />

                <div className="grid flex-1 gap-3">
                  <div className="rounded-2xl border border-white/8 bg-[hsl(var(--background)/0.24)] px-3 py-2 text-sm">
                    <span className="font-mono text-[hsl(var(--ring))]">{scansUsed}</span>
                    <span className="mx-1.5 text-zinc-300">used</span>
                    <span className="text-zinc-400">•</span>
                    <span className="ml-1.5 font-mono text-[hsl(164_50%_57%)]">{scansRemaining}</span>
                    <span className="ml-1 text-zinc-200">remaining</span>
                  </div>
                  <p className="text-xs text-zinc-200">
                    {scansRemaining === 0
                      ? "You hit this month’s scan limit. Upgrade to keep scanning."
                      : "Scans refresh every month."}
                  </p>
                </div>
              </div>

              {planTier === "free" ? (
                <button
                  type="button"
                  className={
                    "mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border font-semibold transition-colors " +
                    (scansRemaining === 0
                      ? "border-[hsl(var(--ring)/0.35)] bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-[hsl(var(--primary-foreground))]"
                      : "border-white/20 bg-white/5 text-[hsl(var(--ring))] hover:bg-white/10")
                  }
                  onClick={() => toast({ title: "Upgrade", description: "30 scans/month will unlock with Pro." })}
                >
                  <Sparkles className="h-4 w-4" />
                  Upgrade to 30 scans/mo
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : null}
            </Glass>
          </section>


          <section>
            <div className="mb-2 px-1 text-sm font-medium uppercase tracking-wider text-zinc-200">
              Goals & Preferences
            </div>
            <Glass className="rounded-3xl overflow-hidden p-0">
              <button
                type="button"
                className="flex w-full items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
                onClick={() => {
                  setCalorieGoalDraft(String(calorieGoal));
                  setCalorieGoalOpen(true);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/15">
                    <Target className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium">Calorie Goal</div>
                    <div className="text-xs text-zinc-200">{calorieGoal.toLocaleString()} kcal/day</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-white/60" />
              </button>

              <div className="h-px bg-[hsl(var(--border)/0.5)]" />

              <button
                type="button"
                className="flex w-full items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
                onClick={() => setDietaryOpen(true)}
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-500/15">
                    <Wheat className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium">Dietary Preferences</div>
                    <div className="text-xs text-zinc-200">
                      {dietType} • {allergySummary}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-white/60" />
              </button>
            </Glass>
          </section>
        </main>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{APP_VERSION}</p>
        </div>

        <BottomNav />
      </div>

      <AnimatePresence>
        {photoOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPhotoOpen(false)}
              className="fixed inset-0 z-[70] glass-backdrop"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="fixed left-1/2 top-1/2 z-[80] w-[calc(100vw-32px)] max-w-[430px] -translate-x-1/2 -translate-y-1/2"
            >
              <div className="glass-modal p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-heading font-bold text-white">Update profile photo</h3>
                    <p className="mt-1 text-xs text-zinc-400">
                      Choose a new photo or remove your current one.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhotoOpen(false)}
                    className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  <button
                    type="button"
                    className="w-full h-12 rounded-2xl bg-white text-black font-semibold flex items-center gap-3 px-4 hover:bg-zinc-200 transition-colors"
                    onClick={() => takePhotoRef.current?.click()}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-black/10 text-black">
                      <Camera className="h-4 w-4" />
                    </span>
                    Take photo
                  </button>

                  <button
                    type="button"
                    className="w-full h-12 rounded-2xl border border-white/10 bg-white/5 text-white font-semibold flex items-center gap-3 px-4 hover:bg-white/10 transition-colors"
                    onClick={() => choosePhotoRef.current?.click()}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-white">
                      <Image className="h-4 w-4" />
                    </span>
                    Choose from library
                  </button>

                  <button
                    type="button"
                    className={
                      "w-full h-12 rounded-2xl border border-white/10 bg-white/5 text-white font-semibold flex items-center gap-3 px-4 transition-colors " +
                      (profilePhoto ? "hover:bg-white/10" : "opacity-50 cursor-not-allowed")
                    }
                    onClick={() => {
                      if (!profilePhoto) return;
                      setProfilePhoto(null);
                      setPhotoOpen(false);
                    }}
                    disabled={!profilePhoto}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-white">
                      <Trash2 className="h-4 w-4" />
                    </span>
                    Remove photo
                  </button>
                </div>

                <p className="mt-4 text-[11px] text-zinc-500">
                  Tip: If Take photo does not open the camera on your device, use Choose from library instead.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dietaryOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDietaryOpen(false)}
              className="fixed inset-0 z-[70] glass-backdrop"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="fixed left-1/2 top-1/2 z-[80] w-[calc(100vw-32px)] max-w-[430px] -translate-x-1/2 -translate-y-1/2"
            >
              <div className="glass-modal p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-heading font-bold text-white">Dietary preferences</h3>
                    <p className="mt-1 text-xs text-zinc-400">
                      These settings affect recipe suggestions later, with no extra AI cost.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDietaryOpen(false)}
                    className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-[11px] font-semibold tracking-[0.18em] text-[hsl(var(--muted-foreground))] uppercase">
                      Diet type
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {dietOptions.map((option) => {
                        const selected = option === dietType;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setDietType(option)}
                            className={
                              "h-9 rounded-2xl text-xs font-semibold transition-colors " +
                              (selected
                                ? "bg-[hsl(var(--ring)/0.25)] text-white border border-[hsl(var(--ring)/0.5)]"
                                : "bg-white/5 text-zinc-200 border border-white/10 hover:bg-white/10")
                            }
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-[11px] font-semibold tracking-[0.18em] text-[hsl(var(--muted-foreground))] uppercase">
                      Allergies
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {allergyOptions.map((option) => {
                        const selected = allergies.includes(option);
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setAllergies((prev) => {
                                if (option === "None") return ["None"];
                                const withoutNone = prev.filter((item) => item !== "None");
                                if (withoutNone.includes(option)) {
                                  return withoutNone.filter((item) => item !== option);
                                }
                                return [...withoutNone, option];
                              });
                            }}
                            className={
                              "h-8 rounded-full px-3 text-xs font-semibold transition-colors " +
                              (selected
                                ? "bg-[hsl(var(--ring)/0.25)] text-white border border-[hsl(var(--ring)/0.5)]"
                                : "bg-white/5 text-zinc-200 border border-white/10 hover:bg-white/10")
                            }
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDietType("Flexible");
                      setAllergies(["None"]);
                    }}
                    className="h-10 rounded-2xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                  >
                    Reset to defaults
                  </button>
                  <button
                    type="button"
                    onClick={() => setDietaryOpen(false)}
                    className="h-11 rounded-2xl bg-white text-black font-semibold hover:bg-zinc-200"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {calorieGoalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCalorieGoalOpen(false)}
              className="fixed inset-0 z-[70] glass-backdrop"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="fixed left-1/2 top-1/2 z-[80] w-[calc(100vw-32px)] max-w-[430px] -translate-x-1/2 -translate-y-1/2"
            >
              <div className="glass-modal p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-heading font-bold text-white">Calorie goal</h3>
                    <p className="mt-1 text-xs text-zinc-400">
                      Set your daily target to tune weekly progress summaries.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCalorieGoalOpen(false)}
                    className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <label htmlFor="calorie-goal-input" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                    Daily calories
                  </label>
                  <input
                    id="calorie-goal-input"
                    inputMode="numeric"
                    value={calorieGoalDraft}
                    onChange={(event) => {
                      const next = event.target.value.replace(/[^\d]/g, "");
                      setCalorieGoalDraft(next);
                    }}
                    className="mt-3 h-11 w-full rounded-2xl border border-white/10 bg-[hsl(var(--background)/0.45)] px-3 text-sm text-white outline-none ring-0 placeholder:text-zinc-500 focus:border-[hsl(var(--ring)/0.45)]"
                    placeholder="2000"
                  />
                  <p className="mt-2 text-[11px] text-zinc-500">Recommended range: 900–5,000 kcal/day.</p>
                </div>

                <div className="mt-5 grid gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCalorieGoal(DEFAULT_PROFILE_PREFS.calorieGoal);
                      setCalorieGoalDraft(String(DEFAULT_PROFILE_PREFS.calorieGoal));
                    }}
                    className="h-10 rounded-2xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                  >
                    Reset to default
                  </button>
                  <button
                    type="button"
                    onClick={commitCalorieGoal}
                    className="h-11 rounded-2xl bg-white text-black font-semibold hover:bg-zinc-200"
                  >
                    Save goal
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
