import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, TrendingUp, Info } from "lucide-react";
import { useLocation } from "wouter";
import { usePlan, toDateKey, addDays } from "@/lib/plan-store";
import { getRecipe, type RecipeFull } from "@/lib/recipes";
import { readUserScoped } from "@/lib/user-storage";
import { getCookedEntries } from "@/lib/cooked-store";

function Glass({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={"glass-card sc-noise relative overflow-hidden border border-white/5 " + (className ?? "")}>
      {children}
    </div>
  );
}

type NutritionEstimate = {
  protein: number;
  fat: number;
  carbs: number;
  calories: number;
};

const PROFILE_PREFS_KEY = "profile:prefs:v1";
const PROFILE_PREFS_LEGACY_KEYS = ["snapcook:profile:prefs:v1"];
const DEFAULT_CALORIE_GOAL = 2000;

const NUTRITION_OVERRIDES: Record<string, NutritionEstimate> = {
  s1: { protein: 26, fat: 16, carbs: 39, calories: 450 },
  s2: { protein: 22, fat: 14, carbs: 32, calories: 320 },
  s3: { protein: 12, fat: 8, carbs: 52, calories: 180 },
  r1: { protein: 20, fat: 12, carbs: 34, calories: 360 },
  r2: { protein: 42, fat: 18, carbs: 35, calories: 478 },
  r3: { protein: 16, fat: 22, carbs: 28, calories: 370 },
};

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

function getCalorieGoal(): number {
  const raw = readUserScoped(PROFILE_PREFS_KEY, PROFILE_PREFS_LEGACY_KEYS);
  if (!raw) return DEFAULT_CALORIE_GOAL;
  try {
    const parsed = JSON.parse(raw);
    const goal = Number(parsed?.calorieGoal);
    return Number.isFinite(goal) && goal >= 900 && goal <= 5000 ? goal : DEFAULT_CALORIE_GOAL;
  } catch {
    return DEFAULT_CALORIE_GOAL;
  }
}

function calculateMacroTargets(weeklyCalorieGoal: number) {
  return {
    protein: Math.round((weeklyCalorieGoal * 0.26) / 4), // 26% of calories, 4 cal/g
    fat: Math.round((weeklyCalorieGoal * 0.28) / 9), // 28% of calories, 9 cal/g
    carbs: Math.round((weeklyCalorieGoal * 0.46) / 4), // 46% of calories, 4 cal/g
  };
}

function getProgressColor(progress: number): string {
  if (progress >= 0.9 && progress <= 1.1) return "hsl(164_50%_57%)"; // Green - on track
  if (progress >= 0.7 && progress < 0.9) return "hsl(39_54%_62%)"; // Yellow - moderate
  if (progress > 1.1) return "hsl(25_90%_55%)"; // Orange - over
  return "hsl(0_70%_55%)"; // Red - needs attention
}

function getGradientForMacro(type: "protein" | "fat" | "carbs", progress: number): string {
  const baseColor = getProgressColor(progress);
  if (type === "protein") {
    return `linear-gradient(135deg, hsl(200_80%_60%) 0%, hsl(180_70%_55%) 100%)`;
  }
  if (type === "fat") {
    return `linear-gradient(135deg, hsl(45_90%_65%) 0%, hsl(30_85%_60%) 100%)`;
  }
  return `linear-gradient(135deg, hsl(150_70%_55%) 0%, hsl(130_65%_50%) 100%)`;
}

function getCaloriesGradient(progress: number): string {
  if (progress >= 0.9 && progress <= 1.1) {
    return `linear-gradient(135deg, hsl(164_60%_60%) 0%, hsl(150_55%_55%) 100%)`;
  }
  if (progress >= 0.7 && progress < 0.9) {
    return `linear-gradient(135deg, hsl(39_70%_65%) 0%, hsl(30_65%_60%) 100%)`;
  }
  if (progress > 1.1) {
    return `linear-gradient(135deg, hsl(25_95%_60%) 0%, hsl(15_90%_55%) 100%)`;
  }
  return `linear-gradient(135deg, hsl(0_75%_60%) 0%, hsl(350_70%_55%) 100%)`;
}

