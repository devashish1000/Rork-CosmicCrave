import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Timer,
  Pause,
  Play,
  RotateCcw,
  Flame,
  Volume2,
  VolumeX,
} from "lucide-react";
import BottomNav from "@/components/app/bottom-nav";
import { Button } from "@/components/ui/button";
import { isRecipeCooked, markRecipeCooked } from "@/lib/cooked-store";
import { clearCookingSession, setCookingSession } from "@/lib/cooking-session-store";
import { useCookbooks } from "@/lib/cookbooks-store";
import { getRecipe } from "@/lib/recipes";

const MotionButton = motion.create(Button);

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
    <div className={"glass-card sc-noise relative overflow-hidden border border-white/5 " + (className ?? "")}>
      {children}
    </div>
  );
}

function useQuery() {
  const [loc] = useLocation();
  return useMemo(() => {
    const q = window.location.search ?? "";
    return new URLSearchParams(q.startsWith("?") ? q.slice(1) : q);
  }, [loc]);
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function useSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  const ensure = async () => {
    if (!enabled) return;

    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;

      if (!ctxRef.current) ctxRef.current = new Ctx();
      const ctx = ctxRef.current;
      if (!ctx) return;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }
    } catch {
      // ignore
    }
  };

  const playTone = async (type: "tick" | "done") => {
    if (!enabled) return;

    try {
      await ensure();

      const ctx = ctxRef.current;
      if (!ctx) return;

      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);

      if (type === "tick") {
        o.type = "sine";
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
        o.start();
        o.stop(ctx.currentTime + 0.09);
      } else {
        o.type = "triangle";
        o.frequency.setValueAtTime(660, ctx.currentTime);
        o.frequency.setValueAtTime(990, ctx.currentTime + 0.12);
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.42);
        o.start();
        o.stop(ctx.currentTime + 0.45);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    return () => {
      try {
        ctxRef.current?.close();
      } catch {
        // ignore
      }
      ctxRef.current = null;
    };
  }, []);

  return { playTone, ensure };
}

