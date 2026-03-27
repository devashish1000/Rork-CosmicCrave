import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  ArrowLeft,
  CalendarPlus,
  Check,
  Timer,
  Users,
  ChefHat,
  Layers,
  Lock,
  Minus,
  Plus,
  Info,
  Flame,
  Clock,
  Coffee,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import BottomNav from "@/components/app/bottom-nav";
import { Button } from "@/components/ui/button";
import { Lens } from "@/components/ui/lens";
import { toast } from "@/hooks/use-toast";
import { getRecipe } from "@/lib/recipes";
import { usePlan } from "@/lib/plan-store";
import { useShopping } from "@/lib/store";
import { useCookbooks } from "@/lib/cookbooks-store";
import { isRecipeCooked } from "@/lib/cooked-store";
import WeekPickerOverlay from "@/components/app/week-picker-overlay";
import SaveToCookbookSheet from "@/components/app/save-to-cookbook-sheet";
import { checkDietaryMatch, readDietaryPreferences } from "@/lib/dietary-preferences";
import {
  RING_COLORS,
  EXPAND_COPY,
  HERO_TITLE_CLASS,
  HERO_BLURB_CLASS,
  EYEBROW_CLASS,
  CAPTION_CLASS,
  CAPTION_XS_CLASS,
  CHIP_LABEL_CLASS,
  DIVIDER_LABEL_CLASS,
  SECTION_TITLE_CLASS,
  SECTION_TITLE_SM_CLASS,
} from "@/lib/design-tokens";

type NutritionEstimate = {
  protein: number;
  fat: number;
  carbs: number;
  calories: number;
};

const NUTRITION_OVERRIDES: Record<string, NutritionEstimate> = {
  s1: { protein: 26, fat: 16, carbs: 39, calories: 450 },
  s2: { protein: 22, fat: 14, carbs: 32, calories: 320 },
  s3: { protein: 12, fat: 8, carbs: 52, calories: 180 },
  r1: { protein: 20, fat: 12, carbs: 34, calories: 360 },
  r2: { protein: 42, fat: 18, carbs: 35, calories: 478 },
  r3: { protein: 16, fat: 22, carbs: 28, calories: 370 },
};
const INGREDIENTS_COLLAPSE_LIMIT = 12;
const STEPS_COLLAPSE_LIMIT = 10;
const STEP_DIFFICULTY_DOT_LIMIT = 8;

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
} as const satisfies Variants;

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
} as const satisfies Variants;

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

function Glass({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={"glass-card sc-noise relative overflow-hidden border border-white/[0.08] backdrop-blur-xl " + (className ?? "")}
      style={style}
    >
      {children}
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (m) => m.toUpperCase());
}

function parseCalories(value?: string) {
  if (!value) return 0;
  const matched = value.match(/\d+/g);
  if (!matched?.length) return 0;
  const merged = Number(matched.join(""));
  return Number.isFinite(merged) ? merged : 0;
}

function parseLeadingAmount(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)/);
  if (!match) return null;
  const token = match[0];
  const parts = token.split(" ");

  const parseFraction = (fraction: string) => {
    const [num, den] = fraction.split("/");
    const n = Number(num);
    const d = Number(den);
    if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
    return n / d;
  };

  let amount = 0;
  if (parts.length === 2) {
    const whole = Number(parts[0]);
    const frac = parseFraction(parts[1]);
    if (!Number.isFinite(whole) || frac == null) return null;
    amount = whole + frac;
  } else if (token.includes("/")) {
    const frac = parseFraction(token);
    if (frac == null) return null;
    amount = frac;
  } else {
    const parsed = Number(token);
    if (!Number.isFinite(parsed)) return null;
    amount = parsed;
  }

  return { token, amount };
}

