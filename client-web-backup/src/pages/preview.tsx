import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Image as ImageIcon, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { SafeImage } from "@/components/ui/safe-image";
import { safeParseDetectedItems, storeScanPayload } from "@/lib/scan-payload";
import { readScanDraft, removeScanDraft } from "@/lib/scan-draft";
import { AnalyzeScanError, analyzeScan } from "@/lib/scan-api";
import { storeScanIdeas } from "@/lib/scan-ideas";
import { recordScanUsage, removeScanUsage } from "@/lib/scan-usage";
import { readDietaryPreferences } from "@/lib/dietary-preferences";
import { toast } from "@/hooks/use-toast";
import { SECTION_TITLE_CLASS, CAPTION_CLASS, CAPTION_XS_CLASS, CHIP_LABEL_CLASS } from "@/lib/design-tokens";

const HOLD_MS = 780;

type PreviewSource = "camera" | "gallery";

function isAuthAnalyzeError(error: unknown) {
  if (error instanceof AnalyzeScanError) return error.status === 401;
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("invalid authorization header") ||
    message.includes("invalid or expired token") ||
    message.includes("not authenticated")
  );
}

export default function PreviewPage() {
  const [, setLocation] = useLocation();

  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const rafRef = useRef<number | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { imageUri, source, detectedItems, draftId } = useMemo(() => {
    const url = new URL(window.location.href);
    const img = url.searchParams.get("imageUri") ?? "";
    const src = (url.searchParams.get("source") ?? "camera") as PreviewSource;
    const detected = safeParseDetectedItems(url.searchParams.get("detectedItems"));
    const nextDraftId = url.searchParams.get("draftId") ?? "";
    return { imageUri: img, source: src, detectedItems: detected, draftId: nextDraftId };
  }, []);
  const draft = useMemo(() => readScanDraft(draftId), [draftId]);
  const resolvedSource: PreviewSource = draft?.source ?? source;
  
  // Validate and get preview image
  const previewImage = useMemo(() => {
    const draftImage = draft?.imageDataUrl;
    const uriImage = imageUri;
    
    // Prefer draft image, then URI, then fallback
    if (draftImage && draftImage.startsWith('data:image/')) {
      return draftImage;
    }
    if (uriImage && uriImage.startsWith('data:image/')) {
      return uriImage;
    }
    if (uriImage && uriImage.startsWith('/')) {
      return uriImage;
    }
    return "/images/food-hero-bg.png";
  }, [draft?.imageDataUrl, imageUri]);
  
  // For persistence, use a shorter identifier if the data URL is too long
  const persistedImageUri = (previewImage.startsWith('data:') && previewImage.length > 1800) 
    ? "/images/food-hero-bg.png" 
    : previewImage;

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    };
  }, []);

  const retakeLabel = source === "gallery" ? "Choose another (free)" : "Retake (free)";

  const onRetake = () => {
    if (isScanning) return;
    if (draftId) removeScanDraft(draftId);
    if (resolvedSource === "gallery") {
      setLocation("/camera?openGallery=1");
      return;
    }
    setLocation("/camera");
  };

  const stopHold = () => {
    setIsHolding(false);
    setHoldProgress(0);
    holdStartRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const beginHold = () => {
    if (isScanning) return;
    setIsHolding(true);
    holdStartRef.current = performance.now();

    const tick = (t: number) => {
      const start = holdStartRef.current;
      if (!start) return;
      const elapsed = t - start;
      const p = Math.min(1, elapsed / HOLD_MS);
      setHoldProgress(p);

      if (p >= 1) {
        holdStartRef.current = null;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;

        setIsHolding(false);
        setIsScanning(true);

        void (async () => {
          const startedAt = Date.now();
          const scanId = crypto.randomUUID();
          // A scan is consumed once the user commits to analyze.
          recordScanUsage({ id: scanId, source: resolvedSource, at: startedAt });
          
          // Add timeout to prevent infinite "Analyzing..." state
          scanTimeoutRef.current = setTimeout(() => {
            setIsScanning(false);
            scanTimeoutRef.current = null;
            toast({
              title: "Scan timeout",
              description: "The scan is taking longer than expected. Please try again.",
            });
          }, 60000); // 60 second timeout
          const timeoutId = scanTimeoutRef.current;
          
          try {
            // Get dietary preferences to pass to AI
            const prefs = readDietaryPreferences();
            
            const analyzed = await analyzeScan({
              scanId,
              source: resolvedSource,
              imageDataUrl:
                draft?.imageDataUrl ||
                (imageUri.startsWith("data:image/") ? imageUri : undefined),
              detectedHint: detectedItems.map((item) => item.name),
              dietaryPreferences: {
                dietType: prefs.dietType,
                allergies: prefs.allergies,
              },
            });
            
            if (timeoutId) {
              clearTimeout(timeoutId);
              scanTimeoutRef.current = null;
            }
            
            const normalizedIdeas = storeScanIdeas(analyzed);
            const finalScanId = normalizedIdeas?.scanId ?? scanId;
            const nextDetected =
              normalizedIdeas?.detectedItems.length
                ? normalizedIdeas.detectedItems
                : detectedItems.length
                  ? detectedItems
                  : [
                      { name: "Tomatoes", confidence: 0.98, source: "scan" },
                      { name: "Basil", confidence: 0.95, source: "scan" },
                      { name: "Pasta", confidence: 0.92, source: "scan" },
                    ];

            const elapsed = Date.now() - startedAt;
            if (elapsed < 900) {
              await new Promise((resolve) => window.setTimeout(resolve, 900 - elapsed));
            }

            storeScanPayload({
              scanId: finalScanId,
              imageUri: persistedImageUri,
              source: resolvedSource,
              detectedItems: nextDetected,
              createdAt: Date.now(),
            });
            if (draftId) removeScanDraft(draftId);

            const usp = new URLSearchParams();
            usp.set("scanId", finalScanId);
            usp.set("source", resolvedSource);
            setIsScanning(false);
            setLocation(`/ideas?${usp.toString()}`);
          } catch (error) {
            if (timeoutId) {
              clearTimeout(timeoutId);
              scanTimeoutRef.current = null;
            }
            setIsScanning(false);
            
            if (isAuthAnalyzeError(error)) {
              removeScanUsage(scanId);
              toast({
                title: "Sign in required",
                description: "Please sign in again to generate AI recipe ideas.",
              });
              setLocation("/login");
              return;
            }

            // Handle quota exceeded errors
            if (error instanceof AnalyzeScanError && error.status === 403) {
              toast({
                title: "Scan limit reached",
                description: error.message || "You've reached your scan limit for this period.",
              });
              return;
            }

            // Handle other errors - show error but allow retry
            console.error("Scan error:", error);
            toast({
              title: "Scan failed",
              description: error instanceof Error ? error.message : "Unable to analyze ingredients. Please try again.",
            });
          }
        })();

        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  return (
    <div data-testid="screen-preview" className="relative h-screen w-full bg-black overflow-hidden">
      <div data-testid="section-preview-image" className="absolute inset-0">
        <SafeImage
          data-testid="img-preview-photo"
          src={previewImage}
          alt="Photo preview"
          loading="eager"
          fallbacks={["/images/food-hero-bg.png", "/images/recipe-pasta.png"]}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-black/70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(251,146,60,0.20),transparent_55%)]" />
      </div>

      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/80 to-transparent" />
      </div>

      <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 pb-10">
        <div className="flex items-start justify-between">
          <button
            data-testid="button-preview-back"
            onClick={onRetake}
            aria-label="Back"
            className="pointer-events-auto w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>

          <div
            data-testid="badge-preview-ready"
            className={"pointer-events-none px-4 py-2 rounded-full bg-black/35 backdrop-blur-md text-white border border-white/10 flex items-center gap-2 " + CHIP_LABEL_CLASS}
          >
            <Sparkles size={12} className="text-orange-400" />
            PREVIEW
          </div>

          <div className="w-10" />
        </div>

        <div className="pointer-events-none">
          <div data-testid="text-preview-title" className={SECTION_TITLE_CLASS + " text-white text-2xl leading-tight"}>
            Ready to scan?
          </div>
          <div data-testid="text-preview-subtitle" className={"mt-2 max-w-[28ch] " + CAPTION_CLASS + " text-zinc-300"}>
            Retakes are free. A scan is used only after you hold to analyze.
          </div>
        </div>

        <div className="pointer-events-auto">
          <div data-testid="section-preview-actions" className="grid grid-cols-2 gap-3">
            <button
              data-testid="button-preview-retake"
              onClick={onRetake}
              disabled={isScanning}
              className={
                "h-14 rounded-2xl border border-white/10 bg-white/5 text-white font-bold backdrop-blur-xl transition " +
                (isScanning ? "opacity-60" : "hover:bg-white/10")
              }
            >
              <span className="inline-flex items-center gap-2">
                {source === "gallery" ? <ImageIcon size={18} /> : <RotateCcw size={18} />}
                <span data-testid="text-preview-retake">{retakeLabel}</span>
              </span>
            </button>

            <button
              data-testid="button-preview-analyze"
              disabled={isScanning}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture?.(e.pointerId);
                beginHold();
              }}
              onPointerUp={() => {
                if (holdProgress < 1) stopHold();
              }}
              onPointerCancel={stopHold}
              onPointerLeave={() => {
                if (isHolding && holdProgress < 1) stopHold();
              }}
              className={
                "relative h-14 rounded-2xl overflow-hidden border border-orange-500/20 bg-gradient-to-b from-orange-400/95 to-orange-500/85 text-black font-extrabold transition " +
                (isScanning ? "opacity-60" : "hover:from-orange-300/95")
              }
              aria-label="Hold to analyze"
            >
              <div
                className="absolute inset-0 bg-black/25"
                style={{
                  transformOrigin: "left center",
                  transform: `scaleX(${holdProgress})`,
                }}
              />
              <div className="relative z-10 flex items-center justify-center gap-2">
                <span data-testid="text-preview-analyze" className={CAPTION_XS_CLASS + " tracking-wide"}>
                  {isScanning ? "Analyzing…" : "Hold to Analyze • uses 1 scan"}
                </span>
              </div>
            </button>
          </div>

          <div data-testid="text-preview-scan-includes" className={"mt-3 text-center text-zinc-400 " + CAPTION_XS_CLASS}>
            Scan includes: photo + detection + ideas
          </div>

          <AnimatePresence>
            {isHolding && !isScanning && (
              <motion.div
                data-testid="status-preview-hold"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className={"mt-3 text-center text-zinc-300 " + CAPTION_XS_CLASS}
              >
                Keep holding…
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {isScanning && (
          <motion.div
            data-testid="overlay-preview-scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40"
          >
            <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-[0_0_30px_rgba(251,146,60,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
              <style>{`
                @keyframes scan {
                  0% { top: 0%; opacity: 0; }
                  10% { opacity: 1; }
                  90% { opacity: 1; }
                  100% { top: 100%; opacity: 0; }
                }
              `}</style>
            </div>

            <div className="absolute inset-x-0 bottom-28 flex flex-col items-center gap-3">
              <div
                data-testid="badge-preview-scanning"
                className="px-4 py-2 rounded-full bg-black/50 border border-white/10 text-orange-300 text-xs font-bold tracking-widest uppercase"
              >
                Detecting ingredients…
              </div>
              <div data-testid="text-preview-scanning-sub" className="text-[12px] text-zinc-300">
                Generating 3 recipe ideas
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
