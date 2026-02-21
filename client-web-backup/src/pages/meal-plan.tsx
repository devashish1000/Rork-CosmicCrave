import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { useDrag } from "@use-gesture/react";
import { animated, useSpring } from "@react-spring/web";
import {
  ArrowLeft,
  ChevronRight,
  Repeat2,
  Trash2,
  Search,
  X,
  Shuffle,
} from "lucide-react";

import BottomNav from "@/components/app/bottom-nav";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { getAllRecipes, getRecipe } from "@/lib/recipes";
import { filterRecipesByPreferences, readDietaryPreferences } from "@/lib/dietary-preferences";
import { usePlan } from "@/lib/plan-store";
import { useShopping } from "@/lib/store";
import WeekRail from "@/components/app/week-rail";
import AddToPlanSheet from "@/components/app/add-to-plan-sheet";
import SavedPill from "@/components/app/saved-pill";

function getSearchParam(key: string) {
  if (typeof window === "undefined") return null;
  try {
    const sp = new URLSearchParams(window.location.search);
    return sp.get(key);
  } catch {
    return null;
  }
}

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
    <div className={"glass-card sc-noise relative overflow-hidden border border-white/5 " + (className ?? "")}>{children}</div>
  );
}

function SwipeDinnerCard({
  hasDinner,
  title,
  subtitle,
  onReplace,
  onRemove,
}: {
  hasDinner: boolean;
  title: string;
  subtitle: string;
  onReplace: () => void;
  onRemove: () => void;
}) {
  const threshold = 64;
  const [didSwipeOnce, setDidSwipeOnce] = useState(false);

  const [{ x }, api] = useSpring(() => ({ x: 0 }));

  const bind = useDrag(
    ({ active, movement: [mx], cancel }) => {
      if (!hasDinner) return;

      // Limit swipe to left only
      const nextX = Math.max(-112, Math.min(0, mx));

      if (!active) {
        if (nextX <= -threshold) {
          api.start({ x: -96, immediate: false });
          return;
        }
        api.start({ x: 0, immediate: false });
        return;
      }

      if (!didSwipeOnce && nextX < -18) setDidSwipeOnce(true);

      api.start({ x: nextX, immediate: true });

      // If user swipes right, just cancel the gesture for a clean feel
      if (mx > 12) cancel?.();
    },
    { axis: "x", filterTaps: true },
  );

  return (
    <div className="relative">
      {/* Action rail behind (only when a dinner exists) */}
      {hasDinner ? (
        <div
          className={
            "absolute inset-0 flex items-center justify-end gap-2 rounded-2xl border p-4 " +
            "border-transparent"
          }
          aria-hidden
        >
          <button
            type="button"
            data-testid="button-plan-swipe-remove-dinner"
            onClick={() => {
              api.start({ x: 0, immediate: false });
              onRemove();
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.5)] px-3 py-2 text-xs font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-foreground focus-visible:sc-ring"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>

          <button
            type="button"
            data-testid="button-plan-swipe-replace-dinner"
            onClick={() => {
              api.start({ x: 0, immediate: false });
              onReplace();
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.5)] px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-[hsl(var(--ring)/0.1)] focus-visible:sc-ring"
          >
            <Repeat2 className="h-4 w-4" />
            Replace
          </button>
        </div>
      ) : null}

      {/* Foreground card */}
      <animated.div
        {...(hasDinner ? bind() : {})}
        style={{ x, touchAction: "pan-y" as any }}
        className="relative rounded-2xl border border-[hsl(var(--border)/0.5)] bg-[hsl(var(--card)/0.4)] backdrop-blur-md p-4 shadow-sm"
        data-testid="card-plan-dinner-swipe"
      >
        <div className="flex items-start justify-between gap-4">
          {hasDinner ? (
            <button
              type="button"
              data-testid="button-plan-view-dinner-tap"
              className="absolute inset-0 z-10 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              onClick={() => {
                // Future: navigate to recipe
                // For now, just a toast to show it's interactive
                onReplace(); // Re-using replace just to show action, or could be view
              }}
              aria-label={`View ${title}`}
            />
          ) : null}

          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]" data-testid="text-plan-slot-label-dinner">
              Dinner
            </div>
            <div className="sc-title text-lg font-semibold" data-testid="text-plan-slot-title-dinner">
              {title}
            </div>
            <div className="mt-1 text-sm text-[hsl(var(--muted-foreground))]" data-testid="text-plan-slot-subtitle-dinner">
              {subtitle}
            </div>
          </div>
        </div>

        {!hasDinner ? (
          <div className="mt-3">
            <Button
              data-testid="button-plan-add-dinner"
              className="w-full rounded-2xl"
              onClick={() => {
                api.start({ x: 0, immediate: false });
                onReplace();
              }}
            >
              + Add dinner
            </Button>
          </div>
        ) : null}

        {hasDinner && !didSwipeOnce ? (
          <div className="mt-3 text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-plan-dinner-swipe-hint">
            Swipe left to replace
          </div>
        ) : null}
      </animated.div>
    </div>
  );
}

