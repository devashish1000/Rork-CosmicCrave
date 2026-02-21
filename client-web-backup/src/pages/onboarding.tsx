import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Camera, Sparkles, ChefHat, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import { setOnboardingComplete } from "@/lib/session";
import { PAGE_TITLE_CLASS, CAPTION_CLASS, BUTTON_PRIMARY_TEXT, SECTION_TITLE_CLASS } from "@/lib/design-tokens";

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [, setLocation] = useLocation();
  const [touchStart, setTouchStart] = useState(0);
  const isReplay = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URL(window.location.href).searchParams.get("replay") === "1";
  }, []);

  // Parallax effect for text
  const y = useMotionValue(0);
  const textY = useTransform(y, [0, 100], [0, -20]);

  useEffect(() => {
    const handleDeviceMotion = (e: DeviceOrientationEvent) => {
      if (e.beta) {
        y.set(e.beta);
      }
    };
    window.addEventListener("deviceorientation", handleDeviceMotion as any);
    return () => window.removeEventListener("deviceorientation", handleDeviceMotion as any);
  }, [y]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    // Swipe left to advance, right to go back
    if (diff > 50 && currentStep < 2) {
      handleNext();
    } else if (diff < -50 && currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep((prev) => prev + 1);
    } else {
      if (!isReplay) setOnboardingComplete();
      setLocation(isReplay ? "/settings" : "/login");
    }
  };

  return (
    <div
      data-testid="screen-onboarding"
      className="relative h-screen w-full max-w-[430px] mx-auto overflow-hidden bg-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNext();
          return;
        }
        if (e.key === "ArrowRight" && currentStep > 0) {
          e.preventDefault();
          setCurrentStep((prev) => prev - 1);
        }
      }}
    >
      {/* Page 1: Food Video Theater with Parallax */}
      {currentStep === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.2 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          {/* Full-screen food background */}
          <div className="absolute inset-0">
            <SafeImage
              src="/images/food-hero-bg.png"
              alt="Food"
              loading="eager"
              fallbacks={["/images/recipe-pasta.png"]}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
          </div>

          {/* Parallax text overlay */}
          <motion.div
            style={{ y: textY }}
            className="absolute inset-0 flex flex-col items-center justify-center px-8"
          >
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className={PAGE_TITLE_CLASS + " text-5xl text-white text-center leading-tight mb-4"}
            >
              Your ingredients.
              <br />
              <span className="text-[hsl(var(--ring))]">Infinite possibilities.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className={CAPTION_CLASS + " text-white/70 text-center text-lg"}
            >
              Swipe left or tap Next to begin your culinary journey
            </motion.p>
          </motion.div>

          <div className="absolute bottom-10 inset-x-0 px-8">
            <Button
              type="button"
              data-testid="button-onboarding-next-0"
              onClick={handleNext}
              className={"w-full h-14 rounded-full bg-white/90 text-black hover:bg-white " + BUTTON_PRIMARY_TEXT + " text-base"}
            >
              Next
            </Button>
          </div>

        </motion.div>
      )}

      {/* Page 2: Interactive Ingredient Scan Simulation */}
      {currentStep === 1 && (
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", damping: 30, stiffness: 200 }}
          className="absolute inset-0 bg-black"
        >
          {/* Fake camera viewfinder */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Scanning overlay */}
            <div className="absolute inset-0 border-2 border-[hsl(var(--ring))] opacity-30" />
            <motion.div
              animate={{ y: ["-100%", "100%"] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="absolute inset-x-0 h-0.5 bg-[hsl(var(--ring))] shadow-[0_0_20px_rgba(255,178,102,0.8)]"
            />

            {/* Animated ingredients popping in */}
            <div className="relative w-64 h-64">
              {["🍅", "🧄", "🌿"].map((emoji, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0, y: 100 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    delay: 0.3 + i * 0.2,
                    type: "spring",
                    damping: 12,
                    stiffness: 200,
                  }}
                  className="absolute text-6xl"
                  style={{
                    left: `${i * 30}%`,
                    top: `${i * 25}%`,
                  }}
                >
                  {emoji}
                </motion.div>
              ))}

              {/* Center rotating bowl */}
              <motion.div
                initial={{ opacity: 0, rotate: -180 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ delay: 0.8, duration: 1, type: "spring" }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[hsl(var(--ring))] to-orange-700 flex items-center justify-center shadow-2xl">
                  <Camera className="w-12 h-12 text-white" strokeWidth={2.5} />
                </div>
              </motion.div>
            </div>
          </div>

          {/* Text appears letter by letter */}
          <div className="absolute bottom-24 inset-x-0 px-8">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className={SECTION_TITLE_CLASS + " text-4xl text-white text-center"}
            >
              {["C", "o", "s", "m", "i", "c", ".", " ", "C", "r", "a", "v", "e", ".", " ", "E", "n", "j", "o", "y", "."].map(
                (letter, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 + i * 0.05, type: "spring", damping: 20 }}
                    className="inline-block text-white"
                  >
                    {letter === " " ? "\u00A0" : letter}
                  </motion.span>
                )
              )}
            </motion.h2>
          </div>

          <div className="absolute bottom-10 inset-x-0 px-8">
            <Button
              type="button"
              data-testid="button-onboarding-next-1"
              onClick={handleNext}
              className={"w-full h-14 rounded-full bg-white/90 text-black hover:bg-white " + BUTTON_PRIMARY_TEXT + " text-base"}
            >
              Next
            </Button>
          </div>
        </motion.div>
      )}

      {/* Page 3: Morphing Recipe Carousel */}
      {currentStep === 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, hsl(25, 80%, 45%) 0%, hsl(35, 90%, 55%) 100%)",
          }}
        >
          {/* Morphing recipe cards */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            {[
              "/images/recipe-pasta.png",
              "/images/recipe-salad.png",
              "/images/food-hero-bg.png",
            ].map((img, i) => (
              <motion.div
                key={i}
                initial={{ x: i * 100, rotateY: 45, opacity: 0 }}
                animate={{
                  x: [(i - 1) * 100, (i - 1) * 100 + 100],
                  rotateY: [45, -45],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  delay: i * 2,
                  ease: "easeInOut",
                }}
                className="absolute w-64 h-80 rounded-3xl overflow-hidden shadow-2xl"
                style={{ perspective: 1000 }}
              >
                <SafeImage
                  src={img}
                  alt="Recipe"
                  fallbacks={["/images/recipe-pasta.png"]}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            ))}
          </div>

          {/* Pulsing CTA */}
          <div className="absolute bottom-12 inset-x-0 px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                data-testid="button-onboarding-start"
                onClick={handleNext}
                className={"w-full h-16 rounded-full bg-white text-black hover:bg-white/90 " + BUTTON_PRIMARY_TEXT + " text-xl shadow-2xl relative overflow-hidden group"}
              >
                {/* Pulsing glow ring */}
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 rounded-full border-4 border-[hsl(var(--ring))]"
                />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isReplay ? "Back to Settings" : "Get Started"}
                  {isReplay ? <ArrowLeft className="w-6 h-6" /> : <ChefHat className="w-6 h-6" />}
                </span>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Back to Settings when replaying from Settings */}
      {isReplay && (
        <button
          type="button"
          onClick={() => setLocation("/settings")}
          className="absolute top-12 left-6 z-20 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-black/40 text-white hover:bg-white/10"
          aria-label="Back to Settings"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}

      {/* Progress dots */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: i === currentStep ? 1.2 : 1 }}
            className={`w-2 h-2 rounded-full transition-all ${
              i === currentStep ? "bg-[hsl(var(--ring))] w-8" : "bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
