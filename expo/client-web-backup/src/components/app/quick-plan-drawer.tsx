import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { usePlan, toDateKey, addDays, dayLabel, dateNumber, type PlanSlot } from "@/lib/plan-store";
import { getAllRecipes, getRecipe } from "@/lib/recipes";
import { useShopping } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { SafeImage } from "@/components/ui/safe-image";
import { filterRecipesByPreferences, readDietaryPreferences } from "@/lib/dietary-preferences";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDateKey?: string | null;
};

export default function QuickPlanDrawer({ open, onOpenChange, initialDateKey }: Props) {
  const plan = usePlan();
  const shopping = useShopping();

  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, 1 = next week, etc.
  const [selectedDay, setSelectedDay] = useState<string | null>(initialDateKey || null);
  const [selectedSlot, setSelectedSlot] = useState<PlanSlot | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [longPressTarget, setLongPressTarget] = useState<string | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<PlanSlot>("dinner"); // Default filter

  // Update selectedDay when initialDateKey changes
  React.useEffect(() => {
    if (open && initialDateKey) {
      setSelectedDay(initialDateKey);
      // Auto-detect slot based on time of day
      const hour = new Date().getHours();
      if (hour < 11) {
        setActiveFilter("breakfast");
      } else if (hour < 16) {
        setActiveFilter("lunch");
      } else {
        setActiveFilter("dinner");
      }
    } else if (!open) {
      setSelectedDay(null);
      setSelectedSlot(null);
      setSearchQuery("");
      setSelectedRecipeId(null);
      setActiveFilter("dinner");
    }
  }, [open, initialDateKey]);

  // Generate 4-day view starting from today + weekOffset
  const days = useMemo(() => {
    const today = new Date();
    const startDate = addDays(today, weekOffset * 7);

    return Array.from({ length: 4 }, (_, i) => {
      const date = addDays(startDate, i);
      const dateKey = toDateKey(date);

      return {
        dateKey,
        date,
        label: dayLabel(date),
        dayNum: dateNumber(date),
        entries: plan.getDayEntries(dateKey),
      };
    });
  }, [plan, weekOffset]);

  // Filter recipes based on search and dietary preferences
  const recipes = useMemo(() => {
    const allRecipes = getAllRecipes();
    
    // First filter by dietary preferences
    const prefs = readDietaryPreferences();
    const dietaryFiltered = filterRecipesByPreferences(allRecipes, prefs);
    
    // Then filter by search query
    if (!searchQuery.trim()) return dietaryFiltered;

    const q = searchQuery.trim().toLowerCase();
    return dietaryFiltered.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.tags.join(" ").toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSelectRecipe = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
  };

  const handleConfirmAdd = () => {
    if (!selectedDay || !selectedRecipeId) return;

    // Add to plan using the active filter as the slot
    plan.setEntry({ dateKey: selectedDay, slot: activeFilter, recipeId: selectedRecipeId, source: "manual" });

    // Auto-sync to shopping list
    const recipe = getRecipe(selectedRecipeId);
    if (recipe) {
      const ingredientNames = recipe.ingredients.map(i => i.name);
      shopping.addMany(ingredientNames, { source: "recipe", recipeId: selectedRecipeId });
    }

    // Show feedback - parse dateKey correctly (YYYY-MM-DD format)
    const [year, month, day] = selectedDay.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayName = date.toLocaleDateString(undefined, { weekday: "short" });
    const slotName = activeFilter === "breakfast" ? "Breakfast" : activeFilter === "lunch" ? "Lunch" : "Dinner";
    toast({
      title: `Added to ${dayName} ${slotName}`,
      description: recipe?.title || "Recipe added"
    });

    // Close drawer
    onOpenChange(false);
  };

  const handleRemoveMeal = (dateKey: string, slot: PlanSlot) => {
    const entry = plan.getEntry(dateKey, slot);
    if (!entry) return;

    const recipe = getRecipe(entry.recipeId);
    plan.removeEntry(dateKey, slot);

    // Parse dateKey correctly (YYYY-MM-DD format)
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayName = date.toLocaleDateString(undefined, { weekday: "short" });
    const slotName = slot === "breakfast" ? "Breakfast" : slot === "lunch" ? "Lunch" : "Dinner";
    toast({
      title: `Removed from ${dayName} ${slotName}`,
      description: recipe?.title || "Meal removed"
    });
  };

  const getMealIcon = (recipeId: string | undefined) => {
    if (!recipeId) return null;
    const recipe = getRecipe(recipeId);
    if (!recipe) return "?";

    // Extract emoji or use first letter
    const emojiMatch = recipe.title.match(/[\uD83C-\uDBFF][\uDC00-\uDFFF]/);
    return emojiMatch ? emojiMatch[0] : recipe.title.charAt(0).toUpperCase();
  };

  // Close picker view
  const closePicker = () => {
    if (selectedRecipeId) {
      // If recipe selected, clear selection
      setSelectedRecipeId(null);
    } else {
      // Otherwise close drawer
      onOpenChange(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" data-testid="quick-plan-drawer">
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (selectedRecipeId) {
                // If recipe selected, deselect it
                setSelectedRecipeId(null);
              } else {
                // Otherwise close drawer
                onOpenChange(false);
              }
            }}
            data-testid="quick-plan-overlay"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-3xl border border-[hsl(var(--border)/0.65)] bg-[hsl(var(--background)/0.97)] backdrop-blur-2xl shadow-[0_-20px_60px_rgba(0,0,0,0.5)]"
          >
            {/* Handle */}
            <div className="mx-auto mt-3 h-1 w-14 rounded-full bg-[hsl(var(--muted-foreground)/0.4)]" />

            {selectedDay && (
              // Simplified recipe picker view
              <div className="px-4 pb-6 pt-4 max-h-[80vh] flex flex-col">
                {/* Header with date and close/added button */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">
                      {(() => {
                        const [year, month, day] = selectedDay.split('-').map(Number);
                        const date = new Date(year, month - 1, day);
                        return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
                      })()}
                    </div>
                    <div className="sc-title text-lg font-semibold">
                      Add Meal
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={selectedRecipeId ? handleConfirmAdd : closePicker}
                    className={`
                      px-4 h-9 rounded-xl font-medium text-sm transition-all
                      ${
                        selectedRecipeId
                          ? "bg-[hsl(var(--ring))] text-black hover:bg-[hsl(var(--ring)/0.9)] shadow-lg"
                          : "border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.16)] text-[hsl(var(--muted-foreground))] hover:text-foreground"
                      }
                    `}
                    aria-label={selectedRecipeId ? "Confirm add" : "Close"}
                  >
                    {selectedRecipeId ? "Added" : "Close"}
                  </button>
                </div>

                {/* Meal type filter tabs */}
                <div className="flex gap-2 mb-4">
                  {(["breakfast", "lunch", "dinner"] as PlanSlot[]).map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setActiveFilter(slot)}
                      className={`
                        flex-1 h-10 rounded-xl text-sm font-medium transition-all capitalize
                        ${
                          activeFilter === slot
                            ? "bg-[hsl(var(--ring)/0.2)] text-[hsl(var(--ring))] border-2 border-[hsl(var(--ring)/0.4)]"
                            : "bg-white/5 text-[hsl(var(--muted-foreground))] border border-white/10 hover:bg-white/10"
                        }
                      `}
                    >
                      {slot}
                    </button>
                  ))}
                </div>

                {/* Adding to indicator */}
                <div className="mb-3 text-xs text-center text-[hsl(var(--muted-foreground))]">
                  Adding to: <span className="font-semibold text-[hsl(var(--ring))] capitalize">{activeFilter}</span>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" strokeWidth={2.5} />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search recipes"
                    className="h-11 w-full rounded-2xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.35)] pl-10 pr-3 text-sm text-foreground placeholder:text-[hsl(var(--muted-foreground))] backdrop-blur transition-shadow focus-visible:sc-ring"
                  />
                </div>

                {/* Recipe list */}
                <div className="flex-1 overflow-auto -mx-4 px-4">
                  <div className="space-y-2.5">
                    {recipes.length === 0 ? (
                      <div className="glass-card rounded-3xl p-5 border border-white/5 text-center">
                        <div className="sc-title text-sm font-semibold">No recipes found</div>
                        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                          {searchQuery ? "Try a different search" : "Scan ingredients to discover recipes"}
                        </p>
                      </div>
                    ) : (
                      recipes.slice(0, 20).map((r, idx) => {
                        const recipe = getRecipe(r.id);
                        if (!recipe) return null;

                        const isSelected = selectedRecipeId === recipe.id;

                        // Check if already planned for this slot
                        const isAlreadyPlanned = selectedDay
                          ? plan.getEntry(selectedDay, activeFilter)?.recipeId === recipe.id
                          : false;

                        return (
                          <motion.button
                            key={recipe.id}
                            type="button"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.02 * idx }}
                            onClick={() => handleSelectRecipe(recipe.id)}
                            className={`
                              w-full glass-card rounded-2xl p-4 text-left transition-all active:scale-[0.98] relative
                              ${
                                isSelected
                                  ? "border-2 border-emerald-500 bg-emerald-500/10 shadow-lg"
                                  : isAlreadyPlanned
                                  ? "border border-white/20 bg-white/5"
                                  : "border border-white/5 hover:bg-white/10 hover:border-white/10"
                              }
                            `}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="sc-title text-sm font-semibold truncate">{recipe.title}</div>
                                  {isSelected && (
                                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                                    {recipe.minutes} min
                                  </span>
                                  {isAlreadyPlanned && (
                                    <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                                      Planned
                                    </span>
                                  )}
                                </div>
                              </div>
                              {recipe.image && (
                                <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border border-white/10">
                                  <SafeImage
                                    src={recipe.image}
                                    alt=""
                                    fallbacks={["/images/recipe-pasta.png"]}
                                    className="w-full h-full object-cover object-center"
                                  />
                                </div>
                              )}
                            </div>
                          </motion.button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
