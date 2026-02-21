import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/utils";

type LensProps = {
  src: string;
  alt?: string;
  zoomFactor?: number;
  lensSize?: number;
  className?: string;
  imgClassName?: string;
  onActiveChange?: (active: boolean) => void;
  disabled?: boolean;
  fallbackSrc?: string | string[];
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function normalizeImageSrc(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed === "null" || trimmed === "undefined") return null;
  return trimmed;
}

export function Lens({
  src,
  alt = "",
  zoomFactor = 2,
  lensSize = 160,
  className,
  imgClassName,
  onActiveChange,
  disabled = false,
  fallbackSrc,
}: LensProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const imageCandidates = useMemo(() => {
    const propFallbacks = Array.isArray(fallbackSrc) ? fallbackSrc : [fallbackSrc];
    const candidates = [
      src,
      ...propFallbacks,
      "/images/recipe-pasta.png",
      "/images/food-hero-bg.png",
    ]
      .map((value) => normalizeImageSrc(value))
      .filter((value): value is string => !!value);

    return Array.from(new Set(candidates));
  }, [src, fallbackSrc]);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    setImageIndex(0);
  }, [imageCandidates]);

  const activeSrc = imageCandidates[imageIndex] ?? "/images/food-hero-bg.png";

  const setActiveSafe = (value: boolean) => {
    setActive(value);
    onActiveChange?.(value);
  };

  const updatePosition = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clamp(clientX - rect.left, 0, rect.width);
    const y = clamp(clientY - rect.top, 0, rect.height);
    setPosition({ x, y });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.stopPropagation();
    updatePosition(event.clientX, event.clientY);
    setActiveSafe(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (!active && event.pointerType === "mouse") {
      setActiveSafe(true);
    }
    if (active || event.pointerType === "mouse") {
      updatePosition(event.clientX, event.clientY);
    }
  };

  const handlePointerEnter = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (event.pointerType === "mouse") {
      setActiveSafe(true);
      updatePosition(event.clientX, event.clientY);
    }
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (event.pointerType === "mouse") {
      setActiveSafe(false);
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.stopPropagation();
    if (event.pointerType !== "mouse") {
      setActiveSafe(false);
    }
  };

  const handlePointerCancel = () => {
    if (disabled) return;
    setActiveSafe(false);
  };

  const lensHalf = lensSize / 2;
  const handleImageError = () => {
    setImageIndex((current) => {
      if (current >= imageCandidates.length - 1) return current;
      return current + 1;
    });
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden touch-none", className)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={(event) => event.stopPropagation()}
      aria-label={alt}
    >
      <img
        src={activeSrc}
        alt={alt}
        draggable={false}
        className={cn("block h-full w-full select-none", imgClassName)}
        onError={handleImageError}
      />

      <div
        className={cn(
          "pointer-events-none absolute left-0 top-0 z-20 rounded-full border border-white/40 shadow-2xl backdrop-blur-sm transition-opacity duration-150",
          active ? "opacity-100" : "opacity-0",
        )}
        style={{
          width: lensSize,
          height: lensSize,
          transform: `translate(${position.x - lensHalf}px, ${position.y - lensHalf}px)`,
        }}
      >
        <img
          src={activeSrc}
          alt=""
          draggable={false}
          className={cn("block h-full w-full select-none", imgClassName)}
          onError={handleImageError}
          style={{
            transform: `translate(${lensHalf - position.x * zoomFactor}px, ${lensHalf - position.y * zoomFactor}px) scale(${zoomFactor})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </div>
  );
}
