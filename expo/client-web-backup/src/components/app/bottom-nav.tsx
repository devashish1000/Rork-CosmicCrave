import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { BookOpen, ClipboardList, Camera, Home, UserRound } from "lucide-react";

type Tab = {
  href: string;
  label: string;
  testId: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  isHero?: boolean;
};

const tabs: Tab[] = [
  { href: "/home", label: "Home", testId: "tab-home", Icon: Home },
  { href: "/cookbooks", label: "Cookbooks", testId: "tab-cookbooks", Icon: BookOpen },
  { href: "/scan", label: "Camera", testId: "tab-camera", Icon: Camera, isHero: true },
  { href: "/shopping-list", label: "Shopping", testId: "tab-shopping-list", Icon: ClipboardList },
  { href: "/profile", label: "Profile", testId: "tab-profile", Icon: UserRound },
];

export default function BottomNav() {
  const [location] = useLocation();
  const path = location.split("?")[0] ?? location;
  const inDeepFlow = path.startsWith("/recipe/") || path.startsWith("/cook/");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30" aria-label="Bottom navigation">
      <div className="mx-auto w-full max-w-[430px] px-4 pb-4" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}>
        {/* Single unified navigation pill with all 5 icons */}
        <div
          className="liquid-glass-nav relative overflow-hidden rounded-full bg-black/20 backdrop-blur-xl"
          data-testid="nav-bottom"
          style={{
            border: '1.5px solid rgba(255, 255, 255, 0.18)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.1), 0 25px 60px -15px rgba(0, 0, 0, 0.6)',
          }}
        >
          {/* Liquid Glass Top Shimmer */}
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute inset-x-0 top-0 h-[1px]"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.25) 50%, transparent 100%)',
                opacity: 0.5
              }}
            />
          </div>

          <div className="relative flex items-center justify-center gap-5 px-6 py-2">
            {tabs.map((tab) => {
              const active = !inDeepFlow && path === tab.href;
              const isHero = tab.isHero;

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  data-testid={tab.testId}
                  aria-label={tab.label}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center justify-center rounded-full text-center ${
                    isHero ? "h-13 w-13" : "h-12 w-12"
                  }`}
                >
                  {/* Hero camera background circle */}
                  {isHero && (
                    <div className="absolute inset-0 rounded-full bg-white/[0.06] backdrop-blur-sm border border-white/10" />
                  )}

                  {/* Active state indicator - perfect circle */}
                  {active && !isHero ? (
                    <motion.div
                      layoutId="cosmiccrave-bottom-active"
                      className="pointer-events-none absolute inset-0 aspect-square rounded-full border-2 border-[hsl(var(--ring)/0.55)] bg-[hsl(var(--ring)/0.2)] shadow-[0_0_30px_rgba(255,178,102,0.6)]"
                      transition={{ type: "spring", stiffness: 400, damping: 34 }}
                    />
                  ) : null}

                  <motion.div
                    whileTap={{ scale: 0.85 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="relative z-10"
                  >
                    <tab.Icon
                      className={
                        isHero
                          ? "h-8 w-8 text-[hsl(var(--ring))] transition-all duration-200" +
                            (active ? " scale-110" : " group-hover:scale-105")
                          : "h-[18px] w-[18px] transition-all duration-200 " +
                            (active
                              ? "text-[hsl(35_55%_82%)] scale-110"
                              : "text-[hsl(35_55%_82%/0.65)] group-hover:text-[hsl(35_55%_82%/0.85)] group-hover:scale-105")
                      }
                      strokeWidth={isHero ? 2.5 : 2}
                    />
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
