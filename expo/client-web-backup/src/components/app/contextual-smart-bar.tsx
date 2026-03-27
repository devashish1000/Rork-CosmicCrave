import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Users, Lock, Check, Sparkles, ChefHat } from "lucide-react";
import { clamp } from "@/lib/utils";

function Glass({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={"glass-card sc-noise relative overflow-hidden border border-white/[0.08] backdrop-blur-xl " + (className ?? "")}>
      {children}
    </div>
  );
}

type SmartBarState = "unlocked" | "locked" | "celebrating" | "cooking";

type Props = {
  state: SmartBarState;
  recipeId: string;
  minutes: number;
  servings: number;
  onServingsChange: (servings: number) => void;
  canEditServings: boolean;
  onUnlockClick?: () => void;
  lockMessage?: string;
  cookingProgress?: {
    currentStep: number;
    totalSteps: number;
  };
  contextualTip?: string;
};

export default function ContextualSmartBar({
  state,
  recipeId,
  minutes,
  servings,
  onServingsChange,
  canEditServings,
  onUnlockClick,
  lockMessage = "Save recipe to unlock interactive features",
  cookingProgress,
  contextualTip,
}: Props) {
  const [showTip, setShowTip] = React.useState(false);
  const [celebrating, setCelebrating] = React.useState(state === "celebrating");

  React.useEffect(() => {
    if (state === "celebrating") {
      setCelebrating(true);
      const timer = setTimeout(() => {
        setCelebrating(false);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setCelebrating(false);
    }
  }, [state]);

  // Determine contextual tip based on recipe characteristics
  const getContextualTip = React.useMemo(() => {
    if (contextualTip) return contextualTip;
    if (minutes <= 15) return "Quick meal! Perfect for busy days 🚀";
    if (minutes <= 30) return "Moderate prep time. Great for weeknights ⏱️";
    if (servings >= 6) return "Feeds a crowd! Perfect for gatherings 👥";
    return "Delicious recipe ahead! Let's get cooking 🍳";
  }, [contextualTip, minutes, servings]);

  // Celebration state
  if (celebrating) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <Glass className="relative overflow-hidden rounded-xl p-4">
          {/* Confetti particles */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: `${20 + (i * 7)}%`,
                  top: "50%",
                  backgroundColor: ["#E87040", "#5CC8B0", "#B88CD8", "#FFD700"][i % 4],
                }}
                initial={{ opacity: 0, scale: 0, y: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.2, 0],
                  y: [-20, -60, -80],
                  x: (Math.random() - 0.5) * 100,
                }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.1,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>

          <div className="relative z-10 flex items-center justify-center gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.2 }}
            >
              <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-[hsl(var(--ring)/0.9)] to-[hsl(var(--ring)/0.7)]">
                <Check className="h-6 w-6 text-white" />
              </div>
            </motion.div>
            <div>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-base font-bold text-foreground"
              >
                Recipe Unlocked! 🎉
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xs text-muted-foreground mt-0.5"
              >
                Added to your cookbook
              </motion.div>
            </div>
          </div>
        </Glass>
      </motion.div>
    );
  }

  // Locked state
  if (state === "locked") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <Glass className="rounded-xl p-3.5">
          <motion.button
            type="button"
            onClick={onUnlockClick}
            className="w-full flex items-center justify-between gap-3 group"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[hsl(var(--ring)/0.2)] to-[hsl(var(--ring)/0.08)] text-[hsl(var(--ring))]">
                <Lock className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="text-[13px] font-semibold text-foreground group-hover:text-[hsl(var(--ring))] transition-colors">
                  {lockMessage}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Tap to unlock time, servings & more
                </div>
              </div>
            </div>
            <motion.div
              className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--ring)/0.4)] bg-[hsl(var(--ring)/0.15)] px-3 py-1.5"
              whileHover={{ borderColor: "hsl(var(--ring)/0.6)", backgroundColor: "hsl(var(--ring)/0.25)" }}
            >
              <ChefHat className="h-3.5 w-3.5 text-[hsl(var(--ring))]" />
              <span className="text-[12px] font-bold text-[hsl(var(--ring))]">Unlock</span>
            </motion.div>
          </motion.button>
        </Glass>
      </motion.div>
    );
  }

  // Cooking progress state
  if (state === "cooking" && cookingProgress) {
    const progress = (cookingProgress.currentStep / cookingProgress.totalSteps) * 100;
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <Glass className="rounded-xl p-3.5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[hsl(var(--ring)/0.2)] to-[hsl(var(--ring)/0.08)] text-[hsl(var(--ring))]">
              <ChefHat className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-semibold text-foreground">Cooking Progress</span>
                <span className="text-[11px] font-bold text-[hsl(var(--ring))]">
                  Step {cookingProgress.currentStep} of {cookingProgress.totalSteps}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[hsl(var(--background)/0.3)] overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[hsl(var(--ring)/0.9)] to-[hsl(var(--ring)/0.7)] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </Glass>
      </motion.div>
    );
  }

  // Unlocked state (default - shows time and servings)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
      className="relative"
    >
      <Glass className="rounded-xl p-3.5">
        <div className="grid grid-cols-2 gap-3">
          {/* Time */}
          <motion.div
            className="flex items-center gap-2.5"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[hsl(var(--ring)/0.2)] to-[hsl(var(--ring)/0.08)] text-[hsl(var(--ring))]">
              <Timer className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Total Time
              </div>
              <div className="mt-0.5 text-base font-bold" data-testid="text-recipe-minutes">
                {minutes} min
              </div>
            </div>
          </motion.div>

          {/* Servings */}
          <div className="flex items-center gap-2.5 border-l border-white/8 pl-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[hsl(var(--ring)/0.2)] to-[hsl(var(--ring)/0.08)] text-[hsl(var(--ring))]">
              <Users className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Servings
              </div>
              <div className="mt-0.5 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[hsl(var(--background)/0.3)] px-2 py-0.5 backdrop-blur-sm">
                <button
                  type="button"
                  aria-label="Decrease servings"
                  onClick={() => onServingsChange(clamp(servings - 1, 1, 12))}
                  disabled={!canEditServings}
                  className={
                    "grid h-5 w-5 place-items-center rounded-md border border-white/10 transition-all " +
                    (canEditServings
                      ? "hover:bg-[hsl(var(--ring)/0.15)] hover:border-[hsl(var(--ring)/0.3)] active:scale-95"
                      : "cursor-not-allowed opacity-30")
                  }
                >
                  <span className="text-[10px] font-bold">−</span>
                </button>
                <div className="min-w-[50px] text-center text-xs font-bold">
                  <span data-testid="text-recipe-servings">{servings}</span>
                </div>
                <button
                  type="button"
                  aria-label="Increase servings"
                  onClick={() => onServingsChange(clamp(servings + 1, 1, 12))}
                  disabled={!canEditServings}
                  className={
                    "grid h-5 w-5 place-items-center rounded-md border border-white/10 transition-all " +
                    (canEditServings
                      ? "hover:bg-[hsl(var(--ring)/0.15)] hover:border-[hsl(var(--ring)/0.3)] active:scale-95"
                      : "cursor-not-allowed opacity-30")
                  }
                >
                  <span className="text-[10px] font-bold">+</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Glass>

      {/* Contextual Tip Tooltip */}
      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 z-50"
          >
            <Glass className="rounded-lg p-2.5 border border-[hsl(var(--ring)/0.3)]">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--ring))]" />
                <p className="text-[11px] font-medium text-foreground">{getContextualTip}</p>
              </div>
            </Glass>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