function getInsight(progress: number, type: "calories" | "protein" | "fat" | "carbs"): string {
  if (progress >= 0.9 && progress <= 1.1) {
    if (type === "calories") return "Perfect balance this week! 🎯";
    if (type === "protein") return "Great protein intake! 💪";
    if (type === "fat") return "Healthy fat levels! 🥑";
    return "Carbs on point! 🍞";
  }
  if (progress < 0.7) {
    if (type === "calories") return "Add more meals this week";
    if (type === "protein") return "Need more protein-rich meals";
    if (type === "fat") return "Add healthy fats";
    return "Include more carbs";
  }
  if (progress > 1.1) {
    if (type === "calories") return "Slightly over goal";
    if (type === "protein") return "High protein week";
    if (type === "fat") return "Fat intake elevated";
    return "Carbs above target";
  }
  return "Getting there!";
}

function ProgressRing({
  size,
  stroke,
  progress,
  color,
  label,
  value,
  target,
  unit,
  delay = 0,
}: {
  size: number;
  stroke: number;
  progress: number;
  color: string;
  label: string;
  value: number;
  target: number;
  unit: string;
  delay?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedProgress = Math.max(0, Math.min(1, progress));
  const dashOffset = circumference * (1 - normalizedProgress);
  const progressColor = getProgressColor(progress);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.2, duration: 0.4 }}
          className="text-center"
        >
          <div 
            className="font-mono font-bold leading-none" 
            style={{ 
              color: progressColor,
              fontSize: size <= 60 ? '13px' : size <= 75 ? '15px' : '18px'
            }}
          >
            {value}
          </div>
          <div className="mt-0.5 text-[8px] uppercase tracking-wide text-muted-foreground/80 font-medium">
            {label}
          </div>
          <div className="mt-0.5 text-[7px] text-muted-foreground/60">
            / {target.toLocaleString()} {unit}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function WeeklyNutritionRing() {
  const [location] = useLocation();
  const plan = usePlan();
  const cookedEntries = React.useMemo(() => getCookedEntries(), [location]);
  const [hoveredMacro, setHoveredMacro] = React.useState<"protein" | "fat" | "carbs" | null>(null);

  // Get calorie goal from profile
  const dailyCalorieGoal = React.useMemo(() => getCalorieGoal(), []);
  const weeklyCalorieGoal = dailyCalorieGoal * 7;
  const macroTargets = React.useMemo(() => calculateMacroTargets(weeklyCalorieGoal), [weeklyCalorieGoal]);

  // Include both planned and cooked meals from the current week window.
  const weeklyNutrition = React.useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = addDays(today, -dayOfWeek);
    const weekEnd = addDays(weekStart, 7);
    const totals = { protein: 0, fat: 0, carbs: 0, calories: 0 };
    let mealCount = 0;
    const countedRecipes = new Set<string>();

    const addRecipeNutrition = (recipeId: string) => {
      const recipe = getRecipe(recipeId);
      if (!recipe) return;
      const nutrition = estimateNutrition(recipe);
      totals.protein += nutrition.protein;
      totals.fat += nutrition.fat;
      totals.carbs += nutrition.carbs;
      totals.calories += nutrition.calories;
      mealCount++;
      countedRecipes.add(recipe.id);
    };

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = addDays(weekStart, dayOffset);
      const dateKey = toDateKey(date);
      const dayEntries = plan.getDayEntries(dateKey);

      Object.values(dayEntries).forEach((entry) => {
        if (!entry) return;
        addRecipeNutrition(entry.recipeId);
      });
    }

    cookedEntries.forEach((entry) => {
      if (!entry.cookedAt) return;
      if (countedRecipes.has(entry.recipeId)) return;
      const cookedAt = new Date(entry.cookedAt);
      if (cookedAt < weekStart || cookedAt >= weekEnd) return;
      addRecipeNutrition(entry.recipeId);
    });

    return { ...totals, mealCount };
  }, [plan.entries, cookedEntries]);

  const progress = {
    calories: weeklyCalorieGoal > 0 ? weeklyNutrition.calories / weeklyCalorieGoal : 0,
    protein: macroTargets.protein > 0 ? weeklyNutrition.protein / macroTargets.protein : 0,
    fat: macroTargets.fat > 0 ? weeklyNutrition.fat / macroTargets.fat : 0,
    carbs: macroTargets.carbs > 0 ? weeklyNutrition.carbs / macroTargets.carbs : 0,
  };

  // Show empty state if no meals planned
  const hasMeals = weeklyNutrition.mealCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.01 }}
      className="relative"
    >
      {/* Enhanced glow effect */}
      <motion.div 
        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[hsl(var(--ring)/0.2)] via-[hsl(var(--ring)/0.1)] to-transparent opacity-60 transition-opacity duration-300 pointer-events-none"
        animate={{
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <Glass className="rounded-2xl p-4 relative z-10 border-white/10 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[hsl(var(--ring)/0.2)] to-[hsl(var(--ring)/0.08)] text-[hsl(var(--ring))]">
                <Target className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="text-[13px] font-semibold leading-tight">Weekly Nutrition</div>
                <div className="text-[9px] text-muted-foreground/80 mt-0.5">
                  {hasMeals
                    ? `${weeklyNutrition.mealCount} recipe${weeklyNutrition.mealCount !== 1 ? "s" : ""} planned this week`
                    : "No recipes planned yet"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {hasMeals ? (
          <>
            {/* Dopamine-Inducing Design */}
            <motion.div
              className="mt-3"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {/* Calories - Massive Hero Number with Gradient */}
              <div className="mb-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.5, type: "spring", stiffness: 200 }}
                  className="relative"
                >
                  <div className="flex items-baseline gap-3 mb-2">
                    <motion.span
                      className="font-mono text-5xl font-black leading-none tracking-tight"
                      style={{
                        background: getCaloriesGradient(progress.calories),
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))",
                      }}
                      animate={{
                        scale: [1, 1.02, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 3,
                        ease: "easeInOut",
                      }}
                    >
                      {Math.round(weeklyNutrition.calories).toLocaleString()}
                    </motion.span>
                    <span className="text-sm text-muted-foreground/70 font-semibold">cal</span>
                    {/* Percentage Badge */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="ml-auto px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{
                        background: getCaloriesGradient(progress.calories),
                        color: "white",
                        textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                      }}
                    >
                      {Math.round(progress.calories * 100)}%
                    </motion.div>
                  </div>
                  
                  {/* Enhanced Progress Bar with Glow */}
                  <div className="relative">
                    <motion.div
                      className="h-2 rounded-full bg-white/10 overflow-hidden shadow-inner"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <motion.div
                        className="h-full rounded-full relative"
                        style={{
                          background: getCaloriesGradient(progress.calories),
                          width: `${Math.min(100, progress.calories * 100)}%`,
                          boxShadow: `0 0 12px ${getProgressColor(progress.calories)}40, 0 0 6px ${getProgressColor(progress.calories)}60`,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, progress.calories * 100)}%` }}
                        transition={{ delay: 0.4, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </motion.div>
                  </div>
                  
                  {/* Goal and Remaining */}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-[10px] text-muted-foreground/70 font-medium">
                      {Math.round(weeklyCalorieGoal).toLocaleString()} cal goal
                    </div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-[10px] font-semibold"
                      style={{ color: getProgressColor(progress.calories) }}
                    >
                      {Math.max(0, Math.round(weeklyCalorieGoal - weeklyNutrition.calories)).toLocaleString()} cal left
                    </motion.div>
                  </div>
                </motion.div>
              </div>

              {/* Macros - Vibrant Gradient Pills */}
              <div className="flex items-stretch gap-3">
                {/* Protein */}
                <motion.div
                  className="relative flex-1"
                  initial={{ opacity: 0, x: -20, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.4, type: "spring", stiffness: 200 }}
                  onMouseEnter={() => setHoveredMacro("protein")}
                  onMouseLeave={() => setHoveredMacro(null)}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className="rounded-xl px-3 py-3 backdrop-blur-md transition-all duration-300 relative overflow-hidden"
                    style={{
                      background: getGradientForMacro("protein", progress.protein),
                      border: `1px solid ${getProgressColor(progress.protein)}40`,
                      boxShadow: hoveredMacro === "protein" 
                        ? `0 8px 24px ${getProgressColor(progress.protein)}30, 0 0 0 1px ${getProgressColor(progress.protein)}20`
                        : `0 4px 12px ${getProgressColor(progress.protein)}20`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider">
                        P
                      </span>
                      <span className="text-sm font-black text-white drop-shadow-sm">
                        {Math.round(weeklyNutrition.protein)}
                      </span>
                    </div>
                    {/* Enhanced Progress Bar */}
                    <div className="h-1.5 rounded-full bg-white/20 overflow-hidden mb-1.5 shadow-inner">
                      <motion.div
                        className="h-full rounded-full relative"
                        style={{
                          background: "linear-gradient(90deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)",
                          width: `${Math.min(100, progress.protein * 100)}%`,
                          boxShadow: `0 0 8px rgba(255,255,255,0.5)`,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, progress.protein * 100)}%` }}
                        transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-[9px] text-white/70 font-medium">
                        / {Math.round(macroTargets.protein)}g
                      </div>
                      <div className="text-[9px] font-bold text-white/90">
                        {Math.round(progress.protein * 100)}%
                      </div>
                    </div>
                  </div>
                  {/* Tooltip */}
                  <AnimatePresence>
                    {hoveredMacro === "protein" && (
                      <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 rounded-lg bg-[hsl(var(--background))] border border-white/20 text-[10px] text-muted-foreground whitespace-nowrap z-10 shadow-xl backdrop-blur-md"
                      >
                        {getInsight(progress.protein, "protein")}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Fat */}
                <motion.div
                  className="relative flex-1"
                  initial={{ opacity: 0, x: -20, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ delay: 0.35, duration: 0.4, type: "spring", stiffness: 200 }}
                  onMouseEnter={() => setHoveredMacro("fat")}
                  onMouseLeave={() => setHoveredMacro(null)}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className="rounded-xl px-3 py-3 backdrop-blur-md transition-all duration-300 relative overflow-hidden"
                    style={{
                      background: getGradientForMacro("fat", progress.fat),
                      border: `1px solid ${getProgressColor(progress.fat)}40`,
                      boxShadow: hoveredMacro === "fat" 
                        ? `0 8px 24px ${getProgressColor(progress.fat)}30, 0 0 0 1px ${getProgressColor(progress.fat)}20`
                        : `0 4px 12px ${getProgressColor(progress.fat)}20`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider">
                        F
                      </span>
                      <span className="text-sm font-black text-white drop-shadow-sm">
                        {Math.round(weeklyNutrition.fat)}
                      </span>
                    </div>
                    {/* Enhanced Progress Bar */}
                    <div className="h-1.5 rounded-full bg-white/20 overflow-hidden mb-1.5 shadow-inner">
                      <motion.div
                        className="h-full rounded-full relative"
                        style={{
                          background: "linear-gradient(90deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)",
                          width: `${Math.min(100, progress.fat * 100)}%`,
                          boxShadow: `0 0 8px rgba(255,255,255,0.5)`,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, progress.fat * 100)}%` }}
                        transition={{ delay: 0.55, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-[9px] text-white/70 font-medium">
                        / {Math.round(macroTargets.fat)}g
                      </div>
                      <div className="text-[9px] font-bold text-white/90">
                        {Math.round(progress.fat * 100)}%
                      </div>
                    </div>
                  </div>
                  {/* Tooltip */}
                  <AnimatePresence>
                    {hoveredMacro === "fat" && (
                      <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 rounded-lg bg-[hsl(var(--background))] border border-white/20 text-[10px] text-muted-foreground whitespace-nowrap z-10 shadow-xl backdrop-blur-md"
                      >
                        {getInsight(progress.fat, "fat")}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Carbs */}
                <motion.div
                  className="relative flex-1"
                  initial={{ opacity: 0, x: -20, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.4, type: "spring", stiffness: 200 }}
                  onMouseEnter={() => setHoveredMacro("carbs")}
                  onMouseLeave={() => setHoveredMacro(null)}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className="rounded-xl px-3 py-3 backdrop-blur-md transition-all duration-300 relative overflow-hidden"
                    style={{
                      background: getGradientForMacro("carbs", progress.carbs),
                      border: `1px solid ${getProgressColor(progress.carbs)}40`,
                      boxShadow: hoveredMacro === "carbs" 
                        ? `0 8px 24px ${getProgressColor(progress.carbs)}30, 0 0 0 1px ${getProgressColor(progress.carbs)}20`
                        : `0 4px 12px ${getProgressColor(progress.carbs)}20`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider">
                        C
                      </span>
                      <span className="text-sm font-black text-white drop-shadow-sm">
                        {Math.round(weeklyNutrition.carbs)}
                      </span>
                    </div>
                    {/* Enhanced Progress Bar */}
                    <div className="h-1.5 rounded-full bg-white/20 overflow-hidden mb-1.5 shadow-inner">
                      <motion.div
                        className="h-full rounded-full relative"
                        style={{
                          background: "linear-gradient(90deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)",
                          width: `${Math.min(100, progress.carbs * 100)}%`,
                          boxShadow: `0 0 8px rgba(255,255,255,0.5)`,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, progress.carbs * 100)}%` }}
                        transition={{ delay: 0.6, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-[9px] text-white/70 font-medium">
                        / {Math.round(macroTargets.carbs)}g
                      </div>
                      <div className="text-[9px] font-bold text-white/90">
                        {Math.round(progress.carbs * 100)}%
                      </div>
                    </div>
                  </div>
                  {/* Tooltip */}
                  <AnimatePresence>
                    {hoveredMacro === "carbs" && (
                      <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 rounded-lg bg-[hsl(var(--background))] border border-white/20 text-[10px] text-muted-foreground whitespace-nowrap z-10 shadow-xl backdrop-blur-md"
                      >
                        {getInsight(progress.carbs, "carbs")}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </motion.div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mt-4 text-center py-6"
          >
            <div className="grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-[hsl(var(--ring)/0.2)] to-[hsl(var(--ring)/0.08)] mx-auto mb-4">
              <Target className="h-10 w-10 text-[hsl(var(--ring))]" />
            </div>
            <p className="text-base font-semibold text-foreground mb-2">Start planning recipes</p>
            <p className="text-[12px] text-muted-foreground max-w-[240px] mx-auto">
              Plan recipes this week to see your nutrition progress and track your goals
            </p>
          </motion.div>
        )}

        {/* Info Footer - Minimal */}
        {hasMeals && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mt-2 flex items-center gap-1"
          >
            <Info className="h-2.5 w-2.5 shrink-0 text-muted-foreground/50" />
            <p className="text-[8px] text-muted-foreground/60">
              {dailyCalorieGoal.toLocaleString()} kcal/day • AI-estimated
            </p>
          </motion.div>
        )}
      </Glass>
    </motion.div>
  );
}
