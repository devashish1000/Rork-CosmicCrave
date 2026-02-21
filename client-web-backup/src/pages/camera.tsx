import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Camera, Image as ImageIcon, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import BottomNav from "@/components/app/bottom-nav";
import { PAGE_TITLE_CLASS, SECTION_TITLE_SM_CLASS, CAPTION_CLASS } from "@/lib/design-tokens";

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

export default function CameraPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="relative mx-auto min-h-screen w-full max-w-[430px] px-4 pb-24 pt-8">
        <Orb className="-left-10 top-10 h-56 w-56 bg-[hsl(var(--ring)/0.55)]" />
        <Orb className="-right-14 top-44 h-72 w-72 bg-[hsl(195_90%_55%/0.28)]" />
        <Orb className="left-10 bottom-6 h-64 w-64 bg-[hsl(275_80%_65%/0.18)]" />

        <header className="relative z-10">
          <div className={PAGE_TITLE_CLASS} data-testid="text-camera-title">
            Camera
          </div>
          <p
            className={"mt-1 " + CAPTION_CLASS}
            data-testid="text-camera-subtitle"
          >
            Prototype preview — choose how you’d like to scan.
          </p>
        </header>

        <main className="relative z-10 mt-6 grid gap-3">
          <Glass className="rounded-3xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={SECTION_TITLE_SM_CLASS} data-testid="text-camera-card-1-title">
                  Scan ingredients
                </div>
                <p
                  className={"mt-1 " + CAPTION_CLASS}
                  data-testid="text-camera-card-1-body"
                >
                  Use your camera to capture what’s on the counter.
                </p>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[hsl(var(--card)/0.45)] ring-1 ring-[hsl(var(--border)/0.65)]">
                <Camera className="h-5 w-5 text-[hsl(var(--ring))]" strokeWidth={2.3} />
              </div>
            </div>
            <div className="mt-4">
              <Button
                data-testid="button-camera-capture"
                className="w-full rounded-2xl"
                onClick={() => {
                  toast({
                    title: "Camera capture (prototype)",
                    description: "Use the new Scan flow to see Preview → Recipe Ideas.",
                  });
                  navigate("/scan");
                }}
              >
                Open Camera
              </Button>
            </div>
          </Glass>

          <Glass className="rounded-3xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={SECTION_TITLE_SM_CLASS} data-testid="text-camera-card-2-title">
                  Use gallery instead
                </div>
                <p
                  className={"mt-1 " + CAPTION_CLASS}
                  data-testid="text-camera-card-2-body"
                >
                  Pick a photo you already took.
                </p>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[hsl(var(--card)/0.45)] ring-1 ring-[hsl(var(--border)/0.65)]">
                <ImageIcon className="h-5 w-5 text-[hsl(var(--ring))]" strokeWidth={2.3} />
              </div>
            </div>
            <div className="mt-4">
              <Button
                data-testid="button-camera-gallery"
                variant="outline"
                className="w-full rounded-2xl bg-transparent"
                onClick={() => {
                  toast({ title: "Gallery (prototype)", description: "Use Scan → Preview to continue." });
                  navigate("/scan");
                }}
              >
                Choose from Photos
              </Button>
            </div>
          </Glass>

          <motion.button
            type="button"
            data-testid="button-camera-go-home"
            onClick={() => navigate("/home")}
            className="glass-card sc-noise w-full rounded-3xl border border-white/5 p-5 text-left transition-colors hover:bg-white/10"
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={SECTION_TITLE_SM_CLASS} data-testid="text-camera-cta-title">
                  Jump back to Home
                </div>
                <p
                  className={"mt-1 " + CAPTION_CLASS}
                  data-testid="text-camera-cta-body"
                >
                  View recent creations and search.
                </p>
              </div>
              <Zap className="mt-1 h-5 w-5 text-[hsl(var(--ring))]" />
            </div>
          </motion.button>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
