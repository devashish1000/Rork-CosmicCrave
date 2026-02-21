import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Shield, HelpCircle, Info, ChevronRight, ExternalLink, Trash2, Mail } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import BottomNav from "@/components/app/bottom-nav";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  clearAllAppData,
  getActiveUserId,
  readUserScoped,
  unregisterAccount,
  writeUserScoped,
} from "@/lib/user-storage";
import { redirectToLogin } from "@/lib/session";
import { PAGE_TITLE_CLASS, CAPTION_CLASS, EYEBROW_CLASS, MODAL_TITLE_CLASS } from "@/lib/design-tokens";

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

const PRIVACY_KEYS = {
  analytics: "privacy:analytics",
  personalization: "privacy:personalization",
} as const;
const LEGACY_PRIVACY_KEYS = {
  analytics: ["snapcook:privacy:analytics"],
  personalization: ["snapcook:privacy:personalization"],
} as const;

const APP_VERSION = "v1.0.0";

const safeGetBoolean = (key: string, fallback: boolean, legacyKeys: readonly string[] = []) => {
  try {
    const v = readUserScoped(key, legacyKeys);
    if (v === "1") return true;
    if (v === "0") return false;
    return fallback;
  } catch {
    return fallback;
  }
};

const safeSetBoolean = (key: string, value: boolean) => {
  try {
    writeUserScoped(key, value ? "1" : "0");
  } catch {
    // ignore
  }
};

