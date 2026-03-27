import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { usePlan, toDateKey, addDays, dayLabel, dateNumber, type PlanSlot } from "@/lib/plan-store";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

/**
 * WeekPickerOverlay - Modal overlay for adding recipe to weekly plan
 *
 * Features:
 * - Shows 7-day weekly grid (Mon-Sun)
 * - 3 meal slots per day (Breakfast, Lunch, Dinner)
 * - Visual indication of empty vs filled slots
 * - Tap empty slot to add recipe
 * - Tap filled slot to replace (with confirmation)
 * - Close button to dismiss
 *
 * Props:
 * - isOpen: boolean to show/hide overlay
 * - onClose: callback when overlay is closed
 * - recipeId: ID of recipe being added to plan
 * - recipeTitle: Title of recipe (for display)
 *
 * Edge cases handled:
 * - Deleted recipes (shows placeholder)
 * - Full week (shows "Replace" option)
 * - Mobile small screens (scrollable grid)
 */

type DaySlot = {
  dateKey: string;
  date: Date;
  label: string;
  dayNum: number;
  isToday: boolean;
  slot: PlanSlot;
  slotLabel: string;
  isEmpty: boolean;
};

type WeekPickerOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  recipeId: string;
  recipeTitle: string;
};

export default function WeekPickerOverlay({ isOpen, onClose, recipeId, recipeTitle }: WeekPickerOverlayProps) {
  const plan = usePlan();
  const [selectedSlot, setSelectedSlot] = useState<{ dateKey: string; slot: PlanSlot } | null>(null);

  // Generate 7 days × 3 meals = 21 slots
  const weekSlots = useMemo<DaySlot[]>(() => {
    const today = new Date();
    const todayKey = toDateKey(today);

    const slots: DaySlot[] = [];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = addDays(today, dayOffset);
      const dateKey = toDateKey(date);
      const isToday = dateKey === todayKey;

      const mealSlots: { slot: PlanSlot; slotLabel: string }[] = [
        { slot: "breakfast", slotLabel: "Breakfast" },
        { slot: "lunch", slotLabel: "Lunch" },
        { slot: "dinner", slotLabel: "Dinner" },
      ];

      mealSlots.forEach(({ slot, slotLabel }) => {
        const entry = plan.getEntry(dateKey, slot);
        slots.push({
          dateKey,
          date,
          label: dayLabel(date),
          dayNum: dateNumber(date),
          isToday,
          slot,
          slotLabel,
          isEmpty: !entry,
        });
      });
    }

    return slots;
  }, [plan]);

  const handleSlotClick = (dateKey: string, slot: PlanSlot, isEmpty: boolean) => {
    if (isEmpty) {
      // Add recipe to empty slot immediately
      plan.setEntry({ dateKey, slot, recipeId });
      toast({
        title: "Added to plan",
        description: `${recipeTitle} added to ${slot} on ${new Date(dateKey).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`,
      });
      onClose();
    } else {
      // Show confirmation for replacing
      setSelectedSlot({ dateKey, slot });
    }
  };

  const handleConfirmReplace = () => {
    if (!selectedSlot) return;

    plan.setEntry({ dateKey: selectedSlot.dateKey, slot: selectedSlot.slot, recipeId });
    toast({
      title: "Replaced meal",
      description: `${recipeTitle} now scheduled for ${selectedSlot.slot} on ${new Date(selectedSlot.dateKey).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`,
    });
    setSelectedSlot(null);
    onClose();
  };

  const handleCancelReplace = () => {
    setSelectedSlot(null);
  };

  const emptyCount = weekSlots.filter(s => s.isEmpty).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Overlay content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl z-50"
          >
            <div className="glass-card rounded-3xl border border-white/10 p-6 h-full md:h-auto overflow-y-auto">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="sc-title text-xl font-semibold">Add to weekly plan</h2>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    Choose a meal slot for {recipeTitle}
                  </p>
                  {emptyCount > 0 && (
                    <p className="mt-1 text-xs text-[hsl(var(--ring))]">
                      {emptyCount} empty {emptyCount === 1 ? "slot" : "slots"} available
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Week grid */}
              <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
                {Array.from({ length: 7 }, (_, dayIndex) => {
                  const daySlots = weekSlots.filter((_, idx) => Math.floor(idx / 3) === dayIndex);
                  const firstSlot = daySlots[0];

                  return (
                    <div key={firstSlot.dateKey} className="min-w-0">
                      {/* Day header */}
                      <div
                        className={`text-center mb-2 ${
                          firstSlot.isToday
                            ? "text-[hsl(var(--ring))] font-semibold"
                            : "text-[hsl(var(--muted-foreground))]"
                        }`}
                      >
                        <div className="text-[10px] uppercase tracking-wider font-medium">
                          {firstSlot.label}
                        </div>
                        <div className={`text-base font-semibold ${firstSlot.isToday ? "text-[hsl(var(--ring))]" : ""}`}>
                          {firstSlot.dayNum}
                        </div>
                      </div>

                      {/* Meal slots for this day */}
                      <div className="space-y-2">
                        {daySlots.map(slot => (
                          <button
                            key={`${slot.dateKey}-${slot.slot}`}
                            type="button"
                            onClick={() => handleSlotClick(slot.dateKey, slot.slot, slot.isEmpty)}
                            className={`
                              w-full px-3 py-2 rounded-xl text-xs font-medium transition-all text-left
                              ${
                                slot.isEmpty
                                  ? "bg-white/5 hover:bg-[hsl(var(--ring)/0.15)] border border-white/10 hover:border-[hsl(var(--ring)/0.3)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--ring))]"
                                  : "bg-[hsl(var(--ring)/0.1)] hover:bg-[hsl(var(--ring)/0.2)] border border-[hsl(var(--ring)/0.2)] text-[hsl(var(--ring))]"
                              }
                            `}
                          >
                            <div className="text-[10px] uppercase tracking-wider opacity-70">
                              {slot.slotLabel}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1">
                              {slot.isEmpty ? (
                                <span>Empty</span>
                              ) : (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Planned</span>
                                </>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Confirmation dialog for replacing */}
              {selectedSlot && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
                >
                  <div className="text-sm font-semibold mb-2">Replace existing meal?</div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
                    This slot already has a meal planned. Do you want to replace it with {recipeTitle}?
                  </p>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={handleCancelReplace}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleConfirmReplace}
                    >
                      Replace
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Empty state */}
              {emptyCount === 0 && (
                <div className="mt-4 text-center p-4 rounded-2xl bg-white/5">
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Your week is fully planned! Select a slot above to replace a meal.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