export default function CookModePage({ params }: { params: { id: string } }) {
  const [, navigate] = useLocation();
  const qs = useQuery();
  const cookbooks = useCookbooks();

  const recipe = getRecipe(params.id);

  const [step, setStep] = useState(0);
  const cookAgain = qs.get("cookAgain") === "1";
  const [healthLogged, setHealthLogged] = useState(() => {
    if (!recipe) return false;
    return cookAgain ? false : isRecipeCooked(recipe.id);
  });

  const totalSteps = recipe?.steps.length ?? 0;

  const setStepAndUrl = (next: number) => {
    const clamped = clamp(next, 0, Math.max(0, totalSteps - 1));
    setStep(clamped);
    navigate(`/cook/${params.id}?step=${clamped}`, { replace: true } as any);
  };

  if (!recipe) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground">
        <div className="mx-auto min-h-screen w-full max-w-[430px] px-5 py-10">
          <Glass className="rounded-3xl p-6">
            <div className="sc-title text-xl font-semibold" data-testid="text-cook-missing">
              Recipe not found
            </div>
            <Button
              data-testid="button-cook-missing-home"
              className="mt-4 w-full rounded-2xl"
              onClick={() => navigate("/home")}
            >
              Back to Home
            </Button>
          </Glass>
        </div>
      </div>
    );
  }

  const startStepRaw = Number(qs.get("step") ?? "0");
  const startStep = clamp(
    Number.isFinite(startStepRaw) ? startStepRaw : 0,
    0,
    Math.max(0, totalSteps - 1),
  );

  useEffect(() => {
    setStep(startStep);
  }, [startStep]);

  useEffect(() => {
    if (!recipe || totalSteps <= 0) return;
    setCookingSession({ recipeId: recipe.id, step, totalSteps });
  }, [recipe, step, totalSteps]);

  const active = recipe.steps[step];

  const [running, setRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  const [remaining, setRemaining] = useState(active?.timerSeconds ?? 0);

  const { playTone, ensure: ensureSound } = useSound(soundOn);

  // per-step “default” duration (so reset works even after edits)
  const stepDefaults = useMemo(() => {
    const map = new Map<number, number>();
    recipe.steps.forEach((s, idx) => map.set(idx, s.timerSeconds ?? 0));
    return map;
  }, [recipe.steps]);

  useEffect(() => {
    setRunning(false);
    setRemaining(active?.timerSeconds ?? 0);
  }, [step, active?.timerSeconds]);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) return;

    const t = setInterval(() => {
      setRemaining((v) => {
        const next = Math.max(0, v - 1);

        // last 3 seconds cue
        if (v > 0 && next > 0 && next <= 3) playTone("tick");
        if (v > 0 && next === 0) playTone("done");

        return next;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [running, remaining, playTone]);

  const progress = useMemo(() => {
    const total = totalSteps;
    const pct = total <= 0 ? 0 : ((step + 1) / total) * 100;
    return clamp(pct, 0, 100);
  }, [totalSteps, step]);

  const timerTotal = stepDefaults.get(step) ?? 0;
  const hasTimer = timerTotal > 0;
  const timerDone = hasTimer && remaining <= 0;

  const nudge = (deltaSeconds: number) => {
    if (!hasTimer) return;
    setRemaining((v) => clamp(v + deltaSeconds, 0, 60 * 60));
  };

  const timerActionsEnabled = hasTimer && !timerDone;

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="relative mx-auto min-h-screen w-full max-w-[430px] px-4 pb-24 pt-6">
        <Orb className="-left-10 top-10 h-56 w-56 bg-[hsl(var(--ring)/0.55)]" />
        <Orb className="-right-14 top-44 h-72 w-72 bg-[hsl(195_90%_55%/0.28)]" />
        <Orb className="left-10 bottom-6 h-64 w-64 bg-[hsl(275_80%_65%/0.18)]" />

        <header className="relative z-10">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              data-testid="button-cook-back"
              onClick={() => navigate(`/recipe/${recipe.id}`)}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card)/0.35)] backdrop-blur transition-colors hover:bg-[hsl(var(--card)/0.5)]"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="min-w-0 flex-1 text-right">
              <div className="text-[11px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]" data-testid="text-cook-kicker">
                Cook mode
              </div>
              <div
                className="sc-title mt-0.5 text-lg font-semibold leading-tight text-right line-clamp-2"
                data-testid="text-cook-recipe-title"
                title={recipe.title}
              >
                {recipe.title}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="button-cook-sound"
                onClick={async () => {
                  await ensureSound();
                  setSoundOn((v) => !v);
                }}
                className={
                  "grid h-10 w-10 place-items-center rounded-2xl border transition-colors " +
                  (soundOn
                    ? "border-[hsl(var(--ring)/0.55)] bg-[hsl(var(--ring)/0.12)]"
                    : "border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.12)] hover:bg-[hsl(var(--card)/0.5)]")
                }
                aria-label={soundOn ? "Sound on" : "Sound off"}
              >
                {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>

            </div>
          </div>
        </header>

        <main className="relative z-10 mt-4 grid gap-3">
          <Glass className="rounded-3xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-cook-step-label">
                    Step {step + 1} of {totalSteps}
                  </div>
                </div>

                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--background)/0.18)] ring-1 ring-[hsl(var(--border)/0.55)]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--ring)/0.35),hsl(var(--ring)/0.95))] shadow-[0_10px_30px_-18px_hsl(var(--ring)/0.9)]"
                    style={{ width: `${progress}%` }}
                    data-testid="bar-cook-progress"
                  />
                </div>

                <div className="mt-3 sc-title text-xl font-semibold leading-snug" data-testid="text-cook-step-text">
                  {active?.text}
                </div>

                {hasTimer ? (
                  <div className="mt-2 flex items-center justify-between gap-3" data-testid="row-cook-timer-inline">
                    <div className="text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-cook-timer-inline">
                      Timer for this step: <span className="font-medium text-foreground">{formatTime(timerTotal)}</span>
                    </div>
                    <button
                      type="button"
                      data-testid="button-cook-start-timer"
                      className={
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                        (timerDone
                          ? "border-[hsl(var(--ring)/0.55)] bg-[hsl(var(--ring)/0.10)] text-foreground"
                          : "border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.12)] text-[hsl(var(--muted-foreground))] hover:text-foreground")
                      }
                      onClick={async () => {
                        await ensureSound();
                        setRunning(true);
                      }}
                      disabled={timerDone}
                    >
                      Start timer
                    </button>
                  </div>
                ) : null}
              </div>

              {hasTimer ? (
                <div
                  className={
                    "grid h-11 w-11 place-items-center rounded-2xl ring-1 " +
                    (timerDone
                      ? "bg-[hsl(var(--ring)/0.18)] ring-[hsl(var(--ring)/0.55)]"
                      : "bg-[hsl(var(--card)/0.45)] ring-[hsl(var(--border)/0.65)]")
                  }
                  data-testid="icon-cook-timer"
                >
                  <Timer className={"h-5 w-5 " + (timerDone ? "text-[hsl(var(--ring))]" : "text-[hsl(var(--muted-foreground))]")} />
                </div>
              ) : null}
            </div>

            {hasTimer ? (
              <div className="mt-4 rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.14)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-timer-label">
                        Timer
                      </div>
                      {timerDone ? (
                        <span
                          className="inline-flex items-center rounded-full border border-[hsl(var(--ring)/0.55)] bg-[hsl(var(--ring)/0.12)] px-2 py-0.5 text-[11px] font-medium text-foreground"
                          data-testid="badge-timer-done"
                        >
                          Done
                        </span>
                      ) : null}
                    </div>

                    <div className="sc-title text-2xl font-semibold" data-testid="text-timer-remaining">
                      {formatTime(remaining)}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        data-testid="button-timer-add-30"
                        className={
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                          (timerActionsEnabled
                            ? "border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.12)] text-[hsl(var(--muted-foreground))] hover:text-foreground"
                            : "border-[hsl(var(--border)/0.4)] text-[hsl(var(--muted-foreground)/0.6)]")
                        }
                        onClick={() => nudge(30)}
                        disabled={!timerActionsEnabled}
                      >
                        +30s
                      </button>
                      <button
                        type="button"
                        data-testid="button-timer-add-60"
                        className={
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                          (timerActionsEnabled
                            ? "border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.12)] text-[hsl(var(--muted-foreground))] hover:text-foreground"
                            : "border-[hsl(var(--border)/0.4)] text-[hsl(var(--muted-foreground)/0.6)]")
                        }
                        onClick={() => nudge(60)}
                        disabled={!timerActionsEnabled}
                      >
                        +1m
                      </button>
                      <button
                        type="button"
                        data-testid="button-timer-reset"
                        className={
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                          (hasTimer
                            ? "border-[hsl(var(--ring)/0.55)] bg-[hsl(var(--ring)/0.10)] text-foreground hover:bg-[hsl(var(--ring)/0.14)]"
                            : "border-[hsl(var(--border)/0.4)] text-[hsl(var(--muted-foreground)/0.6)]")
                        }
                        onClick={async () => {
                          await ensureSound();
                          setRunning(false);
                          setRemaining(timerTotal);
                        }}
                        disabled={!hasTimer}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <button
                      type="button"
                      data-testid="button-timer-toggle"
                      className={
                        "grid h-11 w-11 place-items-center rounded-2xl border transition-colors " +
                        (timerDone
                          ? "border-[hsl(var(--ring)/0.55)] bg-[hsl(var(--ring)/0.12)]"
                          : "border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.12)] hover:bg-[hsl(var(--card)/0.5)]")
                      }
                      onClick={async () => {
                        await ensureSound();
                        setRunning((v) => (timerDone ? false : !v));
                      }}
                      aria-label={running ? "Pause" : "Start"}
                    >
                      {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>

                    <div className="text-[11px] text-[hsl(var(--muted-foreground))]" data-testid="text-timer-hint">
                      {timerDone ? "Timer finished" : running ? "Running" : "Paused"}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-4">
              {step >= totalSteps - 1 ? (
                <Button
                  data-testid="button-cook-prev"
                  variant="outline"
                  className="w-full rounded-2xl bg-transparent"
                  onClick={() => setStepAndUrl(step - 1)}
                  disabled={step === 0 || totalSteps <= 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    data-testid="button-cook-prev"
                    variant="outline"
                    className="w-full rounded-2xl bg-transparent"
                    onClick={() => setStepAndUrl(step - 1)}
                    disabled={step === 0 || totalSteps <= 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </Button>
                  <Button
                    data-testid="button-cook-next"
                    className="w-full rounded-2xl"
                    onClick={() => {
                      if (step >= totalSteps - 1) {
                        navigate(`/recipe/${recipe.id}`);
                        return;
                      }
                      setStepAndUrl(step + 1);
                    }}
                    disabled={totalSteps <= 0}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </Glass>

          <div className="grid gap-2" data-testid="section-cook-upnext">
            <div className="mt-2 px-1">
              <div className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]" data-testid="text-cook-upnext-title">
                Up next
              </div>
            </div>

            {recipe.steps.slice(step + 1).map((s, relIdx) => {
              const idx = step + 1 + relIdx;
              return (
                <motion.button
                  key={idx}
                  type="button"
                  data-testid={`button-cook-step-${idx}`}
                  onClick={() => setStepAndUrl(idx)}
                  className="w-full text-left rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.12)] px-4 py-3 transition-colors hover:bg-[hsl(var(--card)/0.5)]"
                >
                  <div className="text-xs text-[hsl(var(--muted-foreground))]" data-testid={`text-cook-list-step-${idx}`}>
                    Step {idx + 1}
                  </div>
                  <div className="mt-1 text-sm" data-testid={`text-cook-list-text-${idx}`}>
                    {s.text}
                  </div>
                </motion.button>
              );
            })}

            {step >= totalSteps - 1 ? (
              <Glass className="rounded-3xl p-5" data-testid="card-cook-finish">
                <div className="sc-title text-lg font-semibold" data-testid="text-cook-finish-title">
                  Finish & Save Progress
                </div>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]" data-testid="text-cook-finish-body">
                  Marks this meal cooked and saves it to your cookbook.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2" data-testid="group-cook-finish-actions">
                  <MotionButton
                    data-testid="button-cook-finish-health"
                    className={
                      "w-full rounded-2xl font-semibold transition-colors " +
                      (healthLogged
                        ? "bg-emerald-500 text-black hover:bg-emerald-400"
                        : "bg-white text-black hover:bg-zinc-200")
                    }
                    animate={
                      healthLogged
                        ? { boxShadow: "0 0 0 rgba(255,255,255,0)" }
                        : {
                            boxShadow: [
                              "0 0 0 rgba(255,255,255,0)",
                              "0 0 18px rgba(255,255,255,0.35)",
                              "0 0 0 rgba(255,255,255,0)",
                            ],
                          }
                    }
                    transition={
                      healthLogged
                        ? { duration: 0.3 }
                        : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
                    }
                    whileHover={healthLogged ? { scale: 1.01 } : { scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      markRecipeCooked(recipe.id);
                      clearCookingSession(recipe.id);
                      setHealthLogged(true);
                      // Add recipe to cookbook when finished
                      if (recipe) {
                        cookbooks.saveRecipeToCookbook(recipe.id, "saved");
                      }
                    }}
                  >
                    {healthLogged ? "Finished — Saved" : "Finished — Save Progress"}
                  </MotionButton>
                  <Button
                    data-testid="button-cook-finish-home"
                    variant="outline"
                    className="w-full rounded-2xl bg-transparent"
                    onClick={() => {
                      if (healthLogged && recipe) {
                        // Navigate to recipe detail page with "justAdded" parameter to show celebration
                        navigate(`/recipe/${recipe.id}?justAdded=1`);
                      } else {
                        navigate("/home");
                      }
                    }}
                  >
                    {healthLogged ? "View Recipe" : "Home"}
                  </Button>
                </div>
              </Glass>
            ) : null}

            {recipe.steps.slice(step + 1).length === 0 && step < totalSteps - 1 ? (
              <div className="text-sm text-[hsl(var(--muted-foreground))] px-1" data-testid="text-cook-upnext-empty">
                No more steps.
              </div>
            ) : null}
          </div>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
