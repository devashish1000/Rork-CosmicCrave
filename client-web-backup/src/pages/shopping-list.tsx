import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Clipboard,
  Plus,
  Send,
  Share2,
  ShoppingBasket,
  X,
  CalendarPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import BottomNav from "@/components/app/bottom-nav";
import { useShopping } from "@/lib/store";
import { getRecipe } from "@/lib/recipes";
import { usePlan, toDateKey, addDays } from "@/lib/plan-store";
import { PAGE_TITLE_CLASS, EYEBROW_CLASS } from "@/lib/design-tokens";

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
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={"glass-card sc-noise relative overflow-hidden border border-white/5 " + (className ?? "")}>
      {children}
    </div>
  );
}


type Group =
  | {
      kind: "manual";
      title: string;
      subtitle: string;
      items: ReturnType<typeof useShopping>["items"];
    }
  | {
      kind: "recipe";
      recipeId: string;
      title: string;
      subtitle: string;
      items: ReturnType<typeof useShopping>["items"];
    };

function stateRank(it: ReturnType<typeof useShopping>["items"][number]) {
  return it.checked ? 2 : it.have ? 1 : 0;
}


function statePillClass(it: ReturnType<typeof useShopping>["items"][number]) {
  if (it.checked) return "border-[hsl(var(--ring)/0.45)] bg-[hsl(var(--ring)/0.12)] text-foreground";
  if (it.have) return "border-white/10 bg-white/5 text-[hsl(var(--muted-foreground))]";
  return "border-white/10 bg-white/5 text-[hsl(var(--muted-foreground))]";
}

function stateIconWrapClass(it: ReturnType<typeof useShopping>["items"][number]) {
  if (it.checked) return "border-[hsl(var(--ring)/0.65)] bg-[hsl(var(--ring)/0.18)]";
  if (it.have) return "border-white/10 bg-white/5";
  return "border-white/10 bg-white/5";
}

function stateTextClass(it: ReturnType<typeof useShopping>["items"][number]) {
  if (it.checked) return "text-[hsl(var(--muted-foreground))]";
  if (it.have) return "text-[hsl(var(--muted-foreground))]";
  return "";
}

function SourceChip({ label, testId }: { label: string; testId: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-[hsl(var(--muted-foreground))]"
      data-testid={testId}
    >
      {label}
    </span>
  );
}

function toShareText(groups: Group[], mode: "checklist" | "notes") {
  const lines: string[] = [];

  groups.forEach((g) => {
    const need = g.items.filter((i) => !i.checked && !(i.have ?? false));
    const have = g.items.filter((i) => !!i.have && !i.checked);

    if (need.length === 0 && have.length === 0) return;

    if (g.kind === "recipe") {
      lines.push(`${g.title}`);
    } else {
      lines.push("Manual");
    }

    if (need.length > 0) {
      need.forEach((it) => {
        lines.push(mode === "checklist" ? `- [ ] ${it.name}` : `- ${it.name}`);
      });
    }

    if (have.length > 0) {
      lines.push(mode === "checklist" ? "- [x] (Already have)" : "Already have:");
      have.forEach((it) => {
        lines.push(mode === "checklist" ? `- [x] ${it.name}` : `- ${it.name}`);
      });
    }

    lines.push("");
  });

  const out = lines.join("\n").trim();
  return out.length > 0 ? out : "(No remaining items)";
}

const MAX_ITEM_LENGTH = 45;

