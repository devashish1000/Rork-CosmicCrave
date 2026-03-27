import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Check, Plus, SlidersHorizontal } from "lucide-react";
import BottomNav from "@/components/app/bottom-nav";
import { toast } from "@/hooks/use-toast";
import { useCookbooks } from "@/lib/cookbooks-store";
import { getCookbookCover } from "@/lib/cookbook-covers";
import { SafeImage } from "@/components/ui/safe-image";
import { PAGE_TITLE_CLASS, EYEBROW_CLASS } from "@/lib/design-tokens";

type SortOption = "newest" | "oldest" | "count_desc" | "count_asc";

const SORT_OPTIONS: { id: SortOption; label: string; subtitle: string }[] = [
  { id: "newest", label: "DATE ADDED", subtitle: "NEWEST" },
  { id: "oldest", label: "DATE ADDED", subtitle: "OLDEST" },
  { id: "count_desc", label: "TOTAL RECIPES", subtitle: "HIGH–LOW" },
  { id: "count_asc", label: "TOTAL RECIPES", subtitle: "LOW–HIGH" },
];

const MOOD_COLORS = [
  { id: "coral", color: "#ff5a45" },
  { id: "teal", color: "#21c1c7" },
  { id: "green", color: "#1cc37b" },
  { id: "magenta", color: "#c75bf2" },
  { id: "violet", color: "#7059f7" },
  { id: "gold", color: "#f0b429" },
];

const MAX_NAME_LENGTH = 30;

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

