import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";

type Props = {
  show: boolean;
  label: string;
  onHide?: () => void;
};

export default function SavedPill({ show, label, onHide }: Props) {
  React.useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => onHide?.(), 2200);
    return () => window.clearTimeout(t);
  }, [show, onHide]);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          data-testid="pill-saved-confirmation"
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2"
        >
          <div className="glass-card sc-noise flex items-center gap-2 rounded-full border border-[hsl(var(--ring)/0.35)] px-3 py-2 text-xs text-foreground shadow-[0_10px_30px_hsl(var(--background)/0.55)]">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-[hsl(var(--ring)/0.14)] ring-1 ring-[hsl(var(--ring)/0.35)]">
              <Check className="h-3.5 w-3.5 text-[hsl(var(--ring))]" />
            </span>
            <span data-testid="text-pill-saved-label">{label}</span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
