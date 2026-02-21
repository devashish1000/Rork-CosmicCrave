import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, BookOpen, Bookmark, Camera, ChefHat, ChevronRight, Clock, Sparkles, Wheat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RECIPES } from "@/lib/recipes";
import { useCookbooks } from "@/lib/cookbooks-store";
import { readUserScoped, writeUserScoped, removeUserScoped } from "@/lib/user-storage";
import { filterRecipesByPreferences, readDietaryPreferences } from "@/lib/dietary-preferences";
import {
  normalizeScanSessionId,
  readScanPayload,
  removeScanPayload,
  safeParseDetectedItems,
} from "@/lib/scan-payload";
import { readScanIdeas, removeScanIdeas } from "@/lib/scan-ideas";
import type { RecipeFull } from "@/lib/recipes";
import {
  RING_COLORS,
  EYEBROW_CLASS,
  PAGE_TITLE_CLASS,
  CAPTION_CLASS,
  MODAL_TITLE_CLASS,
  SECTION_TITLE_SM_CLASS,
  DIVIDER_LABEL_CLASS,
  EXPAND_COPY,
  HERO_HEIGHT_PX,
  HERO_TITLE_CLASS,
  HERO_BLURB_CLASS,
} from "@/lib/design-tokens";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}


const RESULT_IDS = ["s1", "s2", "s3"];
const SELECTED_RECIPE_KEY = "selectedRecipeId";
const PENDING_COOKBOOK_KEY = "pendingCookbookId";
const SELECTED_RECIPE_LEGACY_KEYS = ["snapcook:selectedRecipeId"];
const SCAN_SESSION_KEY = "scanSessionId";
const SCAN_SESSION_LEGACY_KEYS = ["snapcook:scanSessionId"];
const MAX_NAME_LENGTH = 30;
const MAX_DETECTED_CHIPS_COLLAPSED = 10;
const MAX_INGREDIENT_CHIPS_COLLAPSED = 8;
const MOOD_COLORS = [
  { id: "coral", color: "#ff5a45" },
  { id: "teal", color: "#21c1c7" },
  { id: "green", color: "#1cc37b" },
  { id: "magenta", color: "#c75bf2" },
  { id: "violet", color: "#7059f7" },
  { id: "gold", color: "#f0b429" },
];