export default function MealPlanPage() {
  const [, navigate] = useLocation();
  const plan = usePlan();
  const shopping = useShopping();

  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetSlot, setSheetSlot] = useState<"breakfast" | "lunch" | "dinner">("dinner");
  const [pulseKey, setPulseKey] = useState<string | null>(null);

  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceSlot, setReplaceSlot] = useState<"breakfast" | "lunch" | "dinner">("dinner");
  const [replaceQuery, setReplaceQuery] = useState("");

  const [pill, setPill] = useState<{ show: boolean; label: string }>({ show: false, label: "" });

  const selected = plan.selectedDateKey;

  const from = getSearchParam("from");
  const fromDate = getSearchParam("date");
  const fromRecipeId = getSearchParam("recipeId");

  const fromRecipe = fromRecipeId ? getRecipe(fromRecipeId) : null;
  const fromDayLabel = fromDate
    ? new Date(fromDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    : null;

  const selectedDayLabel = new Date(selected).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  const breakfast = plan.getEntry(selected, "breakfast");
  const lunch = plan.getEntry(selected, "lunch");
  const dinner = plan.getEntry(selected, "dinner");

  const breakfastRecipe = breakfast ? getRecipe(breakfast.recipeId) : null;
  const lunchRecipe = lunch ? getRecipe(lunch.recipeId) : null;
  const dinnerRecipe = dinner ? getRecipe(dinner.recipeId) : null;


  const replaceList = useMemo(() => {
    const q = replaceQuery.trim().toLowerCase();
    const cur = plan.getEntry(plan.selectedDateKey, replaceSlot);
    const curId = cur?.recipeId;

    let base = getAllRecipes()
      .filter((r) => r.id !== curId)
      .map((r) => getRecipe(r.id))
      .filter(Boolean) as NonNullable<ReturnType<typeof getRecipe>>[];

    // Filter by dietary preferences
    const prefs = readDietaryPreferences();
    base = filterRecipesByPreferences(base, prefs);

    if (!q) return base;
    return base.filter((r) => r.title.toLowerCase().includes(q) || r.tags.join(" ").toLowerCase().includes(q));
  }, [plan, replaceQuery, replaceSlot]);

  const suggested = useMemo(() => {
    const q = replaceQuery.trim().toLowerCase();
    const cur = plan.getEntry(plan.selectedDateKey, replaceSlot);
    const curRecipe = cur ? getRecipe(cur.recipeId) : null;

    const pool = replaceList;

    const scored = pool
      .map((r) => {
        const tagOverlap = curRecipe ? r.tags.filter((t) => curRecipe.tags.includes(t)).length : 0;
        const timeCloseness = curRecipe ? Math.max(0, 20 - Math.abs(r.minutes - curRecipe.minutes)) : 0;
        const queryBoost = q ? (r.title.toLowerCase().includes(q) ? 10 : 0) : 0;
        const score = tagOverlap * 12 + timeCloseness + queryBoost;
        return { r, score };
      })
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, 6).map((s) => s.r);
  }, [plan, replaceList, replaceQuery, replaceSlot]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="relative mx-auto min-h-screen w-full max-w-[430px] px-4 pb-24 pt-6">
        <SavedPill show={pill.show} label={pill.label} onHide={() => setPill((p) => ({ ...p, show: false }))} />

        <Orb className="-left-10 top-10 h-56 w-56 bg-[hsl(var(--ring)/0.55)]" />
        <Orb className="-right-14 top-44 h-72 w-72 bg-[hsl(195_90%_55%/0.28)]" />
        <Orb className="left-10 bottom-6 h-64 w-64 bg-[hsl(275_80%_65%/0.18)]" />

        <header className="relative z-10">
          <div className="flex items-center justify-between">
            <button
              type="button"
              data-testid="button-plan-back"
              onClick={() => navigate("/home")}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card)/0.35)] backdrop-blur transition-colors hover:bg-[hsl(var(--card)/0.5)]"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="text-right">
              <div className="text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-plan-kicker">
                Meal Plan
              </div>
              <div className="sc-title text-base font-semibold" data-testid="text-plan-title">
                Glow Rail Week
              </div>
            </div>
          </div>

          <div className="mt-4">
            <WeekRail
              selectedDateKey={plan.selectedDateKey}
              onSelect={(k) => plan.setSelectedDateKey(k)}
              pulseKey={pulseKey}
            />
          </div>

          {from === "nextup" && fromRecipe && fromDate ? (
            <div
              className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[hsl(var(--border)/0.65)] bg-[hsl(var(--background)/0.10)] px-4 py-3"
              data-testid="banner-plan-opened-from-nextup"
            >
              <div className="min-w-0">
                <div className="text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-plan-from-kicker">
                  Opened from Next up (for {selectedDayLabel})
                </div>
                <div className="mt-0.5 truncate text-sm font-medium" data-testid="text-plan-from-title">
                  {fromRecipe.title}
                </div>
                <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-plan-from-day">
                  {fromDayLabel}
                </div>
              </div>

              {fromDate !== selected ? (
                <button
                  type="button"
                  data-testid="button-plan-jump-to-day"
                  className="shrink-0 rounded-full border border-[hsl(var(--ring)/0.55)] bg-[hsl(var(--ring)/0.12)] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-[hsl(var(--ring)/0.18)]"
                  onClick={() => {
                    plan.setSelectedDateKey(fromDate);
                    setPulseKey(fromDate);
                    window.setTimeout(() => setPulseKey(null), 520);
                  }}
                >
                  Jump to that day
                </button>
              ) : (
                <div
                  className="shrink-0 rounded-full border border-[hsl(var(--border)/0.65)] bg-[hsl(var(--background)/0.10)] px-3 py-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))]"
                  data-testid="badge-plan-already-on-day"
                >
                  You’re on that day
                </div>
              )}
            </div>
          ) : null}
        </header>

        <main className="relative z-10 mt-5 grid gap-3">
          <Glass className="rounded-3xl p-5">
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-plan-shop-kicker">
                    Shopping List
                  </div>
                  <div className="text-sm font-medium" data-testid="text-plan-shop-status">
                    {lastSyncedAt ? `Synced: ${format(lastSyncedAt, "EEE, h:mm a")}` : "Unsynced changes"}
                  </div>
                  <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-plan-shop-helper">
                    Exports ingredients from planned meals. Does not change your plan.
                  </div>
                </div>

                <Button
                  type="button"
                  data-testid="button-plan-update-shopping"
                  className="rounded-full px-4 py-2 text-sm font-medium shadow-lg hover:shadow-xl transition-all"
                  onClick={() => {
                    const uniqueRecipeIds = Array.from(new Set(plan.entries.map((e) => e.recipeId).filter(Boolean)));

                    if (uniqueRecipeIds.length === 0) {
                      toast({
                        title: "Nothing planned yet",
                        description: "Add meals to your plan first, then sync.",
                      });
                      return;
                    }

                    let addedTotal = 0;
                    let alreadyTotal = 0;

                    uniqueRecipeIds.forEach((rid) => {
                      const r = getRecipe(rid);
                      if (!r) return;
                      const names = r.ingredients.map((i) => i.name);
                      const res = shopping.addMany(names, { source: "recipe", recipeId: rid });
                      addedTotal += res.added.length;
                      alreadyTotal += res.already.length;
                    });

                    setLastSyncedAt(Date.now());
                    
                    toast({
                      title: "Synced to Shopping List",
                      description: `${addedTotal} items added.`
                    });
                  }}
                >
                  Add ingredients to Shopping List
                </Button>
              </div>

              <div className="rounded-3xl glass-card border border-white/5 p-4" data-testid="group-plan-day-meals">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-plan-day-kicker">
                      Meals for
                    </div>
                    <div className="sc-title text-base font-semibold" data-testid="text-plan-day-title">
                      {new Date(selected).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                    </div>
                  </div>

                  <div className="rounded-full border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.10)] px-3 py-1 text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-plan-day-slots">
                    Breakfast · Lunch · Dinner
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {/* Breakfast */}
                  <div className="rounded-2xl glass-card border border-white/5 p-4 shadow-sm" data-testid="card-plan-slot-breakfast">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]" data-testid="text-plan-slot-label-breakfast">
                          Breakfast
                        </div>
                        <div className="sc-title text-base font-semibold" data-testid="text-plan-slot-title-breakfast">
                          {breakfastRecipe ? breakfastRecipe.title : "Plan breakfast"}
                        </div>
                        <div className="mt-1 text-sm text-[hsl(var(--muted-foreground))]" data-testid="text-plan-slot-subtitle-breakfast">
                          {breakfastRecipe ? `Breakfast · ${breakfastRecipe.minutes} min` : "Optional — quick wins count"}
                        </div>
                      </div>

                      {breakfastRecipe ? (
                        <button
                          type="button"
                          data-testid="button-plan-remove-breakfast"
                          className="grid h-10 w-10 place-items-center rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.5)] text-[hsl(var(--muted-foreground))] transition-colors hover:text-foreground"
                          onClick={() => {
                            plan.removeEntry(selected, "breakfast");
                            setPill({ show: true, label: "Removed · Breakfast" });
                            toast({ title: "Removed", description: "Breakfast cleared." });
                          }}
                          aria-label="Remove breakfast"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {breakfastRecipe ? (
                        <Button
                          data-testid="button-plan-view-breakfast"
                          className="w-full rounded-2xl"
                          onClick={() => navigate(`/recipe/${breakfastRecipe.id}`)}
                        >
                          View
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          data-testid="button-plan-add-breakfast"
                          className="w-full rounded-2xl"
                          onClick={() => {
                            setSheetSlot("breakfast");
                            setSheetOpen(true);
                          }}
                        >
                          + Add
                        </Button>
                      )}

                      <Button
                        data-testid="button-plan-replace-breakfast"
                        variant={breakfastRecipe ? "outline" : "outline"}
                        className="w-full rounded-2xl bg-transparent"
                        onClick={() => {
                          setReplaceSlot("breakfast");
                          setReplaceQuery("");
                          setReplaceOpen(true);
                        }}
                        disabled={!breakfastRecipe}
                      >
                        Replace
                      </Button>
                    </div>
                  </div>

                  {/* Lunch */}
                  <div className="rounded-2xl glass-card border border-white/5 p-4 shadow-sm" data-testid="card-plan-slot-lunch">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]" data-testid="text-plan-slot-label-lunch">
                          Lunch
                        </div>
                        <div className="sc-title text-base font-semibold" data-testid="text-plan-slot-title-lunch">
                          {lunchRecipe ? lunchRecipe.title : "Plan lunch"}
                        </div>
                        <div className="mt-1 text-sm text-[hsl(var(--muted-foreground))]" data-testid="text-plan-slot-subtitle-lunch">
                          {lunchRecipe ? `Lunch · ${lunchRecipe.minutes} min` : "Great for leftovers + salads"}
                        </div>
                      </div>

                      {lunchRecipe ? (
                        <button
                          type="button"
                          data-testid="button-plan-remove-lunch"
                          className="grid h-10 w-10 place-items-center rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.5)] text-[hsl(var(--muted-foreground))] transition-colors hover:text-foreground"
                          onClick={() => {
                            plan.removeEntry(selected, "lunch");
                            setPill({ show: true, label: "Removed · Lunch" });
                            toast({ title: "Removed", description: "Lunch cleared." });
                          }}
                          aria-label="Remove lunch"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {lunchRecipe ? (
                        <Button
                          data-testid="button-plan-view-lunch"
                          className="w-full rounded-2xl"
                          onClick={() => navigate(`/recipe/${lunchRecipe.id}`)}
                        >
                          View
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          data-testid="button-plan-add-lunch"
                          className="w-full rounded-2xl"
                          onClick={() => {
                            setSheetSlot("lunch");
                            setSheetOpen(true);
                          }}
                        >
                          + Add
                        </Button>
                      )}

                      <Button
                        data-testid="button-plan-replace-lunch"
                        variant="outline"
                        className="w-full rounded-2xl bg-transparent"
                        onClick={() => {
                          setReplaceSlot("lunch");
                          setReplaceQuery("");
                          setReplaceOpen(true);
                        }}
                        disabled={!lunchRecipe}
                      >
                        Replace
                      </Button>
                    </div>
                  </div>

                  {/* Dinner */}
                  <div className="rounded-2xl glass-card border border-white/5 p-4 shadow-sm" data-testid="card-plan-slot-dinner">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]" data-testid="text-plan-slot-label-dinner">
                          Dinner
                        </div>
                        <div className="sc-title text-base font-semibold" data-testid="text-plan-slot-title-dinner">
                          {dinnerRecipe ? dinnerRecipe.title : "Plan dinner"}
                        </div>
                        <div className="mt-1 text-sm text-[hsl(var(--muted-foreground))]" data-testid="text-plan-slot-subtitle-dinner">
                          {dinnerRecipe ? `Dinner · ${dinnerRecipe.minutes} min` : "Your anchor meal for the day"}
                        </div>
                      </div>

                      {dinnerRecipe ? (
                        <button
                          type="button"
                          data-testid="button-plan-remove-dinner"
                          className="grid h-10 w-10 place-items-center rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.5)] text-[hsl(var(--muted-foreground))] transition-colors hover:text-foreground"
                          onClick={() => {
                            plan.removeEntry(selected, "dinner");
                            setPill({ show: true, label: "Removed · Dinner" });
                            toast({ title: "Removed", description: "Dinner cleared." });
                          }}
                          aria-label="Remove dinner"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {dinnerRecipe ? (
                        <Button
                          data-testid="button-plan-view-dinner"
                          className="w-full rounded-2xl"
                          onClick={() => navigate(`/recipe/${dinnerRecipe.id}`)}
                        >
                          View
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          data-testid="button-plan-add-dinner"
                          className="w-full rounded-2xl"
                          onClick={() => {
                            setSheetSlot("dinner");
                            setSheetOpen(true);
                          }}
                        >
                          + Add
                        </Button>
                      )}

                      <Button
                        data-testid="button-plan-replace-dinner"
                        variant="outline"
                        className="w-full rounded-2xl bg-transparent"
                        onClick={() => {
                          setReplaceSlot("dinner");
                          setReplaceQuery("");
                          setReplaceOpen(true);
                        }}
                        disabled={!dinnerRecipe}
                      >
                        Replace
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </Glass>
        </main>

        <AddToPlanSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          initialDateKey={plan.selectedDateKey}
          initialSlot={sheetSlot}
          title={sheetSlot === "breakfast" ? "Add breakfast" : sheetSlot === "lunch" ? "Add lunch" : "Add dinner"}
          onConfirm={({ dateKey, slot, recipeId }) => {
            plan.setEntry({ dateKey, slot, recipeId, source: "manual" });
            setPulseKey(dateKey);
            window.setTimeout(() => setPulseKey(null), 520);
            const r = getRecipe(recipeId);
            const slotLabel = slot === "breakfast" ? "Breakfast" : slot === "lunch" ? "Lunch" : "Dinner";
            const dayLabel = new Date(dateKey).toLocaleDateString(undefined, { weekday: "short" });
            setPill({ show: true, label: `Planned · ${slotLabel}` });
            toast({ title: `Planned ${slotLabel} for ${dayLabel}`, description: r?.title ?? slotLabel });
          }}
        />

        {/* Replace sheet (suggested swaps + search) */}
        <AnimatePresence>
          {replaceOpen ? (
            <div className="fixed inset-0 z-50" data-testid="sheet-replace-plan">
              <motion.div
                className="absolute inset-0 bg-black/70"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setReplaceOpen(false)}
                data-testid="overlay-replace-plan"
              />

              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[430px] rounded-t-[28px] border border-[hsl(var(--border)/0.65)] bg-[hsl(var(--background)/0.70)] px-4 pb-6 pt-3 backdrop-blur-xl"
              >
                <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-[hsl(var(--border)/0.7)]" />

                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-replace-kicker">
                      Meal Plan
                    </div>
                    <div className="sc-title text-lg font-semibold" data-testid="text-replace-title">
                      Replace {replaceSlot}
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid="button-replace-close"
                    className="grid h-9 w-9 place-items-center rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.16)] text-[hsl(var(--muted-foreground))] hover:text-foreground"
                    onClick={() => setReplaceOpen(false)}
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4">
                  <WeekRail selectedDateKey={plan.selectedDateKey} onSelect={(k) => plan.setSelectedDateKey(k)} />
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-replace-suggested">
                    Suggested swaps
                  </div>
                  <button
                    type="button"
                    data-testid="button-replace-shuffle"
                    className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.12)] px-3 py-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-foreground"
                    onClick={() => {
                      // lightweight “shuffle” by changing the query seed
                      setReplaceQuery((q) => (q ? q : " "));
                      window.setTimeout(() => setReplaceQuery(""), 0);
                    }}
                  >
                    <Shuffle className="h-4 w-4" />
                    Shuffle
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {suggested.slice(0, 4).map((r, i) => (
                    <button
                      key={r.id}
                      type="button"
                      data-testid={`card-replace-suggestion-${r.id}`}
                      className="rounded-2xl glass-card border border-white/5 p-3 text-left transition-colors hover:bg-white/10"
                      onClick={() => {
                        plan.setEntry({ dateKey: plan.selectedDateKey, slot: replaceSlot, recipeId: r.id, source: "manual" });
                        setPulseKey(plan.selectedDateKey);
                        window.setTimeout(() => setPulseKey(null), 520);
                        setReplaceOpen(false);
                        setPill({ show: true, label: `Swapped · ${replaceSlot}` });
                        toast({ title: "Swapped", description: r.title });
                      }}
                    >
                      <div className="text-xs text-[hsl(var(--muted-foreground))]" data-testid={`text-replace-suggestion-kicker-${i}`}>Suggested</div>
                      <div className="mt-1 text-sm font-medium" data-testid={`text-replace-suggestion-title-${i}`}>{r.title}</div>
                      <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]" data-testid={`text-replace-suggestion-meta-${i}`}>{r.minutes} min</div>
                    </button>
                  ))}

                  {suggested.length === 0 ? (
                    <div className="col-span-2 rounded-2xl glass-card border border-white/5 p-4 text-sm text-[hsl(var(--muted-foreground))]" data-testid="text-replace-suggested-empty">
                      No suggestions yet. Try searching.
                    </div>
                  ) : null}
                </div>

                <div className="mt-4">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                    <input
                      value={replaceQuery}
                      onChange={(e) => setReplaceQuery(e.target.value)}
                      placeholder="Search recipes"
                      data-testid="input-replace-search"
                      className="h-11 w-full rounded-2xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.35)] pl-10 pr-3 text-sm text-foreground placeholder:text-[hsl(var(--muted-foreground))] backdrop-blur transition-shadow focus-visible:sc-ring"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="max-h-[40vh] overflow-auto rounded-2xl border border-white/5 bg-[hsl(var(--background)/0.06)] p-2">
                    <div className="grid gap-2">
                      {replaceList.slice(0, 12).map((r, idx) => (
                        <button
                          key={r.id}
                          type="button"
                          data-testid={`row-replace-result-${r.id}`}
                          className="group w-full rounded-2xl glass-card border border-white/5 px-3 py-3 text-left transition-colors hover:bg-white/10"
                          onClick={() => {
                            plan.setEntry({ dateKey: plan.selectedDateKey, slot: replaceSlot, recipeId: r.id, source: "manual" });
                            setPulseKey(plan.selectedDateKey);
                            window.setTimeout(() => setPulseKey(null), 520);
                            setReplaceOpen(false);
                            setPill({ show: true, label: `Swapped · ${replaceSlot}` });
                            toast({ title: "Swapped", description: r.title });
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium" data-testid={`text-replace-result-title-${idx}`}>{r.title}</div>
                              <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]" data-testid={`text-replace-result-meta-${idx}`}>
                                {r.minutes} min
                              </div>
                              {r.tags[0] ? (
                                <span className="mt-2 inline-flex items-center rounded-md bg-orange-500/10 px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-orange-400">
                                  {r.tags[0]}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-0.5 inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-bold tracking-wider uppercase text-orange-400 opacity-0 transition-opacity group-hover:opacity-100" data-testid={`badge-replace-pick-${idx}`}>Pick</div>
                          </div>
                        </button>
                      ))}

                      {replaceList.length === 0 ? (
                        <div className="rounded-2xl glass-card border border-white/5 p-4 text-sm text-[hsl(var(--muted-foreground))]" data-testid="text-replace-empty">
                          No matches. Try a different search.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          ) : null}
        </AnimatePresence>

        <BottomNav />
      </div>
    </div>
  );
}
