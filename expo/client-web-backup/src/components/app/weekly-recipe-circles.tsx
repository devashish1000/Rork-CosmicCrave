import { useMemo } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { usePlan, toDateKey, addDays, dayLabel, dateNumber, type PlanSlot } from "@/lib/plan-store";
import { getRecipe } from "@/lib/recipes";
import { SafeImage } from "@/components/ui/safe-image";

type Props = {
  onDayClick: (dateKey: string) => void;
};

export default function WeeklyRecipeCircles({ onDayClick }: Props) {
  const plan = usePlan();

  // Generate 5-day view starting from today
  const days = useMemo(() => {
    const today = new Date();
    const todayKey = toDateKey(today);

    return Array.from({ length: 5 }, (_, i) => {
      const date = addDays(today, i);
      const dateKey = toDateKey(date);
      const entries = plan.getDayEntries(dateKey);

      // Get primary recipe (dinner > lunch > breakfast)
      const primaryRecipe = entries.dinner?.recipeId
        ? getRecipe(entries.dinner.recipeId)
        : entries.lunch?.recipeId
        ? getRecipe(entries.lunch.recipeId)
        : entries.breakfast?.recipeId
        ? getRecipe(entries.breakfast.recipeId)
        : null;

      // Calculate meal dots
      const dots: { slot: PlanSlot; filled: boolean }[] = [
        { slot: "breakfast", filled: !!entries.breakfast },
        { slot: "lunch", filled: !!entries.lunch },
        { slot: "dinner", filled: !!entries.dinner },
      ];

      return {
        dateKey,
        date,
        label: dayLabel(date),
        dayNum: dateNumber(date),
        isToday: dateKey === todayKey,
        primaryRecipe,
        dots,
        isEmpty: !entries.breakfast && !entries.lunch && !entries.dinner,
      };
    });
  }, [plan]);

  return (
    <div className="relative">
      {/* Week header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="text-xs font-bold text-white uppercase tracking-wide">
          This Week
        </div>
        {days.length > 0 && (
          <div className="text-xs font-semibold text-[hsl(var(--ring))] bg-black/30 px-2 py-0.5 rounded-md">
            {(() => {
              const [y1, m1, d1] = days[0].dateKey.split('-').map(Number);
              const [y2, m2, d2] = days[days.length - 1].dateKey.split('-').map(Number);
              const start = new Date(y1, m1 - 1, d1);
              const end = new Date(y2, m2 - 1, d2);
              return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
            })()}
          </div>
        )}
      </div>

      {/* Horizontal scrollable container */}
      <div className="overflow-x-auto -mx-4 px-4 pb-3 scrollbar-hide">
        <div className="inline-flex gap-4 min-w-full">
          {days.map((day, idx) => (
            <motion.button
              key={day.dateKey}
              type="button"
              onClick={() => onDayClick(day.dateKey)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * idx }}
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.05 }}
              className="flex-shrink-0 w-[88px] group touch-manipulation"
              data-testid={`week-circle-${day.dateKey}`}
            >
              {/* Recipe circle with embedded labels */}
              <div className="relative w-[88px] h-[88px]">
                <div
                  className={`
                    w-full h-full rounded-full overflow-hidden border-[3px] transition-all duration-200 shadow-lg
                    ${
                      day.isToday
                        ? "border-[hsl(var(--ring))] shadow-[0_0_28px_rgba(255,178,102,0.6)]"
                        : day.isEmpty
                        ? "border-white/20 group-hover:border-[hsl(var(--ring)/0.5)]"
                        : "border-[hsl(var(--ring)/0.5)] group-hover:border-[hsl(var(--ring)/0.7)]"
                    }
                  `}
                >
                  {day.primaryRecipe?.image ? (
                    // Recipe photo
                    <div className="relative w-full h-full">
                      <SafeImage
                        src={day.primaryRecipe.image}
                        alt={day.primaryRecipe.title}
                        fallbacks={["/images/recipe-pasta.png", "/images/food-hero-bg.png"]}
                        className="w-full h-full object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/40" />
                    </div>
                  ) : day.isEmpty ? (
                    // Empty state - gradient + plus
                    <div
                      className="w-full h-full flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-white/5"
                      style={{
                        background:
                          "linear-gradient(135deg, hsl(var(--background)/0.5) 0%, hsl(var(--background)/0.25) 100%)",
                      }}
                    >
                      <Plus className="w-8 h-8 text-white/80 transition-all duration-300 group-hover:text-[hsl(var(--ring))] group-hover:scale-125" strokeWidth={3} />
                    </div>
                  ) : (
                    // Has meals but no photo - show emoji/initial
                    <div
                      className="w-full h-full flex items-center justify-center text-2xl font-semibold"
                      style={{
                        background:
                          "linear-gradient(135deg, hsl(var(--ring)/0.15) 0%, hsl(var(--ring)/0.05) 100%)",
                      }}
                    >
                      {day.primaryRecipe?.title.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                </div>

                {/* Day label - top arc */}
                <div className="absolute top-1 left-0 right-0 flex justify-center pointer-events-none">
                  <div
                    className={`
                      text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm
                      ${day.isToday ? "text-[hsl(var(--ring))]" : "text-white"}
                    `}
                  >
                    {day.label}
                  </div>
                </div>

                {/* Date number - bottom arc */}
                <div className="absolute bottom-1 left-0 right-0 flex justify-center items-center gap-1.5 pointer-events-none">
                  <div
                    className={`
                      text-base font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm
                      ${day.isToday ? "text-[hsl(var(--ring))]" : "text-white"}
                    `}
                  >
                    {day.dayNum}
                  </div>

                  {/* B/L/D dots inline */}
                  <div className="flex gap-1">
                    {day.dots.map(({ slot, filled }) => (
                      <div
                        key={slot}
                        className={`
                          w-1.5 h-1.5 rounded-full transition-all
                          ${
                            filled
                              ? "bg-[hsl(var(--ring))] shadow-[0_0_6px_rgba(255,178,102,0.9)]"
                              : "bg-white/40"
                          }
                        `}
                        title={
                          slot === "breakfast" ? "Breakfast" : slot === "lunch" ? "Lunch" : "Dinner"
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
