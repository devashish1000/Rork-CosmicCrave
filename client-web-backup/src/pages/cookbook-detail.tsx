import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Check, Clock, LayoutGrid, Sparkles, Trash2 } from "lucide-react";

import BottomNav from "@/components/app/bottom-nav";
import { Button } from "@/components/ui/button";
import { BlurFade } from "@/components/ui/blur-fade";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { useCookbooks } from "@/lib/cookbooks-store";
import { getRecipe } from "@/lib/recipes";
import { getCookbookCover } from "@/lib/cookbook-covers";
import { getCookedIds } from "@/lib/cooked-store";
import { SafeImage } from "@/components/ui/safe-image";

type FilterOption = "all" | "to_cook" | "cooked";

export default function CookbookDetailPage({ params }: { params: { id: string } }) {
  const [, navigate] = useLocation();
  const cookbooks = useCookbooks();
  const [filter, setFilter] = useState<FilterOption>("all");
  const [cookedIds, setCookedIds] = useState<string[]>(() => getCookedIds());
  const [deleteOpen, setDeleteOpen] = useState(false);

  const cookbook = cookbooks.cookbooks.find((c) => c.id === params.id) ?? null;

  const saved = useMemo(() => {
    if (!cookbook) return [] as { savedAt: number; status?: string; recipe: NonNullable<ReturnType<typeof getRecipe>> }[];
    const list = cookbooks.getCookbookSaved(cookbook.id);
    return list
      .map((s) => ({ savedAt: s.savedAt, status: s.status, recipe: getRecipe(s.recipeId) }))
      .filter((x) => !!x.recipe) as { savedAt: number; status?: string; recipe: NonNullable<ReturnType<typeof getRecipe>> }[];
  }, [cookbook, cookbooks.getCookbookSaved]);

  const cookedSet = useMemo(() => new Set(cookedIds), [cookedIds]);

  useEffect(() => {
    setCookedIds(getCookedIds());
    const onFocus = () => setCookedIds(getCookedIds());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const filteredSaved = useMemo(() => {
    if (filter === "all") return saved;
    if (filter === "cooked") {
      return saved.filter((x) => cookedSet.has(x.recipe.id));
    }
    return saved.filter((x) => !cookedSet.has(x.recipe.id));
  }, [filter, saved, cookedSet]);

  if (!cookbook) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground">
        <div className="mx-auto min-h-screen w-full max-w-[430px] px-4 py-10">
          <div className="glass-card sc-noise overflow-hidden rounded-3xl border border-white/5 p-6">
            <div className="sc-title text-xl font-semibold" data-testid="text-cookbook-missing">
              Cookbook not found
            </div>
            <Button
              data-testid="button-cookbook-missing-back"
              className="mt-4 w-full rounded-2xl"
              onClick={() => navigate("/cookbooks")}
            >
              Back to Cookbooks
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const cover = getCookbookCover(cookbook.name || cookbook.id, cookbook.color);

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="relative mx-auto min-h-screen w-full max-w-3xl pb-24">
        <div className="relative h-64 w-full overflow-hidden">
          <div className="absolute inset-0" style={{ backgroundImage: cover.bg }} />
          <div className="absolute inset-0 bg-black/30" />
          <SafeImage
            src={cover.coverUrl}
            alt={`${cookbook.name} cover`}
            loading="lazy"
            fallbacks={["/images/food-hero-bg.png", "/images/recipe-pasta.png"]}
            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />

          <div className="absolute top-0 left-0 w-full p-6 pt-12 flex justify-between items-start z-20">
            <button
              data-testid="button-cookbooks-detail-close"
              onClick={() => navigate("/cookbooks")}
              className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            {cookbook.id !== "saved" ? (
              <button
                data-testid="button-cookbooks-detail-delete"
                onClick={() => setDeleteOpen(true)}
                className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                aria-label="Delete cookbook"
              >
                <Trash2 size={18} />
              </button>
            ) : (
              <div className="w-10" />
            )}
          </div>

          <div className="absolute bottom-0 left-0 w-full p-6 z-20">
            <div className="flex items-center gap-2 mb-2">
              <span
                data-testid="text-cookbooks-detail-level"
                className="text-[10px] font-bold tracking-widest uppercase bg-white/10 text-white px-2 py-1 rounded-md backdrop-blur-md border border-white/5"
              >
                Cookbook
              </span>
            </div>
            <h1
              data-testid="text-cookbooks-detail-title"
              className="text-4xl font-heading font-bold text-white leading-tight mb-1"
            >
              {cookbook.name}
            </h1>
            <div className="flex items-center justify-between gap-3">
              <p data-testid="text-cookbooks-detail-count" className="text-zinc-400 text-sm font-medium">
                {saved.length} recipe{saved.length === 1 ? "" : "s"}
              </p>
              <div className="flex items-center gap-2">
                {([
                  { id: "all", label: "All", Icon: LayoutGrid },
                  { id: "to_cook", label: "To Cook", Icon: Clock },
                  { id: "cooked", label: "Cooked", Icon: Check },
                ] as const).map((opt) => {
                  const active = filter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      data-testid={`button-cookbook-detail-filter-${opt.id}`}
                      onClick={() => setFilter(opt.id)}
                      className={
                        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all backdrop-blur-md " +
                        (active
                          ? "bg-white/20 text-white border border-white/30"
                          : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10")
                      }
                    >
                      <opt.Icon className="h-3.5 w-3.5" />
                      {opt.label}
                      <span
                        className={
                          "ml-1 h-1.5 w-1.5 rounded-full " + (active ? "bg-orange-400" : "bg-white/25")
                        }
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pb-24">
          {filteredSaved.length > 0 ? (
            <div className="columns-2 gap-4 space-y-4">
              {filteredSaved.map((x, i) => (
                <BlurFade
                  key={x.recipe.id}
                  delay={i * 0.06}
                  blur={14}
                  y={14}
                  className={`relative w-full ${i % 3 === 0 ? "h-64" : i % 2 === 0 ? "h-56" : "h-48"} rounded-2xl overflow-hidden break-inside-avoid group glass-card border border-white/5`}
                >
                  <SafeImage
                    data-testid={`img-cookbook-recipe-${x.recipe.id}`}
                    src={x.recipe.image || "/images/recipe-pasta.png"}
                    alt={x.recipe.title}
                    loading="lazy"
                    fallbacks={["/images/recipe-pasta.png", "/images/food-hero-bg.png"]}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                  <button
                    data-testid={`button-cookbook-recipe-open-${x.recipe.id}`}
                    aria-label={`Open recipe: ${x.recipe.title}`}
                    onClick={() => navigate(`/recipe/${x.recipe.id}?from=cookbooks&cookbook=${encodeURIComponent(cookbook.id)}`)}
                    className="absolute inset-0"
                  />

                  <div className="absolute bottom-0 inset-x-0 p-3 pointer-events-none">
                    <h3 data-testid={`text-cookbook-recipe-title-${x.recipe.id}`} className="text-white font-bold text-sm leading-tight">
                      {x.recipe.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    data-testid={`button-cookbook-recipe-remove-${x.recipe.id}`}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      cookbooks.removeRecipeFromCookbook(x.recipe.id, cookbook.id);
                      toast({ title: "Removed", description: x.recipe.title });
                    }}
                    aria-label="Remove"
                  >
                    <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                      <Trash2 size={12} />
                    </div>
                  </button>
                </BlurFade>
              ))}
            </div>
          ) : saved.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl glass-card border border-white/5">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4 text-zinc-600">
                <Sparkles size={24} />
              </div>
              <h3 data-testid="text-cookbook-empty-title" className="text-white font-bold mb-2">
                {cookbook.name} is empty
              </h3>
              <p data-testid="text-cookbook-empty-subtitle" className="text-zinc-500 text-sm max-w-[200px] mb-6">
                Start adding recipes to build your {cookbook.name}.
              </p>
              <Button
                data-testid="button-cookbook-browse-recipes"
                onClick={() => navigate("/camera")}
                className="bg-white text-black hover:bg-zinc-200 font-bold rounded-full"
              >
                Browse Recipes
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 text-center rounded-3xl glass-card border border-white/5 mt-6">
              <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center mb-3 text-zinc-500">
                <Sparkles size={22} />
              </div>
              <h3 className="text-white font-semibold mb-1">Nothing here yet</h3>
              <p className="text-zinc-500 text-sm">Try another filter.</p>
            </div>
          )}
        </div>

        <BottomNav />
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="glass-modal">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-heading font-bold">
              Delete cookbook?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-300">
              This will permanently remove “{cookbook.name}” and its saved entries from your library. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl bg-white text-black hover:bg-zinc-200"
              onClick={() => {
                cookbooks.deleteCookbook(cookbook.id);
                toast({ title: "Cookbook deleted", description: cookbook.name });
                navigate("/cookbooks");
              }}
            >
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