function normalizeName(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

function formatCookbookDisplayName(raw: string | null | undefined) {
  const normalized = normalizeName(raw ?? "");
  if (!normalized) return "your cookbook";
  if (normalized.toLowerCase() === "saved") return "Saved Recipes";
  return normalized;
}

function truncateLabel(label: string, max = 24) {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}

type RecipeIdeaNutrition = {
  calories: number;
  protein: number;
  fiber: number;
};

const IDEA_NUTRITION_OVERRIDES: Record<string, RecipeIdeaNutrition> = {
  s1: { calories: 450, protein: 26, fiber: 6 },
  s2: { calories: 320, protein: 22, fiber: 8 },
  s3: { calories: 180, protein: 12, fiber: 4 },
  r1: { calories: 360, protein: 20, fiber: 7 },
  r2: { calories: 478, protein: 42, fiber: 6 },
  r3: { calories: 370, protein: 16, fiber: 8 },
};

function parseCalories(raw?: string) {
  if (!raw) return 0;
  const matched = raw.match(/\d+/g);
  if (!matched?.length) return 0;
  const merged = Number(matched.join(""));
  return Number.isFinite(merged) ? merged : 0;
}

function estimateIdeaNutrition(recipe: RecipeFull): RecipeIdeaNutrition {
  const override = IDEA_NUTRITION_OVERRIDES[recipe.id];
  if (override) return override;

  const calories = parseCalories(recipe.calories) || Math.max(260, recipe.minutes * 18);
  const protein = Math.max(10, Math.round((calories * 0.26) / 4));
  const fiber = Math.max(3, Math.round(recipe.ingredients.length * 0.9));
  return { calories, protein, fiber };
}

function RecipeIdeaRing({
  value,
  max,
  label,
  color,
  unit,
  delay = 0,
}: {
  value: number;
  max: number;
  label: string;
  color: string;
  unit: string;
  delay?: number;
}) {
  const size = 70;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = clamp(max > 0 ? value / max : 0, 0, 1);
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-[70px] w-[70px]">
        <div
          className="pointer-events-none absolute -inset-2 rounded-full"
          style={{
            background: `radial-gradient(circle, ${color}22 0%, transparent 68%)`,
          }}
        />
        <svg width={size} height={size} className="relative z-10 -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(196,149,106,0.14)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{
              duration: 0.9,
              delay,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        </svg>
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
          <span className="font-mono text-[27px] font-semibold leading-none text-[hsl(var(--foreground))]">
            {value}
          </span>
          <span className="mt-0.5 text-[9px] text-[hsl(var(--muted-foreground))]">{unit}</span>
        </div>
      </div>
      <span
        className="text-[11px] font-semibold uppercase tracking-[0.14em]"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}

export default function RecipeIdeasPage() {
  const [location, setLocation] = useLocation();
  const cookbooks = useCookbooks();

  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);

  const didAutoCenter = useRef(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedCookbookId, setSelectedCookbookId] = useState<string | null>(null);
  const [pendingRecipeId, setPendingRecipeId] = useState<string | null>(null);
  const [pendingCookbookId, setPendingCookbookId] = useState<string | null>(null);
  const [showCompletionFlow, setShowCompletionFlow] = useState(false);
  const [completionSummary, setCompletionSummary] = useState<{ recipeTitle: string; cookbookName: string } | null>(null);
  const [cookbookPickerOpen, setCookbookPickerOpen] = useState(false);
  const [cookbookTargetRecipeId, setCookbookTargetRecipeId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(MOOD_COLORS[0]?.color ?? "#ff5a45");
  const [createError, setCreateError] = useState<string | null>(null);
  const [switchConfirmOpen, setSwitchConfirmOpen] = useState(false);
  const [pendingSwitchRecipeId, setPendingSwitchRecipeId] = useState<string | null>(null);
  const [showAllDetected, setShowAllDetected] = useState(false);
  const [expandedIngredientsRecipeId, setExpandedIngredientsRecipeId] = useState<string | null>(null);


  const requestedScanId = useMemo(() => {
    const url = new URL(window.location.href);
    return url.searchParams.get("scanId") ?? url.searchParams.get("scan");
  }, [location]);

  const scanIdeas = useMemo(() => readScanIdeas(requestedScanId), [requestedScanId]);

  const detectedItems = useMemo(() => {
    const liveDetected = scanIdeas?.detectedItems ?? [];
    if (liveDetected.length > 0) return liveDetected;
    const url = new URL(window.location.href);
    const payloadDetected = readScanPayload(requestedScanId)?.detectedItems ?? [];
    if (payloadDetected.length > 0) return payloadDetected;
    return safeParseDetectedItems(url.searchParams.get("detectedItems"));
  }, [location, requestedScanId, scanIdeas?.detectedItems]);

  const detectedIngredientNames = useMemo(() => {
    return detectedItems.map((x) => x.name).filter(Boolean);
  }, [detectedItems]);

  const scanSessionId = useMemo(() => {
    return normalizeScanSessionId(requestedScanId, detectedItems);
  }, [detectedItems, requestedScanId]);

  const detectedNamesVisible = useMemo(() => {
    if (showAllDetected) return detectedIngredientNames;
    return detectedIngredientNames.slice(0, MAX_DETECTED_CHIPS_COLLAPSED);
  }, [detectedIngredientNames, showAllDetected]);
  const hiddenDetectedCount = Math.max(0, detectedIngredientNames.length - detectedNamesVisible.length);

  const recipes = useMemo(() => {
    const baseRecipes = scanIdeas?.recipes?.length
      ? scanIdeas.recipes
      : RECIPES.filter((r) => RESULT_IDS.includes(r.id));
    
    // Filter by dietary preferences
    const prefs = readDietaryPreferences();
    const dietaryFiltered = filterRecipesByPreferences(baseRecipes, prefs);
    
    if (dietaryFiltered.length === 0) return [];

    const normalizedDetected = detectedIngredientNames.map((x) => x.toLowerCase());

    return dietaryFiltered.map((r, idx) => {
      const ingredientNames = r.ingredients.map((i) => i.name.toLowerCase());
      const matchScore = normalizedDetected.reduce((acc, name) => {
        const matched = ingredientNames.some(
          (ing) => ing.includes(name) || name.includes(ing),
        );
        return acc + (matched ? 1 : 0);
      }, 0);
      return { ...r, matchScore, originalIndex: idx };
    });
  }, [detectedIngredientNames, scanIdeas?.recipes]);

  const requestedIndex = useMemo(() => {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get("i");
    const parsed = raw ? Number(raw) : NaN;
    if (!Number.isFinite(parsed)) return null;
    return clamp(Math.trunc(parsed), 0, Math.max(0, recipes.length - 1));
  }, [location, recipes.length]);

  const targetRecipe = useMemo(() => {
    if (!cookbookTargetRecipeId) return null;
    return recipes.find((r) => r.id === cookbookTargetRecipeId) ?? null;
  }, [recipes, cookbookTargetRecipeId]);

  const pendingCookbookName = useMemo(() => {
    if (!pendingCookbookId) return null;
    return cookbooks.cookbooks.find((c) => c.id === pendingCookbookId)?.name ?? null;
  }, [cookbooks.cookbooks, pendingCookbookId]);

  const pendingCookbookDisplay = useMemo(() => {
    if (!pendingCookbookName) return null;
    return formatCookbookDisplayName(pendingCookbookName);
  }, [pendingCookbookName]);

  const pendingCookbookDisplayShort = useMemo(() => {
    if (!pendingCookbookDisplay) return null;
    return truncateLabel(pendingCookbookDisplay, 24);
  }, [pendingCookbookDisplay]);

  const readSelectedFromUrl = (locationOverride?: string) => {
    const pathAndSearch = locationOverride ?? window.location.pathname + window.location.search;
    if (!pathAndSearch.startsWith("/ideas")) return null;
    const q = pathAndSearch.includes("?") ? pathAndSearch.slice(pathAndSearch.indexOf("?") + 1) : "";
    const params = new URLSearchParams(q);
    const selected = params.get("selected");
    if (!selected) return null;
    const exists = recipes.some((r) => r.id === selected);
    return exists ? selected : null;
  };

  const readSelectedFromStorage = () => {
    const stored = readUserScoped(SELECTED_RECIPE_KEY, SELECTED_RECIPE_LEGACY_KEYS);
    if (!stored) return null;
    const exists = recipes.some((r) => r.id === stored);
    return exists ? stored : null;
  };

  const readPendingCookbookFromStorage = () => {
    const stored = readUserScoped(PENDING_COOKBOOK_KEY);
    if (!stored) return null;
    const exists = cookbooks.cookbooks.some((c) => c.id === stored);
    return exists ? stored : null;
  };

  const clearSelectedStorage = () => {
    removeUserScoped(SELECTED_RECIPE_KEY);
    SELECTED_RECIPE_LEGACY_KEYS.forEach((legacyKey) => {
      try {
        window.localStorage.removeItem(legacyKey);
      } catch {
        // ignore
      }
    });
  };

  const clearPendingSelection = () => {
    setPendingRecipeId(null);
    setPendingCookbookId(null);
    removeUserScoped(PENDING_COOKBOOK_KEY);
  };

  const clearScanSessionStorage = () => {
    removeUserScoped(SCAN_SESSION_KEY);
    SCAN_SESSION_LEGACY_KEYS.forEach((legacyKey) => {
      try {
        window.localStorage.removeItem(legacyKey);
      } catch {
        // ignore
      }
    });
  };

  const clearIdeaSession = () => {
    clearSelectedStorage();
    clearScanSessionStorage();
    removeUserScoped(PENDING_COOKBOOK_KEY);
    removeScanPayload(scanSessionId);
    removeScanIdeas(scanSessionId);
    setSelectedRecipeId(null);
    setSelectedCookbookId(null);
    setPendingRecipeId(null);
    setPendingCookbookId(null);
    setShowCompletionFlow(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("selected");
    url.searchParams.delete("pendingCookbook");
    url.searchParams.delete("scanId");
    url.searchParams.delete("scan");
    url.searchParams.delete("detectedItems");
    window.history.replaceState({}, "", url.pathname + url.search);
  };

  const readSelected = (locationOverride?: string) => {
    const fromUrl = readSelectedFromUrl(locationOverride);
    if (fromUrl) return fromUrl;
    const lastSession = readUserScoped(SCAN_SESSION_KEY, SCAN_SESSION_LEGACY_KEYS);
    if (lastSession && lastSession !== scanSessionId) return null;
    return readSelectedFromStorage();
  };

  const readPendingCookbook = (locationOverride?: string) => {
    const lastSession = readUserScoped(SCAN_SESSION_KEY, SCAN_SESSION_LEGACY_KEYS);
    if (lastSession && lastSession !== scanSessionId) return null;
    const pathAndSearch = locationOverride ?? window.location.pathname + window.location.search;
    const q = pathAndSearch.includes("?") ? pathAndSearch.slice(pathAndSearch.indexOf("?") + 1) : "";
    const params = new URLSearchParams(q);
    const pending = params.get("pendingCookbook");
    if (pending) return pending;
    return readPendingCookbookFromStorage();
  };

  useEffect(() => {
    setShowCompletionFlow(false);
    if (!location.startsWith("/ideas")) return;
    const pathAndSearch = typeof location === "string" ? location : window.location.pathname + window.location.search;
    const selectedFromState = readSelected(pathAndSearch);
    setSelectedRecipeId(selectedFromState);
    const pendingFromState = readPendingCookbook(pathAndSearch);
    setPendingCookbookId(pendingFromState);
  }, [recipes.length, location]);

  useEffect(() => {
    const lastSession = readUserScoped(SCAN_SESSION_KEY, SCAN_SESSION_LEGACY_KEYS);
    if (lastSession !== scanSessionId) {
      writeUserScoped(SCAN_SESSION_KEY, scanSessionId);
      const url = new URL(window.location.href);
      const hasSelectionInUrl = url.searchParams.has("selected") || url.searchParams.has("pendingCookbook");
      if (!hasSelectionInUrl) {
        clearSelectedStorage();
        removeUserScoped(PENDING_COOKBOOK_KEY);
        setSelectedRecipeId(null);
        setPendingCookbookId(null);
        url.searchParams.delete("selected");
        url.searchParams.delete("pendingCookbook");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    }
  }, [scanSessionId]);

  useEffect(() => {
    setShowAllDetected(false);
  }, [scanSessionId]);

  useEffect(() => {
    setExpandedIngredientsRecipeId(null);
  }, [activeIndex, scanSessionId]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedRecipeId) {
      url.searchParams.set("selected", selectedRecipeId);
    } else {
      url.searchParams.delete("selected");
    }
    if (pendingCookbookId) {
      url.searchParams.set("pendingCookbook", pendingCookbookId);
    } else {
      url.searchParams.delete("pendingCookbook");
    }
    window.history.replaceState({}, "", url.pathname + url.search);

    if (selectedRecipeId) {
      writeUserScoped(SELECTED_RECIPE_KEY, selectedRecipeId);
    } else {
      clearSelectedStorage();
    }
    if (pendingCookbookId) {
      writeUserScoped(PENDING_COOKBOOK_KEY, pendingCookbookId);
    } else {
      removeUserScoped(PENDING_COOKBOOK_KEY);
    }
  }, [selectedRecipeId, pendingCookbookId]);

  useEffect(() => {
    if (!carouselApi) return;

    carouselApi.scrollTo(activeIndex, true);

    const onSelect = () => setActiveIndex(carouselApi.selectedScrollSnap());
    carouselApi.on("select", onSelect);

    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi, activeIndex]);

  useEffect(() => {
    if (!carouselApi || recipes.length === 0) return;
    if (requestedIndex != null) return;
    if (didAutoCenter.current) return;
    setActiveIndex(0);
    carouselApi.scrollTo(0, true);
    didAutoCenter.current = true;
  }, [carouselApi, recipes.length, requestedIndex]);

  useEffect(() => {
    if (!carouselApi || recipes.length === 0) return;
    if (requestedIndex == null) return;
    setActiveIndex(requestedIndex);
    carouselApi.scrollTo(requestedIndex, true);
    didAutoCenter.current = true;
  }, [carouselApi, recipes.length, requestedIndex]);

  useEffect(() => {
    didAutoCenter.current = false;
  }, [recipes.length]);

  const buildReturnTo = (index: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set("i", String(index));
    if (selectedRecipeId) {
      url.searchParams.set("selected", selectedRecipeId);
    }
    if (pendingCookbookId) {
      url.searchParams.set("pendingCookbook", pendingCookbookId);
    }
    if (scanSessionId) {
      url.searchParams.set("scanId", scanSessionId);
    }
    return encodeURIComponent(url.pathname + url.search);
  };


  const selectRecipe = (recipeId: string) => {
    if (selectedRecipeId && recipeId !== selectedRecipeId) {
      setPendingSwitchRecipeId(recipeId);
      setSwitchConfirmOpen(true);
      return;
    }
    setCookbookTargetRecipeId(recipeId);
    setCookbookPickerOpen(true);
  };

  const resetCreateState = () => {
    setCreateOpen(false);
    setCreateError(null);
    setNewName("");
    setNewColor(MOOD_COLORS[0]?.color ?? "#ff5a45");
  };

  const handlePickCookbook = (cookbookId: string) => {
    const recipeId = cookbookTargetRecipeId;
    if (!recipeId) return;
    setPendingCookbookId(cookbookId);
    setPendingRecipeId(recipeId);
    setSelectedCookbookId(cookbookId);
    setSelectedRecipeId(recipeId);
    setCookbookPickerOpen(false);
    setCookbookTargetRecipeId(null);
  };

  const canCommitSelection = Boolean(pendingRecipeId && pendingCookbookId);

  const openCompletionFlow = () => {
    if (!pendingRecipeId || !pendingCookbookId) return;

    const recipeTitle = recipes.find((r) => r.id === pendingRecipeId)?.title ?? "Recipe";
    const cookbookRawName = cookbooks.cookbooks.find((c) => c.id === pendingCookbookId)?.name ?? null;
    const cookbookName = formatCookbookDisplayName(cookbookRawName);

    setCompletionSummary({ recipeTitle, cookbookName });
    setShowCompletionFlow(true);
  };

  const finalizeSelectionAndGoToCookbooks = () => {
    if (!pendingRecipeId || !pendingCookbookId) {
      setShowCompletionFlow(false);
      setCompletionSummary(null);
      return;
    }

    cookbooks.saveRecipeToCookbook(pendingRecipeId, pendingCookbookId, { status: "skip" });
    setShowCompletionFlow(false);
    setCompletionSummary(null);

    setSelectedRecipeId(null);
    setSelectedCookbookId(null);
    clearPendingSelection();
    clearSelectedStorage();

    const url = new URL(window.location.href);
    url.searchParams.delete("selected");
    url.searchParams.delete("pendingCookbook");
    window.history.replaceState({}, "", url.pathname + url.search);
    setLocation(`/cookbooks/${pendingCookbookId}`);
  };

  const confirmLeave = () => {
    setIsLeaveConfirmOpen(false);
    clearPendingSelection();
    clearIdeaSession();
    setLocation("/camera");
  };

  const total = recipes.length;
  const safeActiveIndex = clamp(activeIndex, 0, Math.max(0, total - 1));

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="relative mx-auto min-h-screen w-full max-w-[430px] px-4 pb-24 pt-6">
        <div className="pt-12 px-2 pb-6">
          <div className="mb-6 flex items-center gap-3">
            <button
              data-testid="button-results-back"
              onClick={() => setIsLeaveConfirmOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[rgba(232,168,56,0.45)] bg-[linear-gradient(135deg,rgba(232,168,56,0.22),rgba(196,149,106,0.16))] px-4 text-[hsl(var(--ring))] shadow-[0_4px_16px_rgba(232,168,56,0.2)] transition-all hover:bg-[linear-gradient(135deg,rgba(232,168,56,0.28),rgba(196,149,106,0.22))] hover:shadow-[0_6px_20px_rgba(232,168,56,0.3)]"
              aria-label="Scan Again"
            >
              <Camera className="h-4 w-4" />
              <span className="font-heading text-[15px] font-bold">Scan Again</span>
            </button>
            <div
              data-testid="section-results-top-right"
              className="ml-auto text-[15px] font-medium text-[hsl(var(--foreground)/0.8)]"
            >
              {total > 0 ? `Idea ${safeActiveIndex + 1}/${total}` : ""}
            </div>
          </div>

          <div className="px-1">
            <div className="min-w-0">
              <h1 className={PAGE_TITLE_CLASS}>
                AI Recipe Ideas
              </h1>
              <p className={"mt-2 " + CAPTION_CLASS}>
                Based on your scanned ingredients
              </p>
            </div>

            {detectedIngredientNames.length ? (
              <div data-testid="row-results-ai-detected" className="relative mt-4" role="region" aria-label="Detected ingredients">
                <p className={"mb-2 " + EYEBROW_CLASS}>
                  Detected ingredients
                </p>
                <div className="rounded-2xl border border-[rgba(196,149,106,0.22)] bg-[linear-gradient(180deg,rgba(196,149,106,0.06)_0%,rgba(196,149,106,0.02)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <div className="flex flex-wrap items-center gap-2">
                    {detectedNamesVisible.map((name, idx) => (
                      <span
                        key={`${name}-${idx}`}
                        className="max-w-[160px] shrink-0 truncate rounded-full border border-[rgba(196,149,106,0.32)] bg-[rgba(27,21,18,0.9)] px-3 py-1.5 text-[13px] font-medium text-[rgba(250,243,234,0.92)] shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
                        title={name}
                      >
                        {name}
                      </span>
                    ))}
                    {hiddenDetectedCount > 0 ? (
                      <button
                        type="button"
                        data-testid="button-results-detected-show-more"
                        className="rounded-full border border-[rgba(196,149,106,0.34)] bg-[rgba(196,149,106,0.1)] px-3 py-1.5 text-[12px] font-semibold text-[hsl(var(--ring))] transition-colors hover:bg-[rgba(196,149,106,0.16)]"
                        onClick={() => setShowAllDetected(true)}
                      >
                        {EXPAND_COPY.showMore(hiddenDetectedCount)}
                      </button>
                    ) : null}
                    {showAllDetected && detectedIngredientNames.length > MAX_DETECTED_CHIPS_COLLAPSED ? (
                      <button
                        type="button"
                        data-testid="button-results-detected-show-less"
                        className="rounded-full border border-[rgba(196,149,106,0.22)] bg-[rgba(21,18,16,0.62)] px-3 py-1.5 text-[12px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[rgba(21,18,16,0.75)]"
                        onClick={() => setShowAllDetected(false)}
                      >
                        {EXPAND_COPY.showFewer}
                      </button>
                    ) : null}
                  </div>
                </div>
                {detectedIngredientNames.length < 5 && (
                  <p className="mt-1.5 text-[11px] text-[hsl(var(--muted-foreground)/0.9)]">
                    Scan again to add more ingredients for better matches.
                  </p>
                )}
              </div>
            ) : (
              <div
                data-testid="text-results-ai-detected-empty"
                className="mt-4 rounded-2xl border border-dashed border-[rgba(196,149,106,0.2)] bg-[rgba(196,149,106,0.03)] px-4 py-3"
              >
                <p className="text-[13px] text-[hsl(var(--muted-foreground))]">
                  No ingredients were confidently detected, so we&apos;re showing best-match ideas.
                </p>
                <p className="mt-2 text-[12px] font-medium text-[hsl(var(--ring))]">
                  Scan again for better matches.
                </p>
              </div>
            )}

            <div className="mt-5">
              {total === 0 ? (
                <div
                  data-testid="section-results-no-recipes"
                  className="rounded-2xl border border-[rgba(196,149,106,0.22)] bg-[rgba(196,149,106,0.04)] px-5 py-8 text-center"
                >
                  <p className="text-[15px] font-medium text-[hsl(var(--foreground))]">
                    No ideas match your dietary preferences
                  </p>
                  <p className="mt-2 text-[13px] text-[hsl(var(--muted-foreground))]">
                    Relax dietary filters or scan again to see more recipes.
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <Button
                      variant="outline"
                      className="rounded-xl border-[rgba(196,149,106,0.35)] bg-transparent text-[hsl(var(--foreground))] hover:bg-[rgba(196,149,106,0.12)]"
                      onClick={() => setLocation("/settings")}
                    >
                      Settings
                    </Button>
                    <Button
                      className="rounded-xl bg-[hsl(var(--ring))] text-[hsl(var(--primary-foreground))] hover:brightness-105"
                      onClick={() => { clearIdeaSession(); setLocation("/camera"); }}
                    >
                      Scan again
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                <Carousel
                  setApi={setCarouselApi}
                  opts={{ align: "start", containScroll: "trimSnaps" }}
                  className="w-full"
                >
                  <CarouselContent className="py-3">
                  {recipes.map((r, idx) => {
                    const distance = Math.abs(idx - safeActiveIndex);
                    const selectionActive = selectedRecipeId != null;
                    const dimmedNeighbor = selectionActive && distance > 0;
                    const scale = distance === 0 ? 1 : dimmedNeighbor ? 0.94 : 0.965;
                    const opacity = distance === 0 ? 1 : dimmedNeighbor ? 0.48 : 0.78;
                    const blur = distance === 0 ? "0px" : dimmedNeighbor ? "1.4px" : "0.6px";
                    const isActiveCard = idx === safeActiveIndex;
                    const isBestMatch = idx === 0;
                    const returnTo = buildReturnTo(idx);
                    const nutrition = estimateIdeaNutrition(r);
                    const heroSrc = r.image || "/images/recipe-pasta.png";
                    const difficultyLabel = r.difficulty ?? (r.tags?.[0] ?? "Easy");

                    return (
                      <CarouselItem key={r.id} className="basis-[90%] basis-[90%] basis-[90%]">
                        <motion.article
                          data-testid={`card-results-idea-${r.id}`}
                          animate={{ scale, opacity, filter: `blur(${blur})` }}
                          transition={{ type: "spring", stiffness: 240, damping: 24 }}
                          className={
                            "glass-card relative overflow-hidden rounded-[22px] border border-[rgba(196,149,106,0.22)] shadow-[0_20px_46px_rgba(0,0,0,0.45)] transition " +
                            (isActiveCard ? "cursor-pointer opacity-100" : "cursor-default pointer-events-none opacity-100")
                          }
                          onClick={() => {
                            if (!isActiveCard) return;
                            setLocation(`/recipe/${r.id}?from=results&i=${encodeURIComponent(String(idx))}&returnTo=${returnTo}`);
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (!isActiveCard) return;
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setLocation(`/recipe/${r.id}?from=results&i=${encodeURIComponent(String(idx))}&returnTo=${returnTo}`);
                            }
                          }}
                          aria-label={`Open ${r.title}`}
                        >
                          <div className="relative overflow-hidden rounded-t-2xl" style={{ height: HERO_HEIGHT_PX }}>
                            <img
                              src={heroSrc}
                              alt={r.title}
                              className="h-full w-full object-cover [filter:sepia(0.1)_saturate(1.08)_contrast(1.04)]"
                              onError={(event) => {
                                const target = event.currentTarget;
                                if (target.src.endsWith("/images/recipe-pasta.png")) return;
                                target.src = "/images/recipe-pasta.png";
                              }}
                            />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_42%,rgba(196,149,106,0.14),transparent_62%)]" />
                            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06)_14%,rgba(0,0,0,0.84)_100%)]" />

                            <div className="absolute bottom-4 left-4 right-4">
                              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(232,168,56,0.86)]">
                                CHEF&apos;S SELECTION
                              </p>
                              <p
                                data-testid={`text-results-card-title-${r.id}`}
                                className={HERO_TITLE_CLASS + " mt-1 [text-shadow:0_2px_12px_rgba(0,0,0,0.7)]"}
                              >
                                {r.title}
                              </p>
                              <p className={HERO_BLURB_CLASS + " mt-1"}>
                                {r.blurb}
                              </p>
                            </div>
                          </div>

                          <div className="px-4 pb-4 pt-5">
                            {/* Badges moved below image */}
                            <div className="flex items-center gap-2 flex-wrap mb-4">
                              {isBestMatch ? (
                                <span className="rounded-md border border-[rgba(196,149,106,0.38)] bg-[linear-gradient(140deg,rgba(232,168,56,0.24),rgba(196,149,106,0.14))] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ring))]">
                                  Best Match
                                </span>
                              ) : null}
                              <span
                                data-testid={isActiveCard ? "chip-results-time" : undefined}
                                className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(196,149,106,0.14)] bg-[rgba(21,18,16,0.66)] px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--foreground))]"
                              >
                                <Clock className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                                {r.minutes} min
                              </span>
                              <span
                                data-testid={isActiveCard ? "chip-results-difficulty" : undefined}
                                className="rounded-full border border-[rgba(196,149,106,0.14)] bg-[rgba(21,18,16,0.66)] px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--foreground))]"
                              >
                                {difficultyLabel}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="h-px flex-1 bg-white/10" />
                              <span className={DIVIDER_LABEL_CLASS}>
                                PER SERVING
                              </span>
                              <div className="h-px flex-1 bg-white/10" />
                            </div>

                            <div className="mt-4 flex items-start justify-around">
                              <div data-testid={isActiveCard ? "chip-results-calories" : undefined}>
                                <RecipeIdeaRing
                                  value={nutrition.calories}
                                  max={700}
                                  label="Calories"
                                  color={RING_COLORS.calories}
                                  unit="cal"
                                  delay={0.05}
                                />
                              </div>
                              <RecipeIdeaRing
                                value={nutrition.protein}
                                max={52}
                                label="Protein"
                                color={RING_COLORS.protein}
                                unit="g"
                                delay={0.12}
                              />
                              <RecipeIdeaRing
                                value={nutrition.fiber}
                                max={16}
                                label="Fiber"
                                color={RING_COLORS.fiber}
                                unit="g"
                                delay={0.2}
                              />
                            </div>

                            <div data-testid={`section-results-card-actions-${r.id}`} className="mt-5 space-y-2">
                              <Button
                                variant="outline"
                                data-testid={`button-results-card-choose-${r.id}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  selectRecipe(r.id);
                                }}
                                disabled={!isActiveCard}
                                className={
                                  "h-12 w-full rounded-xl border text-[15px] font-semibold transition-colors !shadow-none " +
                                  (!isActiveCard ? "opacity-50 cursor-not-allowed " : "") +
                                  (selectedRecipeId === r.id
                                    ? "!border-[rgba(232,168,56,0.68)] !bg-[linear-gradient(135deg,rgba(232,168,56,0.24),rgba(196,149,106,0.14))] !text-[hsl(var(--foreground))] hover:!bg-[linear-gradient(135deg,rgba(232,168,56,0.3),rgba(196,149,106,0.2))]"
                                    : "!border-[rgba(196,149,106,0.34)] !bg-transparent !text-[hsl(var(--ring))] hover:!bg-[rgba(196,149,106,0.11)]")
                                }
                              >
                                <Bookmark className="h-4 w-4" />
                                {selectedRecipeId === r.id ? "Change Cookbook" : "Select Cookbook"}
                              </Button>
                              {selectedRecipeId === r.id ? (
                                <div className="space-y-1">
                                  <div
                                    data-testid={`text-results-pending-${r.id}`}
                                    className="rounded-lg border border-[rgba(196,149,106,0.28)] bg-[rgba(196,149,106,0.07)] px-3 py-2.5 text-[12px] leading-snug text-[rgba(250,243,234,0.92)]"
                                  >
                                    Will add to{" "}
                                    <span
                                      className="inline-block max-w-[220px] align-bottom truncate font-semibold text-[hsl(var(--ring))]"
                                      title={pendingCookbookDisplay ?? "your cookbook"}
                                    >
                                      {pendingCookbookDisplayShort ?? "your cookbook"}
                                    </span>
                                    <span className="ml-1 text-[hsl(var(--muted-foreground))]">after you tap Save &amp; Open Cookbooks.</span>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </motion.article>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
              </Carousel>

              {selectedRecipeId ? (
                <div data-testid="section-results-pagination" className="mt-3 flex items-center justify-center">
                  <div data-testid="text-results-position" className="sr-only">
                    {activeIndex + 1} of {total}
                  </div>
                  <div data-testid="dots-results" className="hidden" />
                  <Button
                    data-testid="button-results-done"
                    onClick={openCompletionFlow}
                    disabled={!canCommitSelection}
                    className="h-10 min-w-[156px] rounded-full px-6 bg-[hsl(var(--ring))] text-[hsl(var(--primary-foreground))] hover:brightness-105 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Review Save
                  </Button>
                </div>
              ) : (
                <div data-testid="section-results-pagination" className="mt-5 flex items-center justify-center">
                  <div data-testid="text-results-position" className="sr-only">
                    {activeIndex + 1} of {total}
                  </div>
                  <div data-testid="dots-results" className="relative flex items-center justify-center gap-1.5">
                    {recipes.map((recipe, dotIdx) => {
                      const active = dotIdx === safeActiveIndex;
                      return (
                        <div
                          key={`dot-container-${recipe.id}`}
                          className="flex items-center justify-center"
                          style={{ width: '24px', minWidth: '24px' }}
                        >
                          <button
                            key={`dot-${recipe.id}`}
                            type="button"
                            aria-label={`Go to idea ${dotIdx + 1}`}
                            className={
                              "h-2.5 rounded-full border transition-all " +
                              (active
                                ? "w-6 border-[rgba(232,168,56,0.82)] bg-[rgba(232,168,56,0.85)]"
                                : "w-2.5 border-white/15 bg-white/20 hover:bg-white/35")
                            }
                            onClick={() => {
                              if (!carouselApi) return;
                              carouselApi.scrollTo(dotIdx, true);
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {cookbookPickerOpen ? (
          <>
            <motion.div
              data-testid="backdrop-results-cookbook-picker"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setCookbookPickerOpen(false);
                setCookbookTargetRecipeId(null);
              }}
              className="fixed inset-0 z-[70] glass-backdrop"
            />
            <motion.div
              data-testid="dialog-results-cookbook-picker"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="fixed left-1/2 top-1/2 z-[80] w-[calc(100vw-32px)] max-w-[430px] -translate-x-1/2 -translate-y-1/2"
            >
              <div className="glass-modal p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className={EYEBROW_CLASS}>
                      ADD TO COOKBOOK
                    </div>
                    <h3 className={"mt-1 " + MODAL_TITLE_CLASS + " text-white"}>
                      {targetRecipe ? targetRecipe.title : "Select a cookbook"}
                    </h3>
                    <p className={"mt-1 " + CAPTION_CLASS + " text-zinc-400"}>
                      Tap a cookbook to add this recipe.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCookbookPickerOpen(false);
                      setCookbookTargetRecipeId(null);
                    }}
                    className="w-10 h-10 shrink-0 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center"
                    aria-label="Close"
                  >
                    <span className="text-lg">×</span>
                  </button>
                </div>

                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    data-testid="button-results-cookbook-create-open"
                    className="glass-card sc-noise w-full rounded-3xl border border-white/5 p-4 text-left transition-colors hover:bg-white/10"
                    onClick={() => setCreateOpen(true)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className={SECTION_TITLE_SM_CLASS}>Create new cookbook</div>
                        <div className={"mt-0.5 " + CAPTION_CLASS}>
                          Organize by mood, goal, or week.
                        </div>
                      </div>
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[hsl(var(--ring)/0.12)] ring-1 ring-[hsl(var(--ring)/0.35)]">
                        <Sparkles className="h-4 w-4 text-[hsl(var(--ring))]" />
                      </div>
                    </div>
                  </button>

                  {cookbooks.cookbooks.map((c) => {
                    const count = cookbooks.getCookbookCount(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        data-testid={`button-results-cookbook-${c.id}`}
                        onClick={() => handlePickCookbook(c.id)}
                        className="glass-card sc-noise w-full rounded-3xl border border-white/5 p-4 text-left transition-colors hover:bg-white/10"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="grid h-10 w-10 place-items-center rounded-2xl ring-1 ring-[hsl(var(--border)/0.6)]"
                              style={{ backgroundColor: c.color ?? "rgba(255,255,255,0.06)" }}
                            >
                              <span className="text-sm">{c.emoji ?? "📚"}</span>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-white">{c.name}</div>
                              <div className="text-xs text-zinc-400">
                                {count} recipe{count === 1 ? "" : "s"}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-white/60" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {createOpen ? (
          <>
            <motion.div
              data-testid="backdrop-results-cookbook-create"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetCreateState}
              className="fixed inset-0 z-[90] glass-backdrop"
            />
            <motion.div
              data-testid="dialog-results-cookbook-create"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="fixed left-1/2 top-1/2 z-[100] w-[calc(100vw-32px)] max-w-[430px] -translate-x-1/2 -translate-y-1/2"
            >
              <div className="glass-modal p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className={MODAL_TITLE_CLASS + " text-white"}>New Cookbook</h3>
                  </div>
                  <button
                    type="button"
                    onClick={resetCreateState}
                    className="w-10 h-10 shrink-0 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center"
                    aria-label="Close"
                  >
                    <span className="text-lg">×</span>
                  </button>
                </div>

                <div className="mt-4 max-h-[70vh] overflow-auto">
                  <div className="space-y-5">
                    <label className="grid gap-2">
                      <div className="text-[10px] font-semibold tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                        NAME
                      </div>
                      <input
                        value={newName}
                        onChange={(e) => {
                          const next = e.target.value.slice(0, MAX_NAME_LENGTH);
                          setNewName(next);
                          setCreateError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          const name = normalizeName(newName);
                          const tooLong = name.length > MAX_NAME_LENGTH;
                          const dup = cookbooks.cookbooks.some(
                            (c) => c.id !== "saved" && normalizeName(c.name).toLowerCase() === name.toLowerCase(),
                          );
                          const valid = !!name && !tooLong && !dup;
                          if (!valid) return;
                          e.preventDefault();
                          const cb = cookbooks.createCookbook(name, { color: newColor });
                          resetCreateState();
                          handlePickCookbook(cb.id);
                        }}
                        placeholder="e.g. Summer Grilling, Keto Favorites..."
                        className={
                          "h-12 w-full rounded-2xl border px-4 text-sm outline-none transition-colors " +
                          (createError
                            ? "border-[hsl(var(--destructive)/0.7)] bg-[hsl(var(--background)/0.10)]"
                            : "border-[hsl(var(--border)/0.65)] bg-[hsl(var(--background)/0.10)] focus:border-[hsl(var(--ring)/0.55)]")
                        }
                      />
                      <div className="flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))]">
                        <span>Max {MAX_NAME_LENGTH} characters</span>
                        <span>
                          {newName.length}/{MAX_NAME_LENGTH}
                        </span>
                      </div>
                      {createError ? (
                        <div className="text-xs text-[hsl(var(--destructive))]">{createError}</div>
                      ) : null}
                    </label>

                    <div className="grid gap-2">
                      <div className="text-[10px] font-semibold tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                        MOOD COLOR
                      </div>
                      <div className="flex items-center gap-3">
                        {MOOD_COLORS.map((option) => {
                          const selected = option.color === newColor;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setNewColor(option.color)}
                              className={`h-12 w-12 rounded-full border-2 transition-transform ${
                                selected ? "border-white scale-105" : "border-transparent"
                              }`}
                              style={{ backgroundColor: option.color }}
                              aria-label={`Select ${option.id}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const name = normalizeName(newName);
                    const tooLong = name.length > MAX_NAME_LENGTH;
                    const dup = cookbooks.cookbooks.some(
                      (c) => c.id !== "saved" && normalizeName(c.name).toLowerCase() === name.toLowerCase(),
                    );
                    const canCreate = !!name && !tooLong && !dup;

                    return (
                      <div className="mt-5 grid gap-3">
                        <button
                          type="button"
                          className={
                            "h-12 rounded-2xl text-sm font-semibold transition-colors " +
                            (canCreate
                              ? "bg-white text-black hover:bg-zinc-200"
                              : "bg-white/20 text-white/50 cursor-not-allowed")
                          }
                          disabled={!canCreate}
                          onClick={() => {
                            if (!name) {
                              setCreateError("Name is required");
                              return;
                            }
                            if (tooLong) {
                              setCreateError(`Name must be ${MAX_NAME_LENGTH} characters or fewer`);
                              return;
                            }
                            if (dup) {
                              setCreateError(`You already have a cookbook named '${name}'`);
                              return;
                            }
                            const cb = cookbooks.createCookbook(name, { color: newColor });
                            resetCreateState();
                            handlePickCookbook(cb.id);
                          }}
                        >
                          Create Cookbook
                        </button>

                        <button
                          type="button"
                          className="h-12 rounded-2xl bg-white text-black font-semibold hover:bg-zinc-200 transition-colors"
                          onClick={resetCreateState}
                        >
                          Done
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AlertDialog open={isLeaveConfirmOpen} onOpenChange={setIsLeaveConfirmOpen}>
        <AlertDialogContent data-testid="dialog-leave-recipe-ideas" className="glass-modal">
          <AlertDialogHeader className="sr-only">
            <AlertDialogTitle>Leave recipe ideas?</AlertDialogTitle>
            <AlertDialogDescription>
              You’ll lose these results. Getting new ideas will use another scan (new photo + detection + ideas).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-leave-dialog-title" className="text-white font-heading font-bold">
              Leave recipe ideas?
            </AlertDialogTitle>
            <AlertDialogDescription data-testid="text-leave-dialog-message" className="text-zinc-300">
              You’ll lose these results. Getting new ideas will use another scan (new photo + detection + ideas).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              data-testid="button-leave-dialog-stay"
              className="rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white"
            >
              Stay
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-leave-dialog-leave"
              onClick={confirmLeave}
              className="rounded-2xl bg-white text-black hover:bg-zinc-200"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={switchConfirmOpen} onOpenChange={setSwitchConfirmOpen}>
        <AlertDialogContent data-testid="dialog-switch-recipe" className="glass-modal">
          <AlertDialogHeader className="sr-only">
            <AlertDialogTitle>Change your selection?</AlertDialogTitle>
            <AlertDialogDescription>
              You already chose a recipe. Switching will replace your current selection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-heading font-bold">
              Change your selection?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-300">
              You’ve already chosen a recipe. Switching will replace your current selection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              data-testid="button-switch-recipe-keep"
              className="rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white"
              onClick={() => {
                setPendingSwitchRecipeId(null);
              }}
            >
              Keep current
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-switch-recipe-confirm"
              className="rounded-2xl bg-white text-black hover:bg-zinc-200"
              onClick={() => {
                const next = pendingSwitchRecipeId;
                setSwitchConfirmOpen(false);
                setPendingSwitchRecipeId(null);
                clearPendingSelection();
                setSelectedRecipeId(null);
                setSelectedCookbookId(null);
                clearSelectedStorage();
                if (next) {
                  setCookbookTargetRecipeId(next);
                  setCookbookPickerOpen(true);
                }
              }}
            >
              Switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AnimatePresence>
        {showCompletionFlow ? (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[6px]" />
            <div className="relative w-[calc(100vw-32px)] max-w-[430px] max-h-[calc(100vh-40px)] overflow-y-auto rounded-3xl border border-[rgba(196,149,106,0.24)] bg-[rgba(20,16,14,0.9)] p-5 text-center shadow-[0_26px_80px_rgba(0,0,0,0.55)]">
              <button
                type="button"
                data-testid="button-completion-close"
                onClick={() => {
                  setShowCompletionFlow(false);
                  setCompletionSummary(null);
                }}
                className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <span className="text-lg leading-none">×</span>
              </button>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--ring))]"
              >
                Ready to save
              </motion.div>
              <motion.h3
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 }}
                className="mt-2 text-[34px] leading-[0.95] font-heading font-semibold text-white"
              >
                Save to cookbook?
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-2 text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]"
              >
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  {completionSummary?.recipeTitle ?? "Your recipe"}
                </span>{" "}
                will be added to{" "}
                <span className="font-semibold text-[hsl(var(--ring))]">
                  {completionSummary?.cookbookName ?? "your cookbook"}
                </span>
                {" "}when you continue.
              </motion.p>

              <div className="mt-5 grid gap-2.5">
                {[
                  {
                    label: "Open cookbook",
                    caption: completionSummary?.cookbookName ?? "Find it in your selected cookbook.",
                    Icon: BookOpen,
                    delay: 0.24,
                  },
                  {
                    label: "Start cooking",
                    caption: "Open the recipe card and cook step-by-step.",
                    Icon: ChefHat,
                    delay: 0.3,
                  },
                  {
                    label: "Track insights",
                    caption: "Mark the meal done to update progress and stats.",
                    Icon: BarChart3,
                    delay: 0.36,
                  },
                ].map((step) => (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: step.delay, duration: 0.35 }}
                    className="flex items-center gap-3 rounded-2xl border border-[rgba(196,149,106,0.2)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-left"
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-xl border border-[rgba(196,149,106,0.35)] bg-[hsl(var(--ring)/0.16)] text-[hsl(var(--ring))]">
                      <step.Icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-white">{step.label}</div>
                      <div className="text-[12px] leading-snug text-[hsl(var(--muted-foreground))]">{step.caption}</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-4 grid gap-2">
                <Button
                  data-testid="button-completion-done"
                  disabled={!canCommitSelection}
                  className="w-full rounded-2xl font-semibold bg-[hsl(var(--ring))] text-[hsl(var(--primary-foreground))] hover:brightness-105"
                  onClick={finalizeSelectionAndGoToCookbooks}
                >
                  Save &amp; Open Cookbooks
                </Button>
                <Button
                  type="button"
                  data-testid="button-completion-stay"
                  variant="outline"
                  className="w-full rounded-2xl border-[rgba(196,149,106,0.35)] bg-transparent text-[hsl(var(--foreground))] hover:bg-[rgba(196,149,106,0.12)]"
                  onClick={() => {
                    setShowCompletionFlow(false);
                    setCompletionSummary(null);
                  }}
                >
                  Keep Browsing Ideas
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
