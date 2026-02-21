import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Search, X } from "lucide-react";

import { Drawer, DrawerContent, DrawerOverlay, DrawerPortal } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { getAllRecipes, getRecipe } from "@/lib/recipes";
import WeekRail from "@/components/app/week-rail";
import { filterRecipesByPreferences, readDietaryPreferences } from "@/lib/dietary-preferences";

function Glass({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={"glass-card sc-noise relative overflow-hidden border border-white/5 " + (className ?? "")}>{children}</div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDateKey: string;
  initialSlot?: "breakfast" | "lunch" | "dinner";
  onConfirm: (payload: { dateKey: string; slot: "breakfast" | "lunch" | "dinner"; recipeId: string }) => void;
  title?: string;
};

export default function AddToPlanSheet({
  open,
  onOpenChange,
  initialDateKey,
  initialSlot = "dinner",
  onConfirm,
  title = "Add to Plan",
}: Props) {
  const [dateKey, setDateKey] = React.useState(initialDateKey);
  const [slot, setSlot] = React.useState<"breakfast" | "lunch" | "dinner">(initialSlot);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setDateKey(initialDateKey);
    setSlot(initialSlot);
    setQuery("");
  }, [open, initialDateKey, initialSlot]);

  const list = React.useMemo(() => {
    const allRecipes = getAllRecipes();
    
    // First filter by dietary preferences
    const prefs = readDietaryPreferences();
    const dietaryFiltered = filterRecipesByPreferences(allRecipes, prefs);
    
    // Then filter by search query
    const q = query.trim().toLowerCase();
    if (!q) return dietaryFiltered;
    return dietaryFiltered.filter((r) => r.title.toLowerCase().includes(q) || r.tags.join(" ").toLowerCase().includes(q));
  }, [query]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal>
        <DrawerOverlay className="bg-black/70" data-testid="overlay-add-plan" />
        <DrawerContent
          className="border-[hsl(var(--border)/0.65)] bg-[hsl(var(--background)/0.68)] px-4 pb-6 pt-3 backdrop-blur-xl"
          data-testid="sheet-add-plan"
          aria-describedby={undefined}
        >
          <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-[hsl(var(--border)/0.7)]" />

          <div className="mt-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-add-plan-kicker">
                Meal Plan
              </div>
              <div className="sc-title text-lg font-semibold" data-testid="text-add-plan-title">
                {title}
              </div>
              <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-add-plan-context">
                You’re adding to: {new Date(dateKey).toLocaleDateString(undefined, { weekday: "short" })} · {slot === "breakfast" ? "Breakfast" : slot === "lunch" ? "Lunch" : "Dinner"}
              </div>
            </div>

            <button
              type="button"
              data-testid="button-add-plan-close"
              className="grid h-9 w-9 place-items-center rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.16)] text-[hsl(var(--muted-foreground))] hover:text-foreground"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4">
            <WeekRail selectedDateKey={dateKey} onSelect={setDateKey} />
          </div>

          <div className="mt-3">
            <div className="grid grid-cols-3 gap-2" data-testid="group-add-plan-slot">
              <button
                type="button"
                data-testid="button-add-plan-slot-breakfast"
                onClick={() => setSlot("breakfast")}
                className={
                  "h-10 rounded-2xl border px-3 text-xs font-medium transition-colors focus-visible:sc-ring " +
                  (slot === "breakfast"
                    ? "border-[hsl(var(--ring)/0.7)] bg-[hsl(var(--ring)/0.16)] text-foreground"
                    : "border-[hsl(var(--border)/0.75)] bg-[hsl(var(--background)/0.10)] text-[hsl(var(--muted-foreground))] hover:text-foreground")
                }
              >
                Breakfast
              </button>
              <button
                type="button"
                data-testid="button-add-plan-slot-lunch"
                onClick={() => setSlot("lunch")}
                className={
                  "h-10 rounded-2xl border px-3 text-xs font-medium transition-colors focus-visible:sc-ring " +
                  (slot === "lunch"
                    ? "border-[hsl(var(--ring)/0.7)] bg-[hsl(var(--ring)/0.16)] text-foreground"
                    : "border-[hsl(var(--border)/0.75)] bg-[hsl(var(--background)/0.10)] text-[hsl(var(--muted-foreground))] hover:text-foreground")
                }
              >
                Lunch
              </button>
              <button
                type="button"
                data-testid="button-add-plan-slot-dinner"
                onClick={() => setSlot("dinner")}
                className={
                  "h-10 rounded-2xl border px-3 text-xs font-medium transition-colors focus-visible:sc-ring " +
                  (slot === "dinner"
                    ? "border-[hsl(var(--ring)/0.7)] bg-[hsl(var(--ring)/0.16)] text-foreground"
                    : "border-[hsl(var(--border)/0.75)] bg-[hsl(var(--background)/0.10)] text-[hsl(var(--muted-foreground))] hover:text-foreground")
                }
              >
                Dinner
              </button>
            </div>
          </div>

          <div className="mt-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search recipes"
                data-testid="input-add-plan-search"
                className="h-11 w-full rounded-2xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.35)] pl-10 pr-3 text-sm text-foreground placeholder:text-[hsl(var(--muted-foreground))] backdrop-blur transition-shadow focus-visible:sc-ring"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {list.map((r, idx) => {
              const recipe = getRecipe(r.id);
              if (!recipe) return null;

              return (
                <motion.button
                  key={recipe.id}
                  type="button"
                  data-testid={`row-add-plan-recipe-${recipe.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.02 * idx }}
                  onClick={() => {
                    onConfirm({ dateKey, slot, recipeId: recipe.id });
                    const day = new Date(dateKey).toLocaleDateString(undefined, { weekday: "short" });
                    const slotLabel = slot === "breakfast" ? "Breakfast" : slot === "lunch" ? "Lunch" : "Dinner";
                    toast({ title: `Added to ${day} · ${slotLabel}`, description: recipe.title });
                    onOpenChange(false);
                  }}
                  className="glass-card sc-noise w-full rounded-3xl border border-white/5 p-4 text-left transition-colors hover:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="sc-title text-sm font-semibold" data-testid={`text-add-plan-recipe-title-${recipe.id}`}>
                        {recipe.title}
                      </div>
                      <div
                        className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]"
                        data-testid={`text-add-plan-recipe-meta-${recipe.id}`}
                      >
                        {recipe.minutes} min
                      </div>
                    </div>
                    <div className="grid h-9 w-9 place-items-center rounded-2xl border border-[hsl(var(--border)/0.65)] bg-[hsl(var(--background)/0.12)]">
                      <ArrowRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    </div>
                  </div>
                </motion.button>
              );
            })}

            {list.length === 0 ? (
              <Glass className="rounded-3xl p-5">
                <div className="sc-title text-base font-semibold" data-testid="text-add-plan-empty-title">
                  No matches
                </div>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]" data-testid="text-add-plan-empty-body">
                  Try a different search.
                </p>
                <Button
                  data-testid="button-add-plan-empty-clear"
                  variant="outline"
                  className="mt-4 w-full rounded-2xl bg-transparent"
                  onClick={() => setQuery("")}
                >
                  Clear search
                </Button>
              </Glass>
            ) : null}
          </div>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}
