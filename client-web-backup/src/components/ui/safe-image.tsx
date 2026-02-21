import { useEffect, useMemo, useState, type ImgHTMLAttributes } from "react";

const INLINE_SVG_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%23341d12'/><stop offset='45%' stop-color='%230f1118'/><stop offset='100%' stop-color='%23113443'/></linearGradient><radialGradient id='r' cx='85%' cy='18%' r='58%'><stop offset='0%' stop-color='%23f97316' stop-opacity='.35'/><stop offset='100%' stop-color='%23f97316' stop-opacity='0'/></radialGradient></defs><rect width='800' height='600' fill='url(%23g)'/><rect width='800' height='600' fill='url(%23r)'/><g fill='none' stroke='%23f59e0b' stroke-width='3' opacity='.7'><path d='M90 430c55-70 130-100 210-82'/><path d='M170 470c72-40 156-36 220 12'/></g><circle cx='610' cy='210' r='72' fill='%23f97316' fill-opacity='.16'/><text x='64' y='90' fill='%23f8fafc' fill-opacity='.9' font-family='Outfit,system-ui,sans-serif' font-size='42' font-weight='700'>CosmicCrave</text></svg>",
  );

function normalizeSrc(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed === "null" || trimmed === "undefined") return null;
  return trimmed;
}

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
  fallbacks?: Array<string | null | undefined>;
  disableInlineFallback?: boolean;
};

export function SafeImage({
  src,
  fallbacks = [],
  disableInlineFallback = false,
  onError,
  alt = "",
  loading,
  ...rest
}: SafeImageProps) {
  const fallbackKey = fallbacks.map((x) => normalizeSrc(x) ?? "").join("|");

  const candidates = useMemo(() => {
    const list = [src, ...fallbacks];
    if (!disableInlineFallback) {
      list.push(INLINE_SVG_FALLBACK);
    }
    return Array.from(
      new Set(
        list
          .map((x) => normalizeSrc(x))
          .filter((x): x is string => !!x),
      ),
    );
  }, [src, fallbackKey, disableInlineFallback]);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    setIdx(0);
  }, [src, fallbackKey, disableInlineFallback]);

  const activeSrc = candidates[idx] ?? INLINE_SVG_FALLBACK;

  return (
    <img
      {...rest}
      src={activeSrc}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={(event) => {
        setIdx((current) => {
          if (current >= candidates.length - 1) return current;
          return current + 1;
        });
        onError?.(event);
      }}
    />
  );
}