function normalizeItemInput(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function countAlphaNum(value: string) {
  return (value.match(/[a-z0-9]/gi) ?? []).length;
}

export default function ShoppingListPage() {
  const shopping = useShopping();
  const plan = usePlan();
  const [draft, setDraft] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMode, setShareMode] = useState<"checklist" | "notes">("checklist");

  const remaining = useMemo(
    () => shopping.items.filter((i) => !i.checked && !(i.have ?? false)).length,
    [shopping.items],
  );

  const haveCount = useMemo(
    () => shopping.items.filter((i) => i.have && !i.checked).length,
    [shopping.items],
  );

  const checkedCount = useMemo(
    () => shopping.items.filter((i) => i.checked).length,
    [shopping.items],
  );

  const groups = useMemo<Group[]>(() => {
    const base = shopping.items;

    const manual = base.filter((i) => i.source !== "recipe");

    const byRecipe = new Map<string, typeof base>();
    base
      .filter((i) => i.source === "recipe" && i.recipeId)
      .forEach((i) => {
        const key = i.recipeId as string;
        const cur = byRecipe.get(key) ?? [];
        cur.push(i);
        byRecipe.set(key, cur);
      });

    const recipeGroups: Group[] = Array.from(byRecipe.entries())
      .map(([recipeId, items]) => {
        const r = getRecipe(recipeId);
        const title = r?.title ?? "Recipe";
        const subtitle = title;
        return {
          kind: "recipe" as const,
          recipeId,
          title,
          subtitle,
          items,
        };
      })
      .sort((a, b) => b.items.length - a.items.length);

    const out: Group[] = [];

    if (recipeGroups.length > 0) out.push(...recipeGroups);

    if (manual.length > 0) {
      out.push({
        kind: "manual",
        title: "Manual",
        subtitle: "Added by you",
        items: manual,
      });
    }

    return out;
  }, [shopping.items]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const remainingByGroup = useMemo(() => {
    const out = new Map<string, number>();
    groups.forEach((g) => {
      const key = g.kind === "recipe" ? `r_${g.recipeId}` : "manual";
      out.set(key, g.items.filter((i) => !i.checked).length);
    });
    return out;
  }, [groups]);

  const totalGroups = groups.length;
  const collapsedCount = useMemo(() => Object.values(collapsed).filter(Boolean).length, [collapsed]);

  const handleSyncFromWeeklyPlan = () => {
    const today = new Date();
    let addedCount = 0;

    // Get all planned meals for the next 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = addDays(today, dayOffset);
      const dateKey = toDateKey(date);
      const dayEntries = plan.getDayEntries(dateKey);

      // Add ingredients from all planned meals
      Object.values(dayEntries).forEach((entry) => {
        if (!entry) return;
        const recipe = getRecipe(entry.recipeId);
        if (!recipe) return;

        // Add recipe ingredients to shopping list
        shopping.addMany(
          recipe.ingredients.map((ingredient) => ingredient.name),
          { source: "recipe", recipeId: recipe.id },
        );
        addedCount++;
      });
    }

    if (addedCount > 0) {
      toast({
        title: "Synced from weekly plan",
        description: `Added ingredients from ${addedCount} planned ${addedCount === 1 ? "meal" : "meals"}`,
      });
    } else {
      toast({
        title: "No meals planned",
        description: "Plan meals for the week to sync ingredients here",
      });
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-hidden">
      <div className="relative mx-auto min-h-screen w-full max-w-[430px] px-4 pb-24 pt-8">
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

        <header className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div
                className={PAGE_TITLE_CLASS}
                data-testid="text-shopping-title"
              >
                Shopping List
              </div>
              <p
                className={"mt-1 " + EYEBROW_CLASS + " text-[hsl(var(--ring))]"}
                data-testid="text-shopping-subtitle"
              >
                {remaining} to buy
                {haveCount > 0 ? ` • ${haveCount} have` : ""}
                {checkedCount > 0 ? ` • ${checkedCount} checked` : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="button-shopping-sync-plan"
                className="grid h-11 w-11 place-items-center rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.12)] text-[hsl(var(--muted-foreground))] transition-colors hover:text-foreground"
                onClick={handleSyncFromWeeklyPlan}
                aria-label="Sync from weekly plan"
              >
                <CalendarPlus className="h-4 w-4" />
              </button>
              <button
                type="button"
                data-testid="button-shopping-share-open"
                className="grid h-11 w-11 place-items-center rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.12)] text-[hsl(var(--muted-foreground))] transition-colors hover:text-foreground"
                onClick={() => setShareOpen(true)}
                aria-label="Send to store"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>


        </header>

        <main className="relative z-10 mt-6 grid gap-6">
          <AnimatePresence>
            {shareOpen ? (
              <>
                <motion.button
                  type="button"
                  data-testid="overlay-shopping-share"
                  className="fixed inset-0 z-40 bg-black/40"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShareOpen(false)}
                  aria-label="Close share sheet"
                />

                <motion.div
                  className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[430px] px-4 pb-[88px]"
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 24, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <div className="glass-card sc-noise overflow-hidden rounded-3xl border border-white/5 shadow-[0_30px_120px_-60px_hsl(0_0%_0%/0.9)] backdrop-blur-xl">
                    <div className="flex items-center justify-between px-5 pb-3 pt-4">
                      <div>
                        <div className="text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-shopping-share-kicker">
                          Send to store
                        </div>
                        <div className="sc-title text-lg font-semibold" data-testid="text-shopping-share-title">
                          Share your list
                        </div>
                      </div>
                      <button
                        type="button"
                        data-testid="button-shopping-share-close"
                        className="grid h-10 w-10 place-items-center rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.10)] text-[hsl(var(--muted-foreground))] transition-colors hover:text-foreground"
                        onClick={() => setShareOpen(false)}
                        aria-label="Close"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="px-5 pb-5">
                      <div className="grid gap-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            data-testid="button-shopping-share-mode-checklist"
                            className={
                              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                              (shareMode === "checklist"
                                ? "border-[hsl(var(--ring)/0.55)] bg-[hsl(var(--ring)/0.14)] text-foreground"
                                : "border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.10)] text-[hsl(var(--muted-foreground))] hover:text-foreground")
                            }
                            onClick={() => setShareMode("checklist")}
                          >
                            Checklist
                          </button>
                          <button
                            type="button"
                            data-testid="button-shopping-share-mode-notes"
                            className={
                              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                              (shareMode === "notes"
                                ? "border-[hsl(var(--ring)/0.55)] bg-[hsl(var(--ring)/0.14)] text-foreground"
                                : "border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.10)] text-[hsl(var(--muted-foreground))] hover:text-foreground")
                            }
                            onClick={() => setShareMode("notes")}
                          >
                            Notes
                          </button>
                        </div>

                        <div
                          className="rounded-3xl border border-[hsl(var(--border)/0.65)] bg-[hsl(var(--background)/0.10)] p-4"
                          data-testid="card-shopping-share-preview"
                        >
                          <div className="text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-shopping-share-preview-label">
                            Preview
                          </div>
                          <pre
                            className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap text-sm text-foreground/90"
                            data-testid="text-shopping-share-preview"
                          >
                            {toShareText(groups, shareMode)}
                          </pre>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            data-testid="button-shopping-share-copy"
                            variant="outline"
                            className="w-full rounded-2xl bg-transparent"
                            onClick={async () => {
                              const text = toShareText(groups, shareMode);
                              try {
                                await navigator.clipboard.writeText(text);
                                toast({ title: "Copied", description: "Shopping list copied to clipboard." });
                              } catch {
                                toast({ title: "Copy failed", description: "Your browser blocked clipboard access." });
                              }
                            }}
                          >
                            <Clipboard className="h-4 w-4" />
                            Copy
                          </Button>

                          <Button
                            data-testid="button-shopping-share-native"
                            className="w-full rounded-2xl"
                            onClick={async () => {
                              const text = toShareText(groups, shareMode);
                              // Mock-first: attempt native share if available, otherwise toast.
                              const nav: any = navigator;
                              if (typeof nav.share === "function") {
                                try {
                                  await nav.share({ title: "CosmicCrave Shopping List", text });
                                  toast({ title: "Shared", description: "Sent to your share sheet." });
                                  setShareOpen(false);
                                  return;
                                } catch {
                                  toast({ title: "Share canceled", description: "No worries—try Copy instead." });
                                  return;
                                }
                              }
                              toast({ title: "Share not available", description: "Use Copy to paste into Messages or Notes." });
                            }}
                          >
                            <Send className="h-4 w-4" />
                            Share
                          </Button>
                        </div>

                        <div className="text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-shopping-share-footnote">
                          Tip: Share includes items to buy + items you already have.
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>
          <Glass className="rounded-3xl p-5">
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add an item"
                data-testid="input-shopping-add"
                maxLength={MAX_ITEM_LENGTH}
                className="h-11 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-foreground placeholder:text-[hsl(var(--muted-foreground))] backdrop-blur transition-shadow focus-visible:sc-ring"
              />
              <Button
                data-testid="button-shopping-add"
                className="h-11 rounded-2xl px-4"
                onClick={() => {
                  const name = normalizeItemInput(draft);
                  if (!name) return;
                  if (name.length > MAX_ITEM_LENGTH) {
                    toast({
                      title: "Too long",
                      description: `Keep it under ${MAX_ITEM_LENGTH} characters.`,
                    });
                    return;
                  }
                  if (countAlphaNum(name) < 2) {
                    toast({
                      title: "Add a real ingredient",
                      description: "Use at least 2 letters or numbers.",
                    });
                    return;
                  }
                  const res = shopping.addOne(name, { source: "manual" });
                  if (!res.added) {
                    toast({ title: "Already in list", description: name });
                    return;
                  }
                  setDraft("");
                  toast({ title: "Added", description: name });
                }}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <div
                className="text-xs text-[hsl(var(--muted-foreground))]"
                data-testid="text-shopping-actions-hint"
              >
                Grouped by recipe for faster shopping.
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="button-shopping-clear-checked"
                  className={
                    "rounded-full border px-3 py-1.5 text-xs transition-colors " +
                    (checkedCount === 0
                      ? "border-[hsl(var(--border)/0.4)] text-[hsl(var(--muted-foreground)/0.7)]"
                      : "border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.12)] text-[hsl(var(--muted-foreground))] hover:text-foreground")
                  }
                  onClick={() => {
                    if (checkedCount === 0) return;
                    shopping.clearChecked();
                    toast({ title: "Cleared checked", description: `${checkedCount} items removed.` });
                  }}
                >
                  Clear checked
                </button>
            </div>
            </div>
          </Glass>

          <div className="grid gap-3">
            {groups.map((g, gIdx) => {
              const groupKey = g.kind === "recipe" ? `r_${g.recipeId}` : "manual";
              const isCollapsed = collapsed[groupKey] ?? false;
              const groupRemaining = remainingByGroup.get(groupKey) ?? 0;

              return (
                <motion.div
                  key={groupKey}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: 0.03 * gIdx, ease: "easeOut" }}
                >
                  <Glass className="rounded-3xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        data-testid={`button-shopping-group-toggle-${groupKey}`}
                        className="group flex min-w-0 flex-1 items-start gap-3 text-left"
                        onClick={() =>
                          setCollapsed((prev) => ({
                            ...prev,
                            [groupKey]: !(prev[groupKey] ?? false),
                          }))
                        }
                      >
                        <div className="pt-0.5">
                          <div
                            className={
                              "grid h-9 w-9 place-items-center rounded-2xl border bg-white/5 transition-colors " +
                              (isCollapsed
                                ? "border-white/10"
                                : "border-[hsl(var(--ring)/0.55)]")
                            }
                          >
                            <ChevronDown
                              className={
                                "h-4 w-4 text-[hsl(var(--muted-foreground))] transition-transform duration-200 " +
                                (isCollapsed ? "-rotate-90" : "rotate-0")
                              }
                            />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div
                            className="sc-title truncate text-sm font-semibold"
                            data-testid={`text-shopping-group-title-${gIdx}`}
                          >
                            {g.title}
                          </div>
                          <div className="mt-1">
                            <div
                              className="text-xs text-[hsl(var(--muted-foreground))]"
                              data-testid={`text-shopping-group-remaining-${gIdx}`}
                            >
                              {groupRemaining} remaining
                            </div>
                          </div>
                        </div>
                      </button>

                    </div>

                    <AnimatePresence initial={false}>
                      {!isCollapsed ? (
                        <motion.div
                          key="content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 grid gap-2">
                            {g.items
                              .slice()
                              .sort((a, b) => stateRank(a) - stateRank(b))
                              .map((it) => {
                                return (
                                  <div key={it.id} className="flex items-center justify-between gap-3">
                                    <button
                                      type="button"
                                      data-testid={`row-shopping-toggle-${it.id}`}
                                      className="flex flex-1 items-center gap-3 text-left"
                                      onClick={() => shopping.toggle(it.id)}
                                    >
                                      <div
                                        className={
                                          "grid h-6 w-6 place-items-center rounded border transition-colors " +
                                          (it.checked 
                                            ? "border-[hsl(var(--ring))] bg-[hsl(var(--ring))]" 
                                            : "border-[hsl(var(--border))] bg-transparent")
                                        }
                                      >
                                        {it.checked ? (
                                          <Check className="h-3.5 w-3.5 text-black" strokeWidth={3} />
                                        ) : null}
                                      </div>

                                      <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <div
                                            className={"text-sm font-medium " + stateTextClass(it)}
                                            data-testid={`text-shopping-item-${it.id}`}
                                          >
                                            <span className="relative inline-flex">
                                              <span>{it.name}</span>
                                              {it.checked ? (
                                                <svg
                                                  className="pointer-events-none absolute left-0 top-1/2 h-3 w-full -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
                                                  viewBox="0 0 100 12"
                                                  preserveAspectRatio="none"
                                                  aria-hidden="true"
                                                >
                                                  <path
                                                    className="squiggle-stroke"
                                                    d="M0 6 Q 6 0 12 6 T 24 6 T 36 6 T 48 6 T 60 6 T 72 6 T 84 6 T 96 6"
                                                  />
                                                </svg>
                                              ) : null}
                                            </span>
                                          </div>

                                          {it.have ? (
                                            <span
                                              className={"rounded-full border px-2 py-0.5 text-[11px] " + statePillClass(it)}
                                              data-testid={`badge-shopping-state-${it.id}`}
                                            >
                                              Have
                                            </span>
                                          ) : null}
                                        </div>
                                      </div>
                                    </button>

                                    <div className="flex items-center gap-2" />
                                  </div>
                                );
                              })}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </Glass>
                </motion.div>
              );
            })}

            {shopping.items.length === 0 ? (
              <Glass className="rounded-3xl p-5">
                <div className="sc-title text-base font-semibold" data-testid="text-shopping-empty-title">
                  Shopping list is empty
                </div>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]" data-testid="text-shopping-empty-body">
                  Add an item to get started.
                </p>
              </Glass>
            ) : null}
          </div>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
