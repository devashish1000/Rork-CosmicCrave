import { useMemo } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Plus, ChefHat } from "lucide-react";
import { usePlan, toDateKey, addDays, dayLabel, dateNumber, type PlanSlot } from "@/lib/plan-store";
import { getRecipe } from "@/lib/recipes";

/**
 * WeeklyGridMini - Compact 7-day weekly meal planning grid for home page
 *
 * Features:
 * - Shows 7 days (Mon-Sun) with dates
 * - 3 meal slots per day (B/L/D)
 * - Empty slots show "+" to add meals
 * - Filled slots show recipe emoji/initial
 * - Tapping empty slot opens meal selector
 * - Tapping filled slot navigates to full planner for that day
 * - Mobile-optimized with horizontal scroll on tiny screens
 *
 * Edge cases handled:
 * - First-time users (empty grid with clear affordances)
 * - Long recipe names (truncated to first char or emoji)
 * - Deleted recipes (shows "?" placeholder)
 * - Mobile small screens (horizontal scroll, min widths)
 */

type DayColumn = {
  dateKey: string;
  date: Date;
  label: string;
  dayNum: number;
  isToday: boolean;
};

export default function WeeklyGridMini() {
  const [, navigate] = useLocation();
  const plan = usePlan();

  // Generate 4-day preview starting from today (mobile-optimized)
  const weekDays = useMemo<DayColumn[]>(() => {
    const today = new Date();
    const todayKey = toDateKey(today);

    return Array.from({ length: 4 }, (_, i) => {
      const date = addDays(today, i);
      const dateKey = toDateKey(date);

      return {
        dateKey,
        date,
        label: dayLabel(date),
        dayNum: dateNumber(date),
        isToday: dateKey === todayKey,
      };
    });
  }, []);

  // Check if week is completely empty
  const isEmpty = useMemo(() => {
    return weekDays.every(day => {
      const entries = plan.getDayEntries(day.dateKey);
      return !entries.breakfast && !entries.lunch && !entries.dinner;
    });
  }, [weekDays, plan]);

  // Count total planned meals
  const totalPlanned = useMemo(() => {
    let count = 0;
    weekDays.forEach(day => {
      const entries = plan.getDayEntries(day.dateKey);
      if (entries.breakfast) count++;
      if (entries.lunch) count++;
      if (entries.dinner) count++;
    });
    return count;
  }, [weekDays, plan]);

  const handleAddMeal = (dateKey: string, slot: PlanSlot) => {
    plan.setSelectedDateKey(dateKey);
    navigate(`/plan?slot=${slot}&date=${encodeURIComponent(dateKey)}`);
  };

  const handleViewDay = (dateKey: string) => {
    plan.setSelectedDateKey(dateKey);
    navigate(`/plan?date=${encodeURIComponent(dateKey)}`);
  };

  const getMealIcon = (recipeId: string | undefined) => {
    if (!recipeId) return null;

    const recipe = getRecipe(recipeId);
    if (!recipe) return "?"; // Deleted recipe

    // Try to extract emoji from title, otherwise use first letter
    const emojiMatch = recipe.title.match(/[\uD83C-\uDBFF][\uDC00-\uDFFF]/);
    if (emojiMatch) return emojiMatch[0];

    return recipe.title.charAt(0).toUpperCase();
  };

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-end justify-between mb-3">
        <div className="sc-title text-lg font-semibold flex items-center gap-2">
          This Week
          {totalPlanned > 0 && (
            <span className="text-xs font-normal text-[hsl(var(--ring))]">
              {totalPlanned} {totalPlanned === 1 ? 'meal' : 'meals'}
            </span>
          )}
        </div>

        {!isEmpty && (
          <button
            type="button"
            className="text-xs font-semibold text-[hsl(var(--ring))] hover:text-[hsl(var(--ring)/0.85)]"
            onClick={() => navigate("/plan")}
          >
            Full View
          </button>
        )}
      </div>

      {/* Empty state */}
      {isEmpty ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-6 border border-white/5 text-center"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[hsl(var(--ring)/0.1)] mb-3">
            <ChefHat className="w-6 h-6 text-[hsl(var(--ring))]" />
          </div>

          <div className="sc-title text-base font-semibold">
            Ready to plan your meals?
          </div>

          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))] max-w-[280px] mx-auto">
            Add recipes to your plan and never worry about "what's for dinner?"
          </p>

          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(var(--ring))] text-white text-sm font-semibold hover:bg-[hsl(var(--ring)/0.9)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => navigate("/plan")}
          >
            <Plus className="w-4 h-4" />
            Start Planning
          </button>
        </motion.div>
      ) : null}

      {/* Grid (only show if not empty OR if we want to show empty affordances) */}
      <div className="overflow-x-auto -mx-4 px-4 pb-2">
        <div className="inline-flex gap-2 min-w-full">
          {weekDays.map((day, dayIndex) => {
            const entries = plan.getDayEntries(day.dateKey);
            const slots: { slot: PlanSlot; label: string; fullLabel: string; entry: string | undefined }[] = [
              { slot: "breakfast", label: "B", fullLabel: "Breakfast", entry: entries.breakfast?.recipeId },
              { slot: "lunch", label: "L", fullLabel: "Lunch", entry: entries.lunch?.recipeId },
              { slot: "dinner", label: "D", fullLabel: "Dinner", entry: entries.dinner?.recipeId },
            ];

            const hasAnyMeal = slots.some(s => s.entry);

            return (
              <motion.div
                key={day.dateKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * dayIndex }}
                className="flex-1 min-w-[76px] max-w-[120px]"
              >
                {/* Day header */}
                <div
                  className={`text-center mb-2 ${
                    day.isToday
                      ? "text-[hsl(var(--ring))] font-semibold"
                      : "text-[hsl(var(--muted-foreground))]"
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wider font-medium">
                    {day.label}
                  </div>
                  <div className={`text-lg font-semibold ${day.isToday ? "text-[hsl(var(--ring))]" : ""}`}>
                    {day.dayNum}
                  </div>
                </div>

                {/* Meal slots */}
                <div className="glass-card rounded-2xl p-2 border border-white/5 space-y-2">
                  {slots.map(({ slot, label, fullLabel, entry }) => {
                    const icon = getMealIcon(entry);
                    const isDeleted = entry && icon === "?";

                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          if (entry) {
                            handleViewDay(day.dateKey);
                          } else {
                            handleAddMeal(day.dateKey, slot);
                          }
                        }}
                        className={`
                          w-full min-h-[48px] px-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium
                          transition-all
                          ${
                            entry
                              ? isDeleted
                                ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                                : "bg-[hsl(var(--ring)/0.15)] text-[hsl(var(--ring))] hover:bg-[hsl(var(--ring)/0.25)] border border-[hsl(var(--ring)/0.3)]"
                              : "bg-white/5 text-[hsl(var(--muted-foreground))] hover:bg-white/10 border border-white/10"
                          }
                        `}
                        title={entry ? `${fullLabel}: View recipe` : `${fullLabel}: Add meal`}
                      >
                        {entry ? (
                          <span className="text-lg">{icon}</span>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span className="text-xs">{label}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Day tap hint (only if day has meals) */}
                {hasAnyMeal && (
                  <button
                    type="button"
                    onClick={() => handleViewDay(day.dateKey)}
                    className="w-full mt-2 py-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--ring))] transition-colors rounded-lg hover:bg-white/5"
                  >
                    View day
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Quick actions footer */}
      {!isEmpty && (
        <div className="mt-3 flex items-center justify-between text-xs">
          <button
            type="button"
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--ring))] transition-colors"
            onClick={() => navigate("/cookbooks")}
          >
            Browse recipes →
          </button>

          <button
            type="button"
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--ring))] transition-colors"
            onClick={() => navigate("/shopping-list")}
          >
            Shopping list →
          </button>
        </div>
      )}
    </div>
  );
}
