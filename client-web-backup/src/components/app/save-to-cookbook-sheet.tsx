import * as React from "react";
import { motion } from "framer-motion";
import { Check, Plus, Search, Sparkles, X } from "lucide-react";

import { Drawer, DrawerContent, DrawerOverlay, DrawerPortal } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useCookbooks } from "@/lib/cookbooks-store";

function Glass({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={"glass-card sc-noise relative overflow-hidden border border-white/5 " + (className ?? "")}>
      {children}
    </div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeId: string;
  recipeTitle: string;
  defaultCookbookId?: string;
  onSaved?: (payload: { cookbookId: string; cookbookName: string; added: boolean }) => void;
};

export default function SaveToCookbookSheet({
  open,
  onOpenChange,
  recipeId,
  recipeTitle,
  defaultCookbookId = "saved",
  onSaved,
}: Props) {
  const cookbooks = useCookbooks();
  const [query, setQuery] = React.useState("");
  const [mode, setMode] = React.useState<"pick" | "create">("pick");

  const [newName, setNewName] = React.useState("");
  const [newEmoji, setNewEmoji] = React.useState("✨");

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setMode("pick");
    setNewName("");
    setNewEmoji("✨");
  }, [open]);

  const items = React.useMemo(() => {
    const base = cookbooks.cookbooks;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((c) => (c.name + " " + (c.emoji ?? "")).toLowerCase().includes(q));
  }, [cookbooks.cookbooks, query]);

  const saveInto = React.useCallback(
    (cookbookId: string) => {
      const res = cookbooks.saveRecipeToCookbook(recipeId, cookbookId);
      const cb = cookbooks.cookbooks.find((c) => c.id === cookbookId);

      if (cb) onSaved?.({ cookbookId: cb.id, cookbookName: cb.name, added: res.added });

      toast({
        title: res.added ? "Saved" : "Already saved",
        description: cb ? `${recipeTitle} → ${cb.name}` : recipeTitle,
      });
      onOpenChange(false);
    },
    [cookbooks, onOpenChange, onSaved, recipeId, recipeTitle],
  );

  const suggested = React.useMemo(() => {
    const top = cookbooks.cookbooks.find((c) => c.id === defaultCookbookId) ?? cookbooks.cookbooks[0];
    return top?.id;
  }, [cookbooks.cookbooks, defaultCookbookId]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal>
        <DrawerOverlay className="bg-black/70" data-testid="overlay-save-cookbook" />
        <DrawerContent
          className="border-[hsl(var(--border)/0.65)] bg-[hsl(var(--background)/0.68)] px-4 pb-6 pt-3 backdrop-blur-xl"
          data-testid="sheet-save-cookbook"
          aria-describedby={undefined}
        >
          <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-[hsl(var(--border)/0.7)]" />

          <div className="mt-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-save-cookbook-kicker">
                Save to cookbook
              </div>
              <div className="sc-title text-lg font-semibold" data-testid="text-save-cookbook-title">
                {recipeTitle}
              </div>
            </div>

            <button
              type="button"
              data-testid="button-save-cookbook-close"
              className="grid h-9 w-9 place-items-center rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.16)] text-[hsl(var(--muted-foreground))] hover:text-foreground"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search cookbooks"
                data-testid="input-save-cookbook-search"
                className="h-11 w-full rounded-2xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.35)] pl-10 pr-3 text-sm text-foreground placeholder:text-[hsl(var(--muted-foreground))] backdrop-blur transition-shadow focus-visible:sc-ring"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {mode === "create" ? (
              <Glass className="rounded-3xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="sc-title text-sm font-semibold" data-testid="text-save-create-title">
                      New cookbook
                    </div>
                    <div
                      className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]"
                      data-testid="text-save-create-subtitle"
                    >
                      Give it a name (and a little vibe).
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={newEmoji}
                      onChange={(e) => setNewEmoji(e.target.value.slice(0, 2))}
                      data-testid="input-save-create-emoji"
                      className="h-10 w-12 rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.14)] text-center text-sm"
                      aria-label="Emoji"
                    />
                    <button
                      type="button"
                      data-testid="button-save-create-cancel"
                      className="rounded-2xl px-3 py-2 text-xs text-[hsl(var(--muted-foreground))] hover:text-foreground"
                      onClick={() => setMode("pick")}
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Cozy soups"
                    data-testid="input-save-create-name"
                    className="h-11 flex-1 rounded-2xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.35)] px-4 text-sm text-foreground placeholder:text-[hsl(var(--muted-foreground))] backdrop-blur transition-shadow focus-visible:sc-ring"
                  />
                  <Button
                    data-testid="button-save-create-submit"
                    className="h-11 rounded-2xl px-4"
                    onClick={() => {
                      const name = newName.trim();
                      if (!name) {
                        toast({ title: "Name required", description: "Give your cookbook a title." });
                        return;
                      }
                      const cb = cookbooks.createCookbook(name, { emoji: newEmoji.trim() || "✨" });
                      saveInto(cb.id);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Create
                  </Button>
                </div>
              </Glass>
            ) : (
              <button
                type="button"
                data-testid="button-save-create-open"
                className="glass-card sc-noise w-full rounded-3xl border border-white/5 p-4 text-left transition-colors hover:bg-white/10"
                onClick={() => setMode("create")}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="sc-title text-sm font-semibold" data-testid="text-save-create-cta-title">
                      Create new cookbook
                    </div>
                    <div
                      className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]"
                      data-testid="text-save-create-cta-subtitle"
                    >
                      Organize by mood, goal, or week.
                    </div>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[hsl(var(--ring)/0.12)] ring-1 ring-[hsl(var(--ring)/0.35)]">
                    <Sparkles className="h-4 w-4 text-[hsl(var(--ring))]" />
                  </div>
                </div>
              </button>
            )}

            <div className="mt-2 grid gap-2">
              {items.map((c, idx) => {
                const isSuggested = c.id === suggested;
                const saved = cookbooks.isRecipeSavedInCookbook(recipeId, c.id);
                const count = cookbooks.getCookbookCount(c.id);
                return (
                  <motion.button
                    key={c.id}
                    type="button"
                    data-testid={`row-save-cookbook-${c.id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.02 * idx }}
                    onClick={() => saveInto(c.id)}
                  className="glass-card sc-noise w-full rounded-3xl border border-white/5 p-4 text-left transition-colors hover:bg-white/10"
                >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[hsl(var(--background)/0.16)] ring-1 ring-[hsl(var(--border)/0.65)]">
                          <span className="text-sm" data-testid={`text-save-cookbook-emoji-${c.id}`}>
                            {c.emoji ?? "📚"}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="sc-title text-sm font-semibold" data-testid={`text-save-cookbook-name-${c.id}`}>
                              {c.name}
                            </div>
                            {isSuggested ? (
                              <span
                                className="rounded-full border border-[hsl(var(--ring)/0.45)] bg-[hsl(var(--ring)/0.12)] px-2 py-0.5 text-[10px] text-[hsl(var(--ring))]"
                                data-testid={`badge-save-cookbook-suggested-${c.id}`}
                              >
                                Suggested
                              </span>
                            ) : null}
                          </div>
                          <div
                            className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]"
                            data-testid={`text-save-cookbook-count-${c.id}`}
                          >
                            {count} recipes
                          </div>
                        </div>
                      </div>

                      <div className="grid h-9 w-9 place-items-center rounded-2xl border border-[hsl(var(--border)/0.65)] bg-[hsl(var(--background)/0.12)]">
                        {saved ? (
                          <Check className="h-4 w-4 text-[hsl(var(--ring))]" />
                        ) : (
                          <Plus className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <Button
              data-testid="button-save-cookbook-quick"
              className="w-full rounded-2xl"
              onClick={() => saveInto(defaultCookbookId)}
            >
              Quick save to “Saved”
            </Button>
          </div>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}