function formatScaledAmount(value: number) {
  const rounded = Math.round(value * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 0.001) return String(Math.round(rounded));
  if (Math.abs(rounded * 2 - Math.round(rounded * 2)) < 0.001) return rounded.toFixed(1);
  return rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function NutritionRing({
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

function scaleIngredientQty(qty: string, scale: number) {
  if (scale === 1) return qty;
  const parsed = parseLeadingAmount(qty);
  if (!parsed) return qty;
  const scaled = parsed.amount * scale;
  return qty.replace(parsed.token, formatScaledAmount(scaled));
}

function estimateNutrition(recipe: NonNullable<ReturnType<typeof getRecipe>>): NutritionEstimate {
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

export default function RecipeDetailPage({ params }: { params: { id: string } }) {
  const [location, navigate] = useLocation();
  const recipe = getRecipe(params.id);
  const plan = usePlan();
  const shopping = useShopping();
  const cookbooks = useCookbooks();

  const [addPlanOpen, setAddPlanOpen] = useState(false);
  const [saveToCookbookOpen, setSaveToCookbookOpen] = useState(false);
  const [heroLensActive, setHeroLensActive] = useState(false);
  const [servings, setServings] = useState(recipe?.servings ?? 2);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(() => new Set());
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [activeTab, setActiveTab] = useState<"ingredients" | "steps" | "tips">("ingredients");
  const [previousTab, setPreviousTab] = useState<"ingredients" | "steps" | "tips">("ingredients");
  const [nutritionView, setNutritionView] = useState<"quick" | "full">("quick");
  const [justAdded, setJustAdded] = useState(false);

  const isSavedInAnyCookbook = useMemo(() => {
    if (!recipe) return false;
    return cookbooks.cookbooks.some((book) =>
      cookbooks.isRecipeSavedInCookbook(recipe.id, book.id),
    );
  }, [cookbooks.cookbooks, cookbooks.isRecipeSavedInCookbook, recipe]);

  const isResultsPreviewMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("from") === "results";
  }, [location]);

  const showCommitOnlyActions = useMemo(
    () => !!recipe && !isResultsPreviewMode && isSavedInAnyCookbook,
    [isSavedInAnyCookbook, isResultsPreviewMode, recipe],
  );

  // Keep tabs visible, but lock tab content for every visit from AI results.
  const shouldLockTabs = useMemo(() => isResultsPreviewMode, [isResultsPreviewMode]);

  const activeTabLabel =
    activeTab === "ingredients" ? "Ingredients" : activeTab === "steps" ? "Steps" : "Tips";
  const lockedTabTeaser =
    activeTab === "ingredients"
      ? "See the full ingredient list and exact quantities after you save this recipe."
      : activeTab === "steps"
        ? "Unlock step-by-step instructions with timers and completion tracking after saving."
        : "Unlock chef tips and timing guidance for better results after saving.";

  // Check if recipe was just added to cookbook
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("justAdded") === "1" && isSavedInAnyCookbook) {
      setJustAdded(true);
      // Remove the parameter from URL after showing celebration
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("justAdded");
      window.history.replaceState({}, "", newUrl.toString());
      // Clear the flag after celebration duration
      const timer = setTimeout(() => {
        setJustAdded(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location, isSavedInAnyCookbook]);


  const cuisineLabel = useMemo(() => {
    if (!recipe) return "Signature";
    return recipe.cuisine ?? recipe.tags?.[0] ?? "Signature";
  }, [recipe]);

  // Check dietary compliance
  const dietaryMatch = useMemo(() => {
    if (!recipe) return null;
    const prefs = readDietaryPreferences();
    return checkDietaryMatch(recipe, prefs);
  }, [recipe]);

  // Determine slide direction based on tab order
  // Returns: -1 for left (forward), 1 for right (backward)
  const slideDirection = useMemo(() => {
    const tabOrder = { ingredients: 0, steps: 1, tips: 2 };
    return tabOrder[activeTab] > tabOrder[previousTab] ? -1 : 1;
  }, [previousTab, activeTab]);

  const timeBreakdown = useMemo(() => {
    if (!recipe) return { prep: 0, cook: 0, rest: 0 };
    const rest = recipe.minutes >= 14 ? clamp(Math.round(recipe.minutes * 0.1), 1, 6) : 0;
    const prep = clamp(Math.round(recipe.minutes * 0.2), 2, Math.max(2, recipe.minutes - rest - 1));
    const cook = Math.max(1, recipe.minutes - prep - rest);
    return { prep, cook, rest };
  }, [recipe]);

  const stepCount = recipe?.steps?.length ?? 0;

  const trickySteps = useMemo(() => {
    if (!recipe || !stepCount) return [] as number[];
    const weighted = recipe.steps.map((step, idx) => {
      const text = step.text.toLowerCase();
      let score = 0;
      if (step.timerSeconds && step.timerSeconds >= 120) score += 2;
      if (/(simmer|reduce|sear|saute|fry|boil|bake|roast|caramel)/.test(text)) score += 1;
      if (idx > 0 && idx < recipe.steps.length - 1) score += 0.4;
      return { step: idx + 1, score };
    });
    const selected = weighted
      .sort((a, b) => b.score - a.score)
      .filter((x) => x.score > 0)
      .slice(0, Math.min(2, stepCount))
      .map((x) => x.step)
      .sort((a, b) => a - b);
    if (selected.length > 0) return selected;
    return [Math.max(1, Math.ceil(stepCount / 2))];
  }, [recipe, stepCount]);

  const trickyStepsSummary = useMemo(() => {
    if (!trickySteps.length) return "";
    if (trickySteps.length === 1) return `Step ${trickySteps[0]} requires attention`;
    if (trickySteps.length === 2) return `Steps ${trickySteps[0]} & ${trickySteps[1]} need focus`;
    const last = trickySteps[trickySteps.length - 1];
    const leading = trickySteps.slice(0, -1).join(", ");
    return `Steps ${leading}, & ${last} need focus`;
  }, [trickySteps]);

  const flavorGroups = useMemo(() => {
    if (!recipe) return { garnishes: [], mains: [], seasonings: [] };
    const names = recipe.ingredients.map((i) => i.name.toLowerCase());
    const garnishKeywords = [
      "basil",
      "parsley",
      "cilantro",
      "mint",
      "chives",
      "dill",
      "salt",
      "pepper",
      "lemon",
      "lime",
      "zest",
    ];
    const garnishes = names.filter((n) => garnishKeywords.some((k) => n.includes(k)));
    const remaining = names.filter((n) => !garnishes.includes(n));
    const mains = remaining.slice(0, 2);
    const seasonings = remaining.slice(2, 5);
    return { garnishes, mains, seasonings };
  }, [recipe]);

  const cookedLabel = useMemo(() => {
    if (!recipe) return "Start Cooking";
    return isRecipeCooked(recipe.id) ? "Cook Again" : "Start Cooking";
  }, [recipe]);

  const scaledIngredients = useMemo(() => {
    if (!recipe) return [];
    const scale = servings / recipe.servings;

    return recipe.ingredients.map((ing) => {
      return {
        ...ing,
        qty: scaleIngredientQty(ing.qty, scale),
      };
    });
  }, [recipe, servings]);

  const visibleIngredients = useMemo(
    () =>
      showAllIngredients
        ? scaledIngredients
        : scaledIngredients.slice(0, INGREDIENTS_COLLAPSE_LIMIT),
    [scaledIngredients, showAllIngredients],
  );

  const hiddenIngredientsCount = Math.max(0, scaledIngredients.length - visibleIngredients.length);

  const visibleSteps = useMemo(
    () =>
      showAllSteps
        ? recipe?.steps ?? []
        : (recipe?.steps ?? []).slice(0, STEPS_COLLAPSE_LIMIT),
    [recipe?.steps, showAllSteps],
  );

  const hiddenStepsCount = Math.max(0, (recipe?.steps.length ?? 0) - visibleSteps.length);

  const scaledNutrition = useMemo(() => {
    if (!recipe) return null;
    const nutrition = estimateNutrition(recipe);
    const scale = servings / recipe.servings;
    // Estimate fiber based on ingredients (similar to recipe-ideas page)
    const fiber = Math.max(3, Math.round((recipe.ingredients?.length ?? 0) * 0.9 * scale));
    return {
      protein: Math.max(0, Math.round(nutrition.protein * scale)),
      fat: Math.max(0, Math.round(nutrition.fat * scale)),
      carbs: Math.max(0, Math.round(nutrition.carbs * scale)),
      calories: Math.max(0, Math.round(nutrition.calories * scale)),
      fiber: Math.max(0, fiber),
    };
  }, [recipe, servings]);

  const macroSplit = useMemo(() => {
    if (!scaledNutrition) return { protein: 0, fat: 0, carbs: 0 };
    const proteinCalories = scaledNutrition.protein * 4;
    const fatCalories = scaledNutrition.fat * 9;
    const carbCalories = scaledNutrition.carbs * 4;
    const total = proteinCalories + fatCalories + carbCalories;
    if (total <= 0) return { protein: 0, fat: 0, carbs: 0 };
    const protein = Math.round((proteinCalories / total) * 100);
    const fat = Math.round((fatCalories / total) * 100);
    const carbs = Math.max(0, 100 - protein - fat);
    return { protein, fat, carbs };
  }, [scaledNutrition]);

  const ingredientInShoppingList = (ingredientName: string) =>
    shopping.items.some((item) => item.name.trim().toLowerCase() === ingredientName.trim().toLowerCase());

  const inListCount = scaledIngredients.filter((ing) => ingredientInShoppingList(ing.name)).length;
  const allIngredientsAdded = scaledIngredients.length > 0 && inListCount === scaledIngredients.length;

  const jumpToIdeasForSave = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const returnTo = searchParams.get("returnTo");
    const returnIndex = searchParams.get("i");
    if (returnTo) {
      const decoded = decodeURIComponent(returnTo);
      if (returnIndex && !decoded.includes("i=")) {
        const url = new URL(decoded, window.location.origin);
        url.searchParams.set("i", returnIndex);
        navigate(url.pathname + url.search);
        return;
      }
      navigate(decoded);
      return;
    }
    const ideasIndex = searchParams.get("i");
    navigate(ideasIndex ? `/ideas?i=${encodeURIComponent(ideasIndex)}` : "/ideas");
  };

  const addAllToList = () => {
    const names = scaledIngredients.map((i) => i.name);
    const res = shopping.addMany(names, { source: "recipe", recipeId: recipe!.id });
    toast({
      title: "✓ Added to shopping list",
      description: `${res.added.length} items added${res.already.length ? ` · ${res.already.length} already in list` : ""}`,
    });
  };

  useEffect(() => {
    setShowAllIngredients(false);
    setShowAllSteps(false);
  }, [recipe?.id]);

  if (!recipe) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground">
        <div className="mx-auto min-h-screen w-full max-w-[430px] px-5 py-12">
          <Glass className="rounded-3xl p-6">
            <div className={SECTION_TITLE_CLASS} data-testid="text-recipe-missing">
              Recipe not found
            </div>
            <Button
              data-testid="button-recipe-missing-home"
              className="mt-6 w-full rounded-2xl"
              onClick={() => navigate("/home")}
            >
              Back to Home
            </Button>
          </Glass>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="relative mx-auto min-h-screen w-full max-w-[430px] px-5 pb-32 pt-4">
        {/* Background Orbs */}
        <Orb className="-left-12 top-10 h-64 w-64 bg-[hsl(var(--ring)/0.45)]" />
        <Orb className="-right-16 top-52 h-80 w-80 bg-[hsl(195_90%_55%/0.24)]" />
        <Orb className="left-8 bottom-16 h-72 w-72 bg-[hsl(275_80%_65%/0.15)]" />

        {/* Header */}
        <motion.header
          className="relative z-30 mb-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            type="button"
            data-testid="button-recipe-back"
            onClick={() => {
              const searchParams = new URLSearchParams(window.location.search);
              const returnTo = searchParams.get("returnTo");
              const returnIndex = searchParams.get("i");
              if (returnTo) {
                const decoded = decodeURIComponent(returnTo);
                if (returnIndex && !decoded.includes("i=")) {
                  const url = new URL(decoded, window.location.origin);
                  url.searchParams.set("i", returnIndex);
                  navigate(url.pathname + url.search);
                  return;
                }
                navigate(decoded);
                return;
              }
              if (window.history.length > 1) {
                window.history.back();
                return;
              }
              navigate("/home");
            }}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-[hsl(var(--card)/0.4)] backdrop-blur-xl transition-all hover:bg-[hsl(var(--card)/0.55)] active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
        </motion.header>

        <motion.main
          className="relative z-10 space-y-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Hero Image */}
          <motion.div variants={itemVariants} className="relative h-[240px] w-full overflow-hidden rounded-[2rem] shadow-2xl">
            <Lens
              src={recipe.image || "/images/recipe-pasta.png"}
              alt={recipe.title}
              zoomFactor={2.1}
              lensSize={200}
              className="h-full w-full"
              imgClassName="h-full w-full object-cover"
              onActiveChange={setHeroLensActive}
            />
            <div className="absolute inset-0 opacity-30 mix-blend-soft-light" style={{ backgroundImage: recipe.heroGradient }} />
            <div
              className={
                "absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent transition-opacity duration-300 " +
                (heroLensActive ? "opacity-40" : "opacity-100")
              }
            />

            {/* Hero Content */}
            <div
              className={
                "absolute bottom-5 left-5 right-5 transition-opacity duration-200 " +
                (heroLensActive ? "opacity-0" : "opacity-100")
              }
            >
              <div className="flex items-center gap-2 flex-wrap">
                <div className={"inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--ring)/0.4)] bg-[hsl(var(--ring)/0.2)] px-2.5 py-1 " + CHIP_LABEL_CLASS + " text-white backdrop-blur-md"}>
                  <ChefHat className="h-3 w-3" />
                  {cuisineLabel}
                </div>
                {/* Dietary Compliance Indicators */}
                {dietaryMatch && (
                  <>
                    {dietaryMatch.matches ? (
                      <div className={"inline-flex items-center gap-1.5 rounded-full border border-green-500/40 bg-green-500/20 px-2.5 py-1 " + CHIP_LABEL_CLASS + " text-green-300 backdrop-blur-md"}>
                        <Check className="h-3 w-3" />
                        Matches Your Diet
                      </div>
                    ) : (
                      <>
                        {!dietaryMatch.dietTypeMatch && (
                          <div className={"inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 " + CHIP_LABEL_CLASS + " text-amber-300 backdrop-blur-md"}>
                            <AlertTriangle className="h-3 w-3" />
                            Diet Mismatch
                          </div>
                        )}
                        {!dietaryMatch.allergenFree && dietaryMatch.foundAllergens && (
                          <div className={"inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/20 px-2.5 py-1 " + CHIP_LABEL_CLASS + " text-red-300 backdrop-blur-md"}>
                            <XCircle className="h-3 w-3" />
                            Contains Allergen
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
              <h1 className={HERO_TITLE_CLASS + " mt-2 text-white"} data-testid="text-recipe-title">
                {recipe.title}
              </h1>
              <p className={HERO_BLURB_CLASS + " mt-1.5 text-white/90"} data-testid="text-recipe-blurb">
                {recipe.blurb}
              </p>
            </div>
          </motion.div>

          {/* Add to Meal Plan Button (only shown when unlocked) */}
          {showCommitOnlyActions && (
            <motion.div variants={itemVariants}>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full rounded-xl border-white/10 bg-[hsl(var(--background)/0.25)] text-[13px] font-semibold backdrop-blur-sm hover:bg-[hsl(var(--background)/0.35)]"
                onClick={() => setAddPlanOpen(true)}
              >
                <CalendarPlus className="h-4 w-4" />
                Add to Meal Plan
              </Button>
            </motion.div>
          )}

          {/* Nutrition Section */}
          {scaledNutrition && (
            <motion.section variants={itemVariants} role="region" aria-label="Nutrition facts">
              <Glass className="rounded-2xl p-4">
                {/* Header with Toggle */}
                <div className="mb-4 flex items-center justify-between">
                  <h2 className={SECTION_TITLE_SM_CLASS}>Nutrition Facts</h2>
                  <div className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-[hsl(var(--background)/0.35)] p-0.5 backdrop-blur-md">
                    <button
                      type="button"
                      onClick={() => setNutritionView("quick")}
                    className={"relative z-10 rounded-full px-3 py-1 " + CHIP_LABEL_CLASS + " transition-colors " + (nutritionView === "quick" ? "text-white" : "text-muted-foreground hover:text-foreground")}
                    >
                      {nutritionView === "quick" && (
                        <motion.div
                          layoutId="nutritionToggle"
                          className="absolute inset-0 rounded-full bg-gradient-to-r from-[hsl(var(--ring)/0.95)] to-[hsl(var(--ring)/0.85)] shadow-[0_4px_12px_rgba(255,178,102,0.4)]"
                          transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10">Quick</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNutritionView("full")}
                    className={"relative z-10 rounded-full px-3 py-1 " + CHIP_LABEL_CLASS + " transition-colors " + (nutritionView === "full" ? "text-white" : "text-muted-foreground hover:text-foreground")}
                    >
                      {nutritionView === "full" && (
                        <motion.div
                          layoutId="nutritionToggle"
                          className="absolute inset-0 rounded-full bg-gradient-to-r from-[hsl(var(--ring)/0.95)] to-[hsl(var(--ring)/0.85)] shadow-[0_4px_12px_rgba(255,178,102,0.4)]"
                          transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10">Full</span>
                    </button>
                  </div>
                </div>

                {/* Quick View - 3 Circular Gauges */}
                <AnimatePresence mode="wait">
                  {nutritionView === "quick" && (
                    <motion.div
                      key="quick"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
                      className="flex items-center justify-center gap-4"
                    >
                      {/* Calories */}
                      <NutritionRing
                        value={scaledNutrition.calories}
                        max={700}
                        label="Calories"
                        color={RING_COLORS.calories}
                        unit="cal"
                        delay={0.1}
                      />
                      {/* Protein */}
                      <NutritionRing
                        value={scaledNutrition.protein}
                        max={52}
                        label="Protein"
                        color={RING_COLORS.protein}
                        unit="g"
                        delay={0.2}
                      />
                      {/* Fiber */}
                      <NutritionRing
                        value={scaledNutrition.fiber}
                        max={16}
                        label="Fiber"
                        color={RING_COLORS.fiber}
                        unit="g"
                        delay={0.3}
                      />
                    </motion.div>
                  )}

                  {/* Full View - All Metrics Grid */}
                  {nutritionView === "full" && (
                    <motion.div
                      key="full"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
                      className="space-y-3"
                    >
                        {/* Calories - Large Display */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 25 }}
                          className="rounded-xl border border-[hsl(var(--ring)/0.35)] bg-gradient-to-br from-[hsl(var(--ring)/0.12)] to-[hsl(var(--ring)/0.04)] p-3 text-center backdrop-blur-sm"
                        >
                          <div className="font-mono text-[28px] font-bold leading-none tracking-tight text-[hsl(var(--ring))]">
                            {scaledNutrition.calories}
                            <span className={"ml-1 " + CAPTION_XS_CLASS}>kcal</span>
                          </div>
                          <div className={"mt-1.5 " + DIVIDER_LABEL_CLASS + " text-[hsl(var(--ring))]"}>
                            Calories
                          </div>
                        </motion.div>

                        {/* Macro Grid - 3 columns */}
                        <div className="grid grid-cols-3 gap-2.5">
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 25 }}
                            className="rounded-xl border border-[hsl(164_50%_57%/0.35)] bg-gradient-to-br from-[hsl(164_50%_57%/0.12)] to-[hsl(164_50%_57%/0.04)] p-3 text-center backdrop-blur-sm"
                          >
                            <div className="font-mono text-[22px] font-bold leading-none tracking-tight">
                              {scaledNutrition.protein}
                              <span className={"ml-1 " + CAPTION_XS_CLASS}>g</span>
                            </div>
                            <div className={"mt-1.5 " + DIVIDER_LABEL_CLASS + " text-[hsl(164_50%_57%)]"}>
                              Protein
                            </div>
                          </motion.div>

                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 25 }}
                            className="rounded-xl border border-[hsl(39_54%_62%/0.35)] bg-gradient-to-br from-[hsl(39_54%_62%/0.12)] to-[hsl(39_54%_62%/0.04)] p-3 text-center backdrop-blur-sm"
                          >
                            <div className="font-mono text-[22px] font-bold leading-none tracking-tight">
                              {scaledNutrition.fat}
                              <span className={"ml-1 " + CAPTION_XS_CLASS}>g</span>
                            </div>
                            <div className={"mt-1.5 " + DIVIDER_LABEL_CLASS + " text-[hsl(39_54%_62%)]"}>
                              Fat
                            </div>
                          </motion.div>

                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 25 }}
                            className="rounded-xl border border-[hsl(79_33%_58%/0.35)] bg-gradient-to-br from-[hsl(79_33%_58%/0.12)] to-[hsl(79_33%_58%/0.04)] p-3 text-center backdrop-blur-sm"
                          >
                            <div className="font-mono text-[22px] font-bold leading-none tracking-tight">
                              {scaledNutrition.carbs}
                              <span className={"ml-1 " + CAPTION_XS_CLASS}>g</span>
                            </div>
                            <div className={"mt-1.5 " + DIVIDER_LABEL_CLASS + " text-[hsl(79_33%_58%)]"}>
                              Carbs
                            </div>
                          </motion.div>
                        </div>

                        {/* Fiber */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 25 }}
                          className="rounded-xl border border-[hsl(280_50%_65%/0.35)] bg-gradient-to-br from-[hsl(280_50%_65%/0.12)] to-[hsl(280_50%_65%/0.04)] p-3 text-center backdrop-blur-sm"
                        >
                          <div className="font-mono text-[22px] font-bold leading-none tracking-tight">
                            {scaledNutrition.fiber}
                            <span className={"ml-1 " + CAPTION_XS_CLASS}>g</span>
                          </div>
                          <div className={"mt-1.5 " + DIVIDER_LABEL_CLASS + " text-[hsl(280_50%_65%)]"}>
                            Fiber
                          </div>
                        </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className={"mt-3 text-center " + CAPTION_XS_CLASS + " text-muted-foreground/80"}>
                  AI-estimated values. Not medical or dietary advice.
                </p>
              </Glass>
            </motion.section>
          )}

          {/* Start Cooking Button */}
          {showCommitOnlyActions && (
            <motion.div variants={itemVariants}>
              <Button
                data-testid="button-recipe-start-cooking"
                size="lg"
                className="h-12 w-full rounded-xl bg-gradient-to-r from-[hsl(var(--ring)/0.9)] to-[hsl(var(--ring)/0.75)] text-[15px] font-bold shadow-[0_8px_24px_rgba(255,178,102,0.35)] transition-all hover:shadow-[0_12px_32px_rgba(255,178,102,0.45)] active:scale-[0.98]"
                onClick={() => {
                  const cookAgain = isRecipeCooked(recipe.id) ? "1" : "0";
                  navigate(`/cook/${recipe.id}?s=${servings}&cookAgain=${cookAgain}`);
                }}
              >
                <ChefHat className="h-4.5 w-4.5" />
                {cookedLabel}
              </Button>
            </motion.div>
          )}

          {/* Ingredients/Steps Combined */}
          <motion.section variants={itemVariants} id="ingredients" role="region" aria-label="Ingredients and steps">
            <Glass className="overflow-hidden rounded-2xl">
              {/* Tab Header */}
                  <div className="flex items-center justify-between border-b border-white/8 bg-[hsl(var(--card)/0.25)] px-4 py-3 backdrop-blur-sm">
                    {/* Tabs */}
                    <div className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-[hsl(var(--background)/0.35)] p-0.5 backdrop-blur-md">
                  <motion.button
                    type="button"
                    onClick={() => {
                      setPreviousTab(activeTab);
                      setActiveTab("ingredients");
                    }}
                    className={"relative z-10 rounded-full px-4 py-1.5 " + CAPTION_XS_CLASS + " font-bold transition-colors " + (activeTab === "ingredients" ? "text-white" : "text-muted-foreground hover:text-foreground")}
                    data-testid="tab-ingredients"
                  >
                    {activeTab === "ingredients" && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-[hsl(var(--ring)/0.95)] to-[hsl(var(--ring)/0.85)] shadow-[0_4px_12px_rgba(255,178,102,0.4)]"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">Ingredients ({scaledIngredients.length})</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => {
                      setPreviousTab(activeTab);
                      setActiveTab("steps");
                    }}
                    className={"relative z-10 rounded-full px-4 py-1.5 " + CAPTION_XS_CLASS + " font-bold transition-colors " + (activeTab === "steps" ? "text-white" : "text-muted-foreground hover:text-foreground")}
                    data-testid="tab-steps"
                  >
                    {activeTab === "steps" && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-[hsl(var(--ring)/0.95)] to-[hsl(var(--ring)/0.85)] shadow-[0_4px_12px_rgba(255,178,102,0.4)]"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">Steps ({recipe.steps.length})</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => {
                      setPreviousTab(activeTab);
                      setActiveTab("tips");
                    }}
                    className={"relative z-10 rounded-full px-4 py-1.5 " + CAPTION_XS_CLASS + " font-bold transition-colors " + (activeTab === "tips" ? "text-white" : "text-muted-foreground hover:text-foreground")}
                    data-testid="tab-tips"
                  >
                    {activeTab === "tips" && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-[hsl(var(--ring)/0.95)] to-[hsl(var(--ring)/0.85)] shadow-[0_4px_12px_rgba(255,178,102,0.4)]"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">Tips</span>
                  </motion.button>
                </div>

                {/* Context Action */}
                {activeTab === "ingredients" && showCommitOnlyActions ? (
                  <button
                    className={CAPTION_XS_CLASS + " font-bold text-[hsl(var(--ring))] transition-opacity hover:underline disabled:opacity-40 disabled:no-underline"}
                    disabled={allIngredientsAdded}
                    onClick={addAllToList}
                  >
                    {allIngredientsAdded ? "✓ All added" : "Add all"}
                  </button>
                ) : null}

                {activeTab === "steps" && (
                  <div className="text-[11px] font-bold text-muted-foreground">
                    {showCommitOnlyActions ? `${completedSteps.size}/${recipe.steps.length}` : "Locked"}
                  </div>
                )}
                {activeTab === "tips" && (
                  <div className="text-[11px] font-bold text-muted-foreground">
                    Cooking guide
                  </div>
                )}
              </div>

              {/* Tab Content */}
              <motion.div layout className="relative overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  {shouldLockTabs ? (
                    <motion.div
                      key={`locked-${activeTab}`}
                      layout
                      initial={{ opacity: 0, x: slideDirection * 24, filter: "blur(4px)" }}
                      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, x: slideDirection * -24, filter: "blur(4px)" }}
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 28,
                        opacity: { duration: 0.18 },
                        layout: { type: "spring", stiffness: 400, damping: 30 },
                      }}
                      className="p-4"
                      data-testid="panel-recipe-locked-preview"
                    >
                      <div className="rounded-2xl border border-[hsl(var(--ring)/0.28)] bg-[hsl(var(--background)/0.35)] p-4 backdrop-blur-sm">
                        <div className={"inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--ring)/0.32)] bg-[hsl(var(--ring)/0.14)] px-2.5 py-1 " + CHIP_LABEL_CLASS + " text-[hsl(var(--ring))]"}>
                          <Lock className="h-3 w-3" />
                          {activeTabLabel} Preview
                        </div>
                        <h3 className="mt-3 text-[15px] font-bold text-white">
                          Unlock full {activeTabLabel.toLowerCase()}
                        </h3>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                          {lockedTabTeaser}
                        </p>
                        <motion.button
                          type="button"
                          onClick={() => {
                            if (isResultsPreviewMode) {
                              jumpToIdeasForSave();
                            } else {
                              setSaveToCookbookOpen(true);
                            }
                          }}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          className={"mt-4 inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--ring)/0.45)] bg-[hsl(var(--ring)/0.2)] px-3.5 py-2 " + CAPTION_XS_CLASS + " font-bold text-[hsl(var(--ring))] transition-colors hover:bg-[hsl(var(--ring)/0.28)]"}
                        >
                          <ChefHat className="h-3.5 w-3.5" />
                          {isResultsPreviewMode ? "Back to Recipe Ideas" : "Add to Cookbook to Unlock"}
                        </motion.button>
                      </div>
                    </motion.div>
                  ) : null}

                  {!shouldLockTabs && activeTab === "ingredients" && (
                    <motion.div
                      key="ingredients"
                      layout
                      initial={{ opacity: 0, x: slideDirection * 24, filter: "blur(6px)" }}
                      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, x: slideDirection * -24, filter: "blur(6px)" }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 350, 
                        damping: 28,
                        opacity: { duration: 0.18 },
                        layout: { type: "spring", stiffness: 400, damping: 30 }
                      }}
                      className="p-2.5"
                    >
                    <div className="space-y-1">
                      {visibleIngredients.map((ing, idx) => (
                        <motion.div
                          key={`${ing.name}-${idx}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03, duration: 0.3 }}
                          className="group flex items-center justify-between rounded-xl p-3.5 transition-colors hover:bg-[hsl(var(--card)/0.45)]"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className={"grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-[hsl(var(--background)/0.35)] " + CAPTION_XS_CLASS + " font-bold backdrop-blur-sm"}>
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="break-words text-[15px] font-semibold leading-snug" data-testid={`text-ingredient-name-${ing.name}`}>
                                {ing.name}
                              </div>
                              <div className="break-words text-[13px] text-muted-foreground" data-testid={`text-ingredient-qty-${ing.name}`}>
                                {ing.qty}
                              </div>
                            </div>
                          </div>

                          {showCommitOnlyActions ? (
                            <button
                              disabled={ingredientInShoppingList(ing.name)}
                              className={
                                "grid h-9 w-9 place-items-center rounded-xl border transition-all " +
                                (ingredientInShoppingList(ing.name)
                                  ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
                                  : "border-white/12 bg-[hsl(var(--background)/0.25)] text-muted-foreground hover:bg-[hsl(var(--ring)/0.15)] hover:text-[hsl(var(--ring))] hover:border-[hsl(var(--ring)/0.5)] active:scale-95")
                              }
                              onClick={() => {
                                if (ingredientInShoppingList(ing.name)) return;
                                shopping.addOne(ing.name, { source: "recipe", recipeId: recipe.id });
                                toast({
                                  title: "✓ Added to list",
                                  description: ing.name
                                });
                              }}
                            >
                              {ingredientInShoppingList(ing.name) ? (
                                <Check className="h-4.5 w-4.5" />
                              ) : (
                                <Plus className="h-4.5 w-4.5" />
                              )}
                            </button>
                          ) : (
                            <div className={"inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[hsl(var(--background)/0.25)] px-2.5 py-1.5 " + CAPTION_XS_CLASS + " font-bold backdrop-blur-sm"}>
                              <Lock className="h-3 w-3" />
                              Locked
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>

                    {hiddenIngredientsCount > 0 && (
                      <div className="mt-3 px-3">
                        <button
                          type="button"
                          className="w-full rounded-xl border border-white/12 bg-[hsl(var(--background)/0.25)] px-4 py-2.5 text-[13px] font-bold text-foreground/90 backdrop-blur-sm transition-all hover:bg-[hsl(var(--ring)/0.12)] hover:border-[hsl(var(--ring)/0.35)] hover:text-[hsl(var(--ring))]"
                          onClick={() => setShowAllIngredients((current) => !current)}
                        >
                          {showAllIngredients
                            ? EXPAND_COPY.showFewer
                            : EXPAND_COPY.showMore(hiddenIngredientsCount)}
                        </button>
                      </div>
                    )}
                    </motion.div>
                  )}

                  {!shouldLockTabs && activeTab === "steps" && (
                    <motion.div
                      key="steps"
                      layout
                      initial={{ opacity: 0, x: slideDirection * 24, filter: "blur(6px)" }}
                      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, x: slideDirection * -24, filter: "blur(6px)" }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 350, 
                        damping: 28,
                        opacity: { duration: 0.18 },
                        layout: { type: "spring", stiffness: 400, damping: 30 }
                      }}
                      className="p-5"
                    >
                    <div className="space-y-6">
                      {visibleSteps.map((st, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04, duration: 0.35 }}
                          className="relative pl-7"
                        >
                          {/* Timeline */}
                          {idx < visibleSteps.length - 1 && (
                            <div className="absolute left-[7px] top-3 bottom-[-24px] w-[2px] bg-gradient-to-b from-[hsl(var(--ring)/0.5)] to-[hsl(var(--ring)/0.15)]" />
                          )}

                          {/* Step Dot */}
                          <div
                            className={
                              "absolute left-0 top-0.5 h-4 w-4 rounded-full border-[2.5px] transition-all " +
                              (trickySteps.includes(idx + 1)
                                ? "border-[hsl(var(--ring))] bg-[hsl(var(--ring)/0.25)] shadow-[0_0_12px_rgba(255,178,102,0.4)]"
                                : "border-[hsl(var(--ring)/0.6)] bg-background")
                            }
                          />

                          {/* Header */}
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className={EYEBROW_CLASS}>
                              Step {idx + 1}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (!showCommitOnlyActions) return;
                                setCompletedSteps((prev) => {
                                  const next = new Set(prev);
                                  const stepNumber = idx + 1;
                                  if (next.has(stepNumber)) next.delete(stepNumber);
                                  else next.add(stepNumber);
                                  return next;
                                });
                              }}
                              disabled={!showCommitOnlyActions}
                              className={
                                "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 " + CAPTION_XS_CLASS + " font-bold transition-all " +
                                (!showCommitOnlyActions
                                  ? "border-white/10 bg-[hsl(var(--background)/0.25)] text-muted-foreground/50 cursor-not-allowed"
                                  : completedSteps.has(idx + 1)
                                    ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
                                    : "border-white/12 bg-[hsl(var(--background)/0.3)] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--ring)/0.12)] hover:border-[hsl(var(--ring)/0.35)]")
                              }
                            >
                              {!showCommitOnlyActions ? (
                                <>
                                  <Lock className="h-3.5 w-3.5" />
                                  Locked
                                </>
                              ) : completedSteps.has(idx + 1) ? (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  Done
                                </>
                              ) : (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  Mark done
                                </>
                              )}
                            </button>
                          </div>

                          {/* Step Text */}
                          <p className="break-words text-[15px] font-medium leading-relaxed">{st.text}</p>

                          {/* Timer Badge */}
                          {st.timerSeconds && (
                            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--ring)/0.35)] bg-gradient-to-r from-[hsl(var(--ring)/0.15)] to-[hsl(var(--ring)/0.08)] px-3 py-1.5 text-[12px] font-bold text-[hsl(var(--ring))] backdrop-blur-sm">
                              <Timer className="h-3.5 w-3.5" />
                              {Math.round(st.timerSeconds / 60)} min timer
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>

                    {hiddenStepsCount > 0 && (
                      <div className="mt-5">
                        <button
                          type="button"
                          className="w-full rounded-xl border border-white/12 bg-[hsl(var(--background)/0.25)] px-4 py-2.5 text-[13px] font-bold text-foreground/90 backdrop-blur-sm transition-all hover:bg-[hsl(var(--ring)/0.12)] hover:border-[hsl(var(--ring)/0.35)] hover:text-[hsl(var(--ring))]"
                          onClick={() => setShowAllSteps((current) => !current)}
                        >
                          {showAllSteps ? EXPAND_COPY.showFewer : EXPAND_COPY.showMore(hiddenStepsCount)}
                        </button>
                      </div>
                    )}
                    </motion.div>
                  )}

                  {!shouldLockTabs && activeTab === "tips" && (
                    <motion.div
                      key="tips"
                      layout
                      initial={{ opacity: 0, x: slideDirection * 24, filter: "blur(6px)" }}
                      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, x: slideDirection * -24, filter: "blur(6px)" }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 350, 
                        damping: 28,
                        opacity: { duration: 0.18 },
                        layout: { type: "spring", stiffness: 400, damping: 30 }
                      }}
                      className="p-5"
                    >
                      <div className="space-y-4">
                        {/* Time Breakdown */}
                        <motion.div
                          initial={{ opacity: 0, y: 12, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 25 }}
                          className="rounded-2xl border border-white/8 bg-[hsl(var(--background)/0.2)] p-4 backdrop-blur-sm"
                        >
                  <div className="mb-3 flex items-center justify-between">
                    <div className={EYEBROW_CLASS}>
                      Time Breakdown
                    </div>
                    <div className={CAPTION_XS_CLASS + " font-semibold"}>
                      {recipe.minutes} min total
                    </div>
                  </div>

                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[hsl(var(--background)/0.5)]">
                    <motion.div
                      className="h-full bg-[hsl(var(--ring))]"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round((timeBreakdown.prep / recipe.minutes) * 100)}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    />
                    <motion.div
                      className="h-full bg-[hsl(var(--ring)/0.4)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round((timeBreakdown.cook / recipe.minutes) * 100)}%` }}
                      transition={{ duration: 0.9, delay: 0.3 }}
                    />
                    {timeBreakdown.rest > 0 && (
                      <motion.div
                        className="h-full bg-white/15"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(0, 100 - Math.round((timeBreakdown.prep / recipe.minutes) * 100) - Math.round((timeBreakdown.cook / recipe.minutes) * 100))}%` }}
                        transition={{ duration: 1, delay: 0.4 }}
                      />
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div>
                      <div className={"flex items-center gap-1.5 " + EYEBROW_CLASS}>
                        <Clock className="h-3 w-3" />
                        Prep
                      </div>
                      <div className="mt-1 text-[15px] font-bold">{timeBreakdown.prep}m</div>
                    </div>
                    <div>
                      <div className={"flex items-center gap-1.5 " + EYEBROW_CLASS}>
                        <Flame className="h-3 w-3" />
                        Cook
                      </div>
                      <div className="mt-1 text-[15px] font-bold">{timeBreakdown.cook}m</div>
                    </div>
                    <div>
                      <div className={"flex items-center gap-1.5 " + EYEBROW_CLASS}>
                        <Coffee className="h-3 w-3" />
                        Rest
                      </div>
                      <div className="mt-1 text-[15px] font-bold">{timeBreakdown.rest || 0}m</div>
                    </div>
                        </div>
                        </motion.div>

                        {/* Step Difficulty */}
                        <motion.div
                          initial={{ opacity: 0, y: 12, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 25 }}
                          className="rounded-2xl border border-white/8 bg-[hsl(var(--background)/0.2)] p-4 backdrop-blur-sm"
                        >
                  <div className="mb-3 flex items-center justify-between">
                    <div className={EYEBROW_CLASS}>
                      Step Difficulty
                    </div>
                    <div className={CAPTION_XS_CLASS + " font-semibold"}>
                      {stepCount} steps
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {Array.from({ length: Math.min(stepCount, STEP_DIFFICULTY_DOT_LIMIT) }, (_, idx) => {
                      const stepNum = idx + 1;
                      const isTricky = trickySteps.includes(stepNum);
                      return (
                        <div
                          key={stepNum}
                          className={
                            "grid h-9 w-9 place-items-center rounded-xl text-[12px] font-bold transition-all " +
                            (isTricky
                              ? "bg-gradient-to-br from-[hsl(var(--ring)/0.25)] to-[hsl(var(--ring)/0.15)] text-[hsl(var(--ring))] border-2 border-[hsl(var(--ring)/0.5)] shadow-[0_0_12px_rgba(255,178,102,0.3)]"
                              : "bg-[hsl(var(--background)/0.4)] text-muted-foreground border border-white/10")
                          }
                        >
                          {stepNum}
                        </div>
                      );
                    })}
                    {stepCount > STEP_DIFFICULTY_DOT_LIMIT && (
                      <div className="rounded-xl border border-white/10 bg-[hsl(var(--background)/0.4)] px-3 py-2 text-[12px] font-bold text-muted-foreground">
                        +{stepCount - STEP_DIFFICULTY_DOT_LIMIT}
                      </div>
                    )}
                  </div>

                  <p className="mt-3 text-[13px] font-medium text-muted-foreground/90">
                    {trickyStepsSummary}
                        </p>
                        </motion.div>

                        {/* Flavor Profile */}
                        <motion.div
                          initial={{ opacity: 0, y: 12, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 25 }}
                          className="rounded-2xl border border-white/8 bg-[hsl(var(--background)/0.2)] p-5 backdrop-blur-sm"
                        >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[hsl(var(--ring)/0.2)] to-[hsl(var(--ring)/0.08)] text-[hsl(var(--ring))]">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold leading-tight">Flavor Profile</h3>
                      <p className={EYEBROW_CLASS}>
                        What makes it taste good
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className={"mb-1.5 block " + EYEBROW_CLASS + " text-[hsl(var(--ring))]"}>
                        Garnishes
                      </span>
                      <p className="text-[14px] leading-relaxed text-foreground/90">
                        {flavorGroups.garnishes.length
                          ? flavorGroups.garnishes.map(titleCase).join(", ")
                          : "Salt & pepper"}
                      </p>
                    </div>

                    <div>
                      <span className={"mb-1.5 block " + EYEBROW_CLASS + " text-[hsl(164_50%_57%)]"}>
                        Main Ingredients
                      </span>
                      <p className="text-[14px] leading-relaxed text-foreground/90">
                        {flavorGroups.mains.length
                          ? flavorGroups.mains.map(titleCase).join(", ")
                          : "Seasonal staples"}
                      </p>
                    </div>

                    <div>
                      <span className={"mb-1.5 block " + EYEBROW_CLASS + " text-[hsl(79_33%_58%)]"}>
                        Seasonings
                      </span>
                      <p className="text-[14px] leading-relaxed text-foreground/90">
                        {flavorGroups.seasonings.length
                          ? flavorGroups.seasonings.map(titleCase).join(", ")
                          : "Olive oil, garlic"}
                      </p>
                        </div>
                      </div>
                    </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </Glass>
          </motion.section>
        </motion.main>

        <WeekPickerOverlay
          isOpen={addPlanOpen}
          onClose={() => setAddPlanOpen(false)}
          recipeId={recipe.id}
          recipeTitle={recipe.title}
        />

        <SaveToCookbookSheet
          open={saveToCookbookOpen}
          onOpenChange={setSaveToCookbookOpen}
          recipeId={recipe.id}
          recipeTitle={recipe.title}
          onSaved={({ added }) => {
            if (added) {
              setJustAdded(true);
              setTimeout(() => setJustAdded(false), 5000);
            }
          }}
        />

        <BottomNav />
      </div>
    </div>
  );
}