function normalizeName(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

function CollectionCard({
  id,
  title,
  recipeCount,
  color,
  onClick,
}: {
  id: string;
  title: string;
  recipeCount: number;
  color?: string;
  onClick: () => void;
}) {
  const coverSeed = title || id || "Cookbook";
  const cover = getCookbookCover(coverSeed, color);

  return (
    <motion.div
      data-testid={`card-cookbook-${id}`}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="group relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer shadow-lg glass-card border border-white/5"
      onClick={onClick}
    >
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-55" style={{ backgroundImage: cover.bg }} />
        <div className="absolute inset-0 bg-black/25" />
        <SafeImage
          data-testid={`img-cookbook-cover-${id}`}
          src={cover.coverUrl}
          alt={`${title} cover`}
          loading="lazy"
          fallbacks={["/images/food-hero-bg.png", "/images/recipe-pasta.png"]}
          className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-screen"
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />

      <div className="absolute bottom-0 inset-x-0 p-4 z-20">
        <div className="w-8 h-1 mb-3 rounded-full" style={{ background: cover.accent }} />
        <motion.h3
          data-testid={`text-cookbook-card-title-${id}`}
          className="text-white font-bold text-lg leading-tight mb-1"
        >
          {title}
        </motion.h3>
        <p data-testid={`text-cookbook-card-count-${id}`} className="text-zinc-400 text-xs font-medium">
          {recipeCount} recipe{recipeCount === 1 ? "" : "s"}
        </p>
      </div>
    </motion.div>
  );
}

export default function CookbooksPage() {
  const [, navigate] = useLocation();
  const cookbooks = useCookbooks();

  const [sortOpen, setSortOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [draftSortOption, setDraftSortOption] = useState<SortOption>(sortOption);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(MOOD_COLORS[0]?.color ?? "#ff5a45");
  const [createError, setCreateError] = useState<string | null>(null);

  const savedCount = cookbooks.getCookbookCount("saved");
  const customCookbookCount = useMemo(
    () => cookbooks.cookbooks.filter((c) => c.id !== "saved").length,
    [cookbooks.cookbooks],
  );
  const totalCookbookCount = useMemo(() => cookbooks.cookbooks.length, [cookbooks.cookbooks]);

  const sorted = useMemo(() => {
    const base = cookbooks.cookbooks.filter((c) => c.id !== "saved");
    const getCount = (id: string) => cookbooks.getCookbookCount(id);

    const list = [...base];
    if (sortOption === "newest") return list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    if (sortOption === "oldest") return list.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    if (sortOption === "count_desc") return list.sort((a, b) => getCount(b.id) - getCount(a.id));
    return list.sort((a, b) => getCount(a.id) - getCount(b.id));
  }, [cookbooks.cookbooks, cookbooks.getCookbookCount, sortOption]);

  return (
    <div data-testid="screen-cookbooks" className="min-h-screen bg-background pb-24 relative overflow-hidden">
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

        <div data-testid="section-cookbooks-content" className="pt-4 pb-6">
          <header className="relative z-10 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={PAGE_TITLE_CLASS} data-testid="text-cookbooks-title">
                  Cookbooks
                </div>
                <p
                  data-testid="text-cookbooks-subtitle"
                  className={"mt-1 " + EYEBROW_CLASS + " text-[hsl(var(--ring))]"}
                >
                  {totalCookbookCount} Cookbook{totalCookbookCount === 1 ? "" : "s"}
                  {customCookbookCount === 0 ? " • Saved only" : ""}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  data-testid="button-cookbooks-saved-open"
                  onClick={() => navigate("/cookbooks/saved")}
                  className="relative w-10 h-10 rounded-full bg-zinc-900/50 border border-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                  aria-label="Saved"
                >
                  <Bookmark size={18} />
                  {savedCount > 0 ? (
                    <span
                      data-testid="badge-cookbooks-saved-count"
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-black text-[11px] font-extrabold flex items-center justify-center"
                    >
                      {savedCount}
                    </span>
                  ) : null}
                </button>

                <motion.button
                  data-testid="button-cookbooks-filter-open"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setDraftSortOption(sortOption);
                    setSortOpen(true);
                  }}
                  className="w-10 h-10 rounded-full bg-zinc-900/50 border border-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                  aria-label="Filter & Sort"
                >
                  <SlidersHorizontal size={18} />
                </motion.button>
              </div>
            </div>
          </header>

        <motion.button
          data-testid="card-cookbooks-saved-featured"
          onClick={() => navigate("/cookbooks/saved")}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="mb-4 w-full rounded-3xl border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(15,23,42,0.65))] px-5 py-4 text-left transition-colors hover:bg-[linear-gradient(135deg,rgba(16,185,129,0.24),rgba(15,23,42,0.72))]"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-200/85">Always Available</p>
              <h3 className="mt-1 text-lg font-heading font-bold text-white">Saved Recipes</h3>
              <p className="mt-0.5 text-sm text-zinc-200/85">
                Open your default cookbook{savedCount > 0 ? ` (${savedCount} recipe${savedCount === 1 ? "" : "s"})` : ""}.
              </p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-full border border-emerald-300/30 bg-emerald-500/20 text-emerald-100">
              <Bookmark size={18} />
            </div>
          </div>
        </motion.button>

        <AnimatePresence mode="popLayout">
          <motion.div data-testid="grid-cookbooks" layout className="grid grid-cols-2 gap-4">
            <motion.div
              data-testid="card-cookbooks-create"
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setCreateError(null);
                setNewName("");
                setNewColor(MOOD_COLORS[0]?.color ?? "#ff5a45");
                setCreateOpen(true);
              }}
              className="aspect-[3/4] rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 glass-card cursor-pointer transition-colors hover:bg-white/10"
            >
              <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 border border-white/10">
                <Plus size={24} />
              </div>
              <span className="text-zinc-500 font-semibold text-sm tracking-wide">Create New</span>
            </motion.div>

            {sorted.map((book) => (
              <CollectionCard
                key={book.id}
                id={book.id}
                title={book.name}
                recipeCount={cookbooks.getCookbookCount(book.id)}
                color={book.color}
                onClick={() => navigate(`/cookbooks/${book.id}`)}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {sorted.length === 0 ? (
          <div className="mt-6 glass-card rounded-3xl border border-white/5 p-5 text-center">
            <div className="sc-title text-base font-semibold text-white">No custom cookbooks yet</div>
            <p className="mt-1 text-sm text-zinc-400">
              Your Saved Recipes cookbook is ready to use above.
            </p>
          </div>
        ) : null}
        </div>

      <AnimatePresence>
        {sortOpen && (
          <>
            <motion.div
              data-testid="backdrop-cookbooks-sort"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSortOpen(false)}
              className="fixed inset-0 z-[60] glass-backdrop"
            />

            <motion.div
              data-testid="dialog-cookbooks-sort"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="fixed left-1/2 top-1/2 z-[70] w-[calc(100vw-32px)] max-w-[430px] -translate-x-1/2 -translate-y-1/2"
            >
              <div data-testid="card-cookbooks-sort" className="glass-modal p-5">
                <div data-testid="row-cookbooks-sort-header" className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p data-testid="text-cookbooks-sort-eyebrow" className="text-[11px] font-bold tracking-widest uppercase text-zinc-500">
                      Neural Parameters
                    </p>
                    <h3 data-testid="text-cookbooks-sort-title" className="mt-1 text-xl font-heading font-bold text-white">
                      Sort cookbooks
                    </h3>
                  </div>

                  <button
                    data-testid="button-cookbooks-sort-close"
                    onClick={() => setSortOpen(false)}
                    className="w-10 h-10 shrink-0 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center"
                    aria-label="Close"
                  >
                    <span className="text-lg">×</span>
                  </button>
                </div>

                <div data-testid="content-cookbooks-sort" className="mt-4 max-h-[70vh] overflow-auto">
                  <div data-testid="list-cookbooks-sort" className="space-y-2">
                    {SORT_OPTIONS.map((opt) => {
                      const selected = opt.id === draftSortOption;
                      return (
                        <button
                          key={opt.id}
                          data-testid={`button-cookbooks-sort-${opt.id}`}
                          onClick={() => setDraftSortOption(opt.id)}
                          className={
                            "w-full text-left rounded-2xl px-4 py-4 border text-white transition-colors active:scale-[0.99] " +
                            (selected
                              ? "bg-emerald-500/10 border-emerald-500/25"
                              : "bg-white/5 hover:bg-white/10 border-white/10")
                          }
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p data-testid={`text-cookbooks-sort-label-${opt.id}`} className="text-sm font-semibold">
                                {opt.label}: {opt.subtitle}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {selected ? (
                                <span
                                  data-testid={`status-cookbooks-sort-selected-${opt.id}`}
                                  className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[11px] font-semibold text-emerald-200"
                                >
                                  <Check size={14} /> Selected
                                </span>
                              ) : (
                                <span className="text-zinc-500 text-sm">Choose</span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div data-testid="footer-cookbooks-sort" className="mt-5 pt-4 border-t border-white/10">
                    <button
                      data-testid="button-cookbooks-sort-done"
                      onClick={() => {
                        setSortOption(draftSortOption);
                        setSortOpen(false);
                      }}
                      className="w-full h-12 rounded-2xl bg-white text-black font-bold hover:bg-zinc-200 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {createOpen && (
          <>
            <motion.div
              data-testid="backdrop-cookbooks-create"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCreateOpen(false)}
              className="fixed inset-0 z-[60] glass-backdrop"
            />

            <motion.div
              data-testid="dialog-cookbooks-create"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="fixed left-1/2 top-1/2 z-[70] w-[calc(100vw-32px)] max-w-[430px] -translate-x-1/2 -translate-y-1/2"
            >
              <div data-testid="card-cookbooks-create" className="glass-modal p-5">
                <div data-testid="row-cookbooks-create-header" className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 data-testid="text-cookbooks-create-title" className="text-xl font-heading font-bold text-white">
                      New Cookbook
                    </h3>
                  </div>

                  <button
                    data-testid="button-cookbooks-create-close"
                    onClick={() => {
                      setCreateOpen(false);
                      setCreateError(null);
                      setNewName("");
                      setNewColor(MOOD_COLORS[0]?.color ?? "#ff5a45");
                    }}
                    className="w-10 h-10 shrink-0 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center"
                    aria-label="Close"
                  >
                    <span className="text-lg">×</span>
                  </button>
                </div>

                <div data-testid="content-cookbooks-create" className="mt-4 max-h-[70vh] overflow-auto">
                  <div className="space-y-5">
                    <label className="grid gap-2" data-testid="group-cookbooks-create-name">
                      <div className="text-[10px] font-semibold tracking-[0.22em] text-[hsl(var(--muted-foreground))]" data-testid="text-cookbooks-create-name-label">
                        NAME
                      </div>
                      <input
                        data-testid="input-cookbooks-create-name"
                        value={newName}
                        onChange={(e) => {
                          const next = e.target.value.slice(0, MAX_NAME_LENGTH);
                          setNewName(next);
                          setCreateError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          const name = normalizeName(newName);
                          const tooLong = name.length > MAX_NAME_LENGTH;
                          const dup = cookbooks.cookbooks.some(
                            (c) => c.id !== "saved" && normalizeName(c.name).toLowerCase() === name.toLowerCase(),
                          );
                          const valid = !!name && !tooLong && !dup;
                          if (!valid) return;
                          e.preventDefault();
                          const cb = cookbooks.createCookbook(name, { color: newColor });
                          toast({ title: "Cookbook created", description: cb.name });
                          setCreateOpen(false);
                          setNewName("");
                          setNewColor(MOOD_COLORS[0]?.color ?? "#ff5a45");
                          setCreateError(null);
                        }}
                        placeholder="e.g. Summer Grilling, Keto Favorites..."
                        className={
                          "h-12 w-full rounded-2xl border px-4 text-sm outline-none transition-colors " +
                          (createError
                            ? "border-[hsl(var(--destructive)/0.7)] bg-[hsl(var(--background)/0.10)]"
                            : "border-[hsl(var(--border)/0.65)] bg-[hsl(var(--background)/0.10)] focus:border-[hsl(var(--ring)/0.55)]")
                        }
                      />
                      <div className="flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))]">
                        <span>Max {MAX_NAME_LENGTH} characters</span>
                        <span>
                          {newName.length}/{MAX_NAME_LENGTH}
                        </span>
                      </div>
                      {createError ? (
                        <div className="text-xs text-[hsl(var(--destructive))]" data-testid="text-cookbooks-create-error">
                          {createError}
                        </div>
                      ) : null}
                    </label>

                    <div className="grid gap-2" data-testid="group-cookbooks-create-color">
                      <div className="text-[10px] font-semibold tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                        MOOD COLOR
                      </div>
                      <div className="flex items-center gap-3">
                        {MOOD_COLORS.map((option) => {
                          const selected = option.color === newColor;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setNewColor(option.color)}
                              className={`h-12 w-12 rounded-full border-2 transition-transform ${
                                selected ? "border-white scale-105" : "border-transparent"
                              }`}
                              style={{ backgroundColor: option.color }}
                              aria-label={`Select ${option.id}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const name = normalizeName(newName);
                    const tooLong = name.length > MAX_NAME_LENGTH;
                    const dup = cookbooks.cookbooks.some(
                      (c) => c.id !== "saved" && normalizeName(c.name).toLowerCase() === name.toLowerCase(),
                    );
                    const canCreate = !!name && !tooLong && !dup;

                    return (
                      <div className="mt-5 grid gap-3">
                        <button
                          type="button"
                          data-testid="button-cookbooks-create-submit"
                          className={
                            "h-12 rounded-2xl text-sm font-semibold transition-colors " +
                            (canCreate
                              ? "bg-white text-black hover:bg-zinc-200"
                              : "bg-white/20 text-white/50 cursor-not-allowed")
                          }
                          disabled={!canCreate}
                          onClick={() => {
                            if (!name) {
                              setCreateError("Name is required");
                              return;
                            }
                            if (tooLong) {
                              setCreateError(`Name must be ${MAX_NAME_LENGTH} characters or fewer`);
                              return;
                            }
                            if (dup) {
                              setCreateError(`You already have a cookbook named '${name}'`);
                              return;
                            }

                            const cb = cookbooks.createCookbook(name, { color: newColor });
                            toast({ title: "Cookbook created", description: cb.name });
                            setCreateOpen(false);
                            setNewName("");
                            setNewColor(MOOD_COLORS[0]?.color ?? "#ff5a45");
                            setCreateError(null);
                          }}
                        >
                          Create Cookbook
                        </button>

                        <button
                          type="button"
                          data-testid="button-cookbooks-create-done"
                          className="h-12 rounded-2xl bg-white text-black font-semibold hover:bg-zinc-200 transition-colors"
                          onClick={() => {
                            setCreateOpen(false);
                            setCreateError(null);
                            setNewName("");
                            setNewColor(MOOD_COLORS[0]?.color ?? "#ff5a45");
                          }}
                        >
                          Done
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

        <BottomNav />
      </div>
    </div>
  );
}
