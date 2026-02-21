import { useMemo, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  Settings,
  Target,
  Bell,
  ChevronDown,
  ChefHat,
  Clock,
  Sparkles,
  Check,
  ArrowRight,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { clearSession, redirectToLogin } from "@/lib/session";
import {
  clearActiveUserId,
  clearLegacyAppData,
  clearUserScopedData,
  getActiveUserId,
  isRegisteredAccount,
} from "@/lib/user-storage";
import BottomNav from "@/components/app/bottom-nav";
import { getRecipe } from "@/lib/recipes";
import { usePlan, toDateKey, type PlanSlot } from "@/lib/plan-store";
import SavedPill from "@/components/app/saved-pill";
import QuickPlanDrawer from "@/components/app/quick-plan-drawer";
import Timeline from "@/components/app/timeline";
import QuickActions from "@/components/app/quick-actions";
import { NutritionHero } from "@/components/app/nutrition-hero";
import RecentCreations from "@/components/app/recent-creations";
import { useCookbooks } from "@/lib/cookbooks-store";
import { UserAvatar } from "@/components/app/user-avatar";
import { getCookedIds } from "@/lib/cooked-store";
import { clearCookingSession, getCookingSession } from "@/lib/cooking-session-store";
import { PAGE_TITLE_CLASS, SECTION_TITLE_CLASS, EYEBROW_CLASS, CAPTION_CLASS, CHIP_LABEL_CLASS } from "@/lib/design-tokens";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type RecentRecipe = {
  id: string;
  title: string;
  minutes: number;
  blurb: string;
  tags: string[];
  image?: string;
  calories?: string;
  cuisine?: string;
};

type NextAction =
  | {
      kind: "resume_cooking";
      recipe: RecentRecipe;
      step: number;
      totalSteps: number;
    }
  | {
      kind: "planned_today";
      recipe: RecentRecipe;
      slot: PlanSlot;
    }
  | {
      kind: "newly_saved";
      recipe: RecentRecipe;
    }
  | {
      kind: "recently_cooked";
      recipe: RecentRecipe;
    }
  | {
      kind: "empty";
    };

function toRecentRecipe(recipe: NonNullable<ReturnType<typeof getRecipe>>): RecentRecipe {
  return {
    id: recipe.id,
    title: recipe.title,
    minutes: recipe.minutes,
    blurb: recipe.blurb,
    tags: recipe.tags,
    image: recipe.image,
    calories: recipe.calories,
    cuisine: recipe.cuisine,
  };
}

function slotLabel(slot: PlanSlot) {
  if (slot === "breakfast") return "Breakfast";
  if (slot === "lunch") return "Lunch";
  return "Dinner";
}

// Orb component for brownish theme background
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

export default function Home() {
  const [location, navigate] = useLocation();

  const plan = usePlan();
  const cookbooks = useCookbooks();
  const [planDrawerOpen, setPlanDrawerOpen] = useState(false);
  const [selectedPlanDay, setSelectedPlanDay] = useState<string | null>(null);
  const [pill, setPill] = useState<{ show: boolean; label: string }>({ show: false, label: "" });
  const isAccountSession = isRegisteredAccount(getActiveUserId());

  const committedRecipeMeta = useMemo(() => {
    const latestByRecipe = new Map<string, { savedAt: number; recipe: RecentRecipe }>();

    Object.values(cookbooks.savedByCookbook).forEach((entries) => {
      entries.forEach((entry) => {
        const recipe = getRecipe(entry.recipeId);
        if (!recipe) return;

        const previous = latestByRecipe.get(recipe.id);
        if (previous && previous.savedAt >= entry.savedAt) return;

        latestByRecipe.set(recipe.id, { savedAt: entry.savedAt, recipe: toRecentRecipe(recipe) });
      });
    });

    return Array.from(latestByRecipe.values())
      .sort((a, b) => b.savedAt - a.savedAt);
  }, [cookbooks.savedByCookbook]);

  const committedRecipes = useMemo(
    () => committedRecipeMeta.map((item) => item.recipe),
    [committedRecipeMeta],
  );

  const recentCreations = useMemo(() => {
    return committedRecipes.filter((r) => !!r.image).slice(0, 3);
  }, [committedRecipes]);

  const todayKey = toDateKey(new Date());
  const cookingSession = useMemo(() => getCookingSession(), [location]);
  const cookedIds = useMemo(() => getCookedIds(), [location]);

  const plannedToday = useMemo(() => {
    const day = plan.getDayEntries(todayKey);
    const orderedSlots: PlanSlot[] = ["breakfast", "lunch", "dinner"];
    for (const slot of orderedSlots) {
      const entry = day[slot];
      if (!entry) continue;
      const recipe = getRecipe(entry.recipeId);
      if (!recipe) continue;
      return { slot, recipe: toRecentRecipe(recipe) };
    }
    return null;
  }, [plan.entries, todayKey]);

  const plannedRecipeIds = useMemo(() => {
    const ids = new Set<string>();
    plan.entries.forEach((entry) => ids.add(entry.recipeId));
    return ids;
  }, [plan.entries]);

  const cookedSet = useMemo(() => new Set(cookedIds), [cookedIds]);

  const nextAction = useMemo<NextAction>(() => {
    if (cookingSession && !cookedSet.has(cookingSession.recipeId)) {
      const recipe = getRecipe(cookingSession.recipeId);
      if (recipe) {
        return {
          kind: "resume_cooking",
          recipe: toRecentRecipe(recipe),
          step: Math.max(0, Math.min(cookingSession.step, cookingSession.totalSteps - 1)),
          totalSteps: cookingSession.totalSteps,
        };
      }
    }

    if (plannedToday && !cookedSet.has(plannedToday.recipe.id)) {
      return {
        kind: "planned_today",
        recipe: plannedToday.recipe,
        slot: plannedToday.slot,
      };
    }

    const newestUnplanned = committedRecipeMeta.find(
      (entry) => !cookedSet.has(entry.recipe.id) && !plannedRecipeIds.has(entry.recipe.id),
    );
    if (newestUnplanned) {
      return {
        kind: "newly_saved",
        recipe: newestUnplanned.recipe,
      };
    }

    for (const cookedId of cookedIds) {
      const recipe = getRecipe(cookedId);
      if (!recipe) continue;
      return {
        kind: "recently_cooked",
        recipe: toRecentRecipe(recipe),
      };
    }

    return { kind: "empty" };
  }, [cookingSession, cookedSet, plannedToday, committedRecipeMeta, plannedRecipeIds, cookedIds]);

  useEffect(() => {
    const lastSavedRecipeId = cookbooks.lastSaved?.recipeId;
    if (!lastSavedRecipeId) return;
    const recipe = getRecipe(lastSavedRecipeId);
    if (!recipe) return;
    setPill({ show: true, label: `${recipe.title} added to cookbook` });
  }, [cookbooks.lastSaved?.at]);

  useEffect(() => {
    if (!cookingSession) return;
    if (!cookedSet.has(cookingSession.recipeId)) return;
    clearCookingSession(cookingSession.recipeId);
  }, [cookingSession, cookedSet]);

  // Unit state for nutrition display
  const [unit, setUnit] = useState<'g' | 'oz'>('g');
  const [isUnitMenuOpen, setIsUnitMenuOpen] = useState(false);

  // Format user display name
  const formatDisplayName = (userId: string) => {
    const raw = userId.trim();
    if (!raw || raw === "guest") return "Chef";
    const normalized = raw.toLowerCase();
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
  };

  const activeUserId = getActiveUserId();
  const displayName = formatDisplayName(activeUserId);

  const nextActionCopy = useMemo(() => {
    switch (nextAction.kind) {
      case "resume_cooking":
        return {
          kicker: "In Progress",
          title: nextAction.recipe.title,
          body: `Resume at step ${nextAction.step + 1} of ${nextAction.totalSteps}.`,
          primaryCta: "Resume cooking",
          secondaryCta: "View recipe",
        };
      case "planned_today":
        return {
          kicker: `Planned ${slotLabel(nextAction.slot)}`,
          title: nextAction.recipe.title,
          body: "You already planned this for today. Start now or adjust the plan.",
          primaryCta: "Start cooking",
          secondaryCta: "Adjust plan",
        };
      case "newly_saved":
        return {
          kicker: "Just Saved",
          title: nextAction.recipe.title,
          body: "Plan this recipe or start cooking now while it is fresh.",
          primaryCta: "Plan it",
          secondaryCta: "Cook now",
        };
      case "recently_cooked":
        return {
          kicker: "Recently Cooked",
          title: nextAction.recipe.title,
          body: "Cook it again, or open the recipe details.",
          primaryCta: "Cook again",
          secondaryCta: "View recipe",
        };
      default:
        return {
          kicker: "No Active Recipe",
          title: "Scan ingredients for new ideas",
          body: "Take a photo and get AI recipe ideas from what you already have.",
          primaryCta: "Scan food",
          secondaryCta: "Open Cookbooks",
        };
    }
  }, [nextAction]);

  const openPlanDrawerForToday = () => {
    setSelectedPlanDay(todayKey);
    setPlanDrawerOpen(true);
  };

  const getSuggestedSlotForNow = (): PlanSlot => {
    const hour = new Date().getHours();
    if (hour < 11) return "breakfast";
    if (hour < 16) return "lunch";
    return "dinner";
  };

  const handleNextActionPrimary = () => {
    switch (nextAction.kind) {
      case "resume_cooking":
        navigate(`/cook/${nextAction.recipe.id}?step=${nextAction.step}`);
        return;
      case "planned_today":
        navigate(`/cook/${nextAction.recipe.id}`);
        return;
      case "newly_saved":
        {
          const dayEntries = plan.getDayEntries(todayKey);
          const preferred = getSuggestedSlotForNow();
          const orderedSlots: PlanSlot[] =
            preferred === "breakfast"
              ? ["breakfast", "lunch", "dinner"]
              : preferred === "lunch"
                ? ["lunch", "dinner", "breakfast"]
                : ["dinner", "lunch", "breakfast"];
          const slot = orderedSlots.find((candidate) => !dayEntries[candidate]);
          if (!slot) {
            toast({
              title: "Today is already full",
              description: "Choose a slot manually to replace a meal.",
            });
            openPlanDrawerForToday();
            return;
          }
          plan.setEntry({
            dateKey: todayKey,
            slot,
            recipeId: nextAction.recipe.id,
            source: "saved",
          });
          toast({
            title: "Planned for today",
            description: `${nextAction.recipe.title} added to ${slotLabel(slot)}.`,
          });
        }
        return;
      case "recently_cooked":
        navigate(`/cook/${nextAction.recipe.id}?cookAgain=1`);
        return;
      default:
        navigate("/camera");
    }
  };

  const handleNextActionSecondary = () => {
    switch (nextAction.kind) {
      case "resume_cooking":
      case "recently_cooked":
        navigate(`/recipe/${nextAction.recipe.id}`);
        return;
      case "newly_saved":
        navigate(`/cook/${nextAction.recipe.id}`);
        return;
      case "planned_today":
        openPlanDrawerForToday();
        return;
      default:
        navigate("/cookbooks");
    }
  };


  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-hidden">
      <div className="relative mx-auto min-h-screen w-full max-w-[430px] px-4 pb-32 pt-8">
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

        <SavedPill show={pill.show} label={pill.label} onHide={() => setPill((p) => ({ ...p, show: false }))} />

        {/* Top Header - Welcome Back */}
        <header className="relative z-10 mb-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="relative group cursor-pointer">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-amber-300 rounded-full blur opacity-30 group-hover:opacity-70 transition duration-500" />
                    <UserAvatar
                      size="md"
                      borderColor="ring"
                    />
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#121212] shadow-sm" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={10}
                  className="w-56 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--popover))] p-1.5 text-foreground shadow-2xl backdrop-blur-xl"
                >
                  <div className="px-2 py-2">
                    <div className="text-xs text-muted-foreground">Signed in</div>
                    <div className="mt-0.5 text-sm font-semibold">{displayName}</div>
                    <div className="mt-1 inline-flex items-center gap-2">
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
                          (isAccountSession
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : "bg-[hsl(var(--muted))] text-muted-foreground border border-[hsl(var(--border))]")
                        }
                      >
                        {isAccountSession ? "Account session" : "Guest session"}
                      </span>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-[hsl(var(--border))]" />
                  <DropdownMenuItem
                    className="group rounded-xl px-2.5 py-2 text-foreground focus:bg-[hsl(var(--accent))] focus:text-[hsl(var(--accent-foreground))]"
                    onSelect={() => navigate("/settings")}
                  >
                    <Settings className="h-4 w-4 text-muted-foreground group-data-[highlighted]:text-[hsl(var(--accent-foreground))] mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="group rounded-xl px-2.5 py-2 text-foreground focus:bg-[hsl(var(--accent))] focus:text-[hsl(var(--accent-foreground))]"
                    onSelect={() => {
                      const activeId = getActiveUserId();
                      const isPersistent = isRegisteredAccount(activeId);
                      if (!isPersistent) {
                        clearUserScopedData(activeId);
                        clearLegacyAppData();
                      }
                      clearSession();
                      clearActiveUserId();
                      toast({ title: "Signed out", description: "Returning to sign in…" });
                      setTimeout(() => {
                        redirectToLogin(navigate);
                      }, 50);
                    }}
                  >
                    <LogOut className="h-4 w-4 text-muted-foreground group-data-[highlighted]:text-[hsl(var(--accent-foreground))] mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div>
                <p className={EYEBROW_CLASS + " mb-0.5 text-foreground"}>
                  Welcome Back,
                </p>
                <p className={PAGE_TITLE_CLASS + " leading-none"}>
                  {displayName}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-12 h-12 rounded-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] flex items-center justify-center text-foreground hover:bg-[hsl(var(--muted))]/80 transition-all relative shadow-lg"
              >
                <Bell size={20} />
                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#0a0a0a] shadow-[0_0_12px_#f43f5e] animate-pulse" />
              </motion.button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 flex flex-col gap-6">
          <Timeline
            onDayClick={(dateKey) => {
              setSelectedPlanDay(dateKey);
              setPlanDrawerOpen(true);
            }}
          />
          <QuickActions
            onPlanClick={() => setPlanDrawerOpen(true)}
          />
          <motion.section
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24 }}
            className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-black/55 to-black/30 p-5 shadow-xl"
            data-testid="card-home-next-action"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.14),transparent_55%)]" />
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={EYEBROW_CLASS}>
                    {nextActionCopy.kicker}
                  </div>
                  <h3 className={"mt-1 " + SECTION_TITLE_CLASS + " font-black"}>
                    {nextActionCopy.title}
                  </h3>
                  <p className={"mt-2 " + CAPTION_CLASS + " leading-relaxed"}>
                    {nextActionCopy.body}
                  </p>
                </div>
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5 text-[hsl(var(--ring))]">
                  {nextAction.kind === "resume_cooking" ? (
                    <ChefHat className="h-5 w-5" />
                  ) : nextAction.kind === "planned_today" ? (
                    <Clock className="h-5 w-5" />
                  ) : nextAction.kind === "newly_saved" ? (
                    <Sparkles className="h-5 w-5" />
                  ) : nextAction.kind === "recently_cooked" ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleNextActionPrimary}
                  data-testid="button-home-next-action-primary"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[hsl(var(--ring)/0.45)] bg-[hsl(var(--ring)/0.18)] px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-[hsl(var(--ring)/0.26)]"
                >
                  {nextActionCopy.primaryCta}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextActionSecondary}
                  data-testid="button-home-next-action-secondary"
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-white/10"
                >
                  {nextActionCopy.secondaryCta}
                </button>
              </div>
            </div>
          </motion.section>
          {/* Weekly Nutrition Card */}
          <div className="relative group rounded-[2.5rem] overflow-visible">
            {/* Glass Card Background - Brownish Theme */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 to-orange-950/5 rounded-[2.5rem] border border-amber-700/20 backdrop-blur-xl" />
            
            {/* Content Layer */}
            <div className="relative z-10 p-5 pb-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <motion.div 
                    className="w-12 h-12 rounded-2xl bg-[hsl(var(--card))] backdrop-blur-xl flex items-center justify-center text-[hsl(var(--ring))] border border-[hsl(var(--card-border))]"
                    whileHover={{ scale: 1.08 }}
                  >
                    <Target size={20} />
                  </motion.div>
                  <div>
                    <h3 className={SECTION_TITLE_CLASS + " font-black tracking-tight leading-none mb-1"}>
                      Weekly Nutrition
                    </h3>
                    <p className={CAPTION_CLASS}>
                      Your progress this week
                    </p>
                  </div>
                </div>
                {/* Unit Dropdown - Moved from NutritionHero */}
                <div className="relative">
                  <button 
                    onClick={() => setIsUnitMenuOpen(!isUnitMenuOpen)}
                    aria-haspopup="true"
                    aria-expanded={isUnitMenuOpen}
                    className={"flex items-center gap-2 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-full px-3 py-1.5 " + CHIP_LABEL_CLASS + " text-foreground hover:bg-[hsl(var(--muted))]/80 transition-all"}
                  >
                    <span>{unit === 'g' ? 'Grams (g)' : 'Ounces (oz)'}</span>
                    <ChevronDown size={12} className={`transition-transform duration-300 ${isUnitMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isUnitMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsUnitMenuOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 top-full mt-2 w-32 bg-[hsl(var(--popover))] backdrop-blur-xl border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden p-1.5 z-50 flex flex-col"
                          role="menu"
                        >
                          <button 
                            onClick={() => { setUnit('g'); setIsUnitMenuOpen(false); }} 
                            role="menuitem"
                            className={`w-full text-left px-3 py-2 text-[10px] font-bold rounded-lg transition-all ${unit === 'g' ? 'bg-[hsl(var(--ring))/0.2] text-[hsl(var(--ring))] border border-[hsl(var(--ring))/0.3]' : 'text-muted-foreground hover:bg-[hsl(var(--accent))] hover:text-foreground border border-transparent'}`}
                          >
                            Grams (g)
                          </button>
                          <div className="h-px bg-[hsl(var(--border))] mx-2 my-0.5" />
                          <button 
                            onClick={() => { setUnit('oz'); setIsUnitMenuOpen(false); }} 
                            role="menuitem"
                            className={`w-full text-left px-3 py-2 text-[10px] font-bold rounded-lg transition-all ${unit === 'oz' ? 'bg-[hsl(var(--ring))/0.2] text-[hsl(var(--ring))] border border-[hsl(var(--ring))/0.3]' : 'text-muted-foreground hover:bg-[hsl(var(--accent))] hover:text-foreground border border-transparent'}`}
                          >
                            Ounces (oz)
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              {/* Nutrition Hero Content - Circle and Macro Cards */}
              <NutritionHero unit={unit} />
            </div>
          </div>

          <RecentCreations 
            recipes={recentCreations.map(r => ({
              id: r.id,
              title: r.title,
              image: r.image,
              calories: r.calories,
              timeMins: r.minutes,
              tags: r.tags,
              rating: 4.5, // Default rating, can be enhanced later
            }))}
          />
        </main>

        <QuickPlanDrawer
          open={planDrawerOpen}
          onOpenChange={setPlanDrawerOpen}
          initialDateKey={selectedPlanDay}
        />
        <BottomNav />
      </div>
    </div>
  );
}