export default function SettingsPage() {
  const [, navigate] = useLocation();
  const [activePanel, setActivePanel] = useState<null | "privacy" | "help" | "about">(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [allowAnalytics, setAllowAnalytics] = useState(() =>
    typeof window === "undefined"
      ? true
      : safeGetBoolean(PRIVACY_KEYS.analytics, true, LEGACY_PRIVACY_KEYS.analytics),
  );
  const [allowPersonalization, setAllowPersonalization] = useState(() =>
    typeof window === "undefined"
      ? true
      : safeGetBoolean(PRIVACY_KEYS.personalization, true, LEGACY_PRIVACY_KEYS.personalization),
  );

  useEffect(() => {
    safeSetBoolean(PRIVACY_KEYS.analytics, allowAnalytics);
  }, [allowAnalytics]);

  useEffect(() => {
    safeSetBoolean(PRIVACY_KEYS.personalization, allowPersonalization);
  }, [allowPersonalization]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="relative mx-auto min-h-screen w-full max-w-[430px] px-4 pb-24 pt-6">
        <Orb className="-left-10 top-10 h-56 w-56 bg-[hsl(var(--ring)/0.55)]" />
        <Orb className="-right-14 top-44 h-72 w-72 bg-[hsl(195_90%_55%/0.28)]" />
        <Orb className="left-10 bottom-6 h-64 w-64 bg-[hsl(275_80%_65%/0.18)]" />

        <header className="relative z-10 flex items-center justify-between">
          <button
            type="button"
            data-testid="button-settings-back"
            onClick={() => navigate("/home")}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card)/0.35)] backdrop-blur transition-colors hover:bg-[hsl(var(--card)/0.5)]"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="text-right">
            <div className={PAGE_TITLE_CLASS} data-testid="text-settings-title">
              Settings
            </div>
            <div className={"mt-1 " + CAPTION_CLASS} data-testid="text-settings-subtitle">
              Support, privacy, and account controls
            </div>
          </div>
        </header>

        <main className="relative z-10 mt-6 grid gap-6">
          <section>
            <div className={EYEBROW_CLASS + " mb-2 px-1"}>
              Support
            </div>

            <Glass className="rounded-3xl overflow-hidden p-0">
              <div className="grid divide-y divide-[hsl(var(--border)/0.5)]">
                <button
                  type="button"
                  data-testid="button-settings-privacy"
                  className="flex w-full items-center justify-between p-4 bg-[hsl(var(--background)/0.14)] hover:bg-[hsl(var(--background)/0.20)] transition-colors"
                  onClick={() => setActivePanel("privacy")}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[hsl(var(--card)/0.45)] ring-1 ring-[hsl(var(--border)/0.65)]">
                      <Shield className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">Privacy & Security</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">Policy, data controls, deletion</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                </button>

                <button
                  type="button"
                  data-testid="button-settings-help"
                  className="flex w-full items-center justify-between p-4 bg-[hsl(var(--background)/0.14)] hover:bg-[hsl(var(--background)/0.20)] transition-colors"
                  onClick={() => setActivePanel("help")}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[hsl(var(--card)/0.45)] ring-1 ring-[hsl(var(--border)/0.65)]">
                      <HelpCircle className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">Help & FAQ</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">Quick answers & support</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                </button>

                <button
                  type="button"
                  data-testid="button-settings-about"
                  className="flex w-full items-center justify-between p-4 bg-[hsl(var(--background)/0.14)] hover:bg-[hsl(var(--background)/0.20)] transition-colors"
                  onClick={() => setActivePanel("about")}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[hsl(var(--card)/0.45)] ring-1 ring-[hsl(var(--border)/0.65)]">
                      <Info className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">About CosmicCrave</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">Version & legal</div>
                    </div>
                  </div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">{APP_VERSION}</div>
                </button>
              </div>
            </Glass>
          </section>
        </main>

        <BottomNav />
      </div>

      <AnimatePresence>
        {activePanel && (
          <>
            <motion.div
              data-testid="backdrop-settings-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivePanel(null)}
              className="fixed inset-0 z-[60] glass-backdrop"
            />

            <motion.div
              data-testid={`panel-settings-${activePanel}`}
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="fixed left-1/2 top-1/2 z-[70] w-[calc(100vw-32px)] max-w-[430px] -translate-x-1/2 -translate-y-1/2"
            >
              <div className="glass-modal p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className={EYEBROW_CLASS + " text-zinc-500"}>
                      {activePanel === "privacy" ? "Privacy & Security" : activePanel === "help" ? "Help & FAQ" : "About"}
                    </p>
                    <h3 className={"mt-1 " + MODAL_TITLE_CLASS + " text-white"}>
                      {activePanel === "privacy"
                        ? "Privacy controls"
                        : activePanel === "help"
                          ? "How can we help?"
                          : "About CosmicCrave"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    data-testid="button-settings-panel-close"
                    onClick={() => setActivePanel(null)}
                    className="w-10 h-10 shrink-0 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center"
                    aria-label="Close"
                  >
                    <span className="text-lg">×</span>
                  </button>
                </div>

                {activePanel === "privacy" && (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">Privacy Policy</div>
                          <div className="text-xs text-zinc-400">
                            Read how we collect and use data.
                          </div>
                        </div>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white"
                          onClick={() => toast({ title: "Privacy Policy", description: "Add your official privacy policy URL before App Store submission." })}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">Personalized recommendations</div>
                          <div className="text-xs text-zinc-400">Use your cooking history for insights.</div>
                        </div>
                        <Switch checked={allowPersonalization} onCheckedChange={setAllowPersonalization} />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">Analytics</div>
                          <div className="text-xs text-zinc-400">Share anonymous usage data.</div>
                        </div>
                        <Switch checked={allowAnalytics} onCheckedChange={setAllowAnalytics} />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">Delete Account</div>
                          <div className="text-xs text-zinc-400">Remove your data from this device.</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(true)}
                          className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/15 px-3 py-1 text-xs text-red-200"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activePanel === "help" && (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-semibold text-white">How do scans work?</div>
                      <p className="mt-1 text-xs text-zinc-400">
                        We detect ingredients from your photo and generate recipe ideas based on matches.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-semibold text-white">Can I edit my detected items?</div>
                      <p className="mt-1 text-xs text-zinc-400">
                        Yes. You can adjust what we found before generating ideas.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-semibold text-white">Need more help?</div>
                      <button
                        type="button"
                        className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white"
                        onClick={() => toast({ title: "Support", description: "Email support@cosmiccrave.app" })}
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Contact support
                      </button>
                    </div>
                  </div>
                )}

                {activePanel === "about" && (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-semibold text-white">CosmicCrave</div>
                      <p className="mt-1 text-xs text-zinc-400">
                        Version {APP_VERSION}. Build tailored for prototype evaluation.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-semibold text-white">Legal</div>
                      <p className="mt-1 text-xs text-zinc-400">
                        Terms and privacy are available in the app settings.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && (
          <>
            <motion.div
              data-testid="backdrop-settings-delete"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete(false)}
              className="fixed inset-0 z-[80] glass-backdrop"
            />
            <motion.div
              data-testid="dialog-settings-delete"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="fixed left-1/2 top-1/2 z-[90] w-[calc(100vw-32px)] max-w-[430px] -translate-x-1/2 -translate-y-1/2"
            >
              <div className="glass-modal p-5">
                <h3 className={MODAL_TITLE_CLASS + " text-white"}>Delete your account?</h3>
                <p className="mt-2 text-sm text-zinc-300">
                  This clears your local data on this device. You can sign in again anytime.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="h-11 rounded-2xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="h-11 rounded-2xl bg-red-500 text-white font-semibold hover:bg-red-400"
                    onClick={() => {
                      const activeId = getActiveUserId();
                      unregisterAccount(activeId);
                      clearAllAppData(activeId);
                      toast({ title: "Account deleted", description: "All local data removed." });
                      setConfirmDelete(false);
                      setActivePanel(null);
                      setTimeout(() => {
                        redirectToLogin(navigate);
                      }, 50);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
