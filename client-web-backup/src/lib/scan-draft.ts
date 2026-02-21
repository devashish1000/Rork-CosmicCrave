import { AI_LIMITS, type ScanSource } from "@shared/ai-constraints";

export type ScanDraft = {
  draftId: string;
  createdAt: number;
  source: ScanSource;
  imageDataUrl: string;
};

const DRAFT_PREFIX = "cosmiccrave:scanDraft:";
const MAX_DRAFT_AGE_MS = 1000 * 60 * 20;

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, maxLength);
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function draftKey(draftId: string) {
  return `${DRAFT_PREFIX}${draftId}`;
}

function normalizeDataUrl(value: unknown) {
  if (typeof value !== "string") return "";
  if (!value.startsWith("data:image/")) return "";
  if (!value.includes(";base64,")) return "";
  if (value.length > AI_LIMITS.maxImageDataUrlLength) return "";
  return value;
}

function purgeStaleDrafts() {
  if (!canUseStorage()) return;
  const now = Date.now();
  try {
    Object.keys(window.sessionStorage).forEach((key) => {
      if (!key.startsWith(DRAFT_PREFIX)) return;
      const raw = window.sessionStorage.getItem(key);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as Partial<ScanDraft>;
        const createdAt =
          typeof parsed.createdAt === "number" && Number.isFinite(parsed.createdAt)
            ? parsed.createdAt
            : 0;
        if (!createdAt || now - createdAt > MAX_DRAFT_AGE_MS) {
          window.sessionStorage.removeItem(key);
        }
      } catch {
        window.sessionStorage.removeItem(key);
      }
    });
  } catch {
    // ignore
  }
}

export function storeScanDraft(payload: { source: ScanSource; imageDataUrl: string }) {
  if (!canUseStorage()) return null;
  const imageDataUrl = normalizeDataUrl(payload.imageDataUrl);
  if (!imageDataUrl) return null;
  purgeStaleDrafts();

  const draftId = crypto.randomUUID();
  const draft: ScanDraft = {
    draftId,
    source: payload.source,
    imageDataUrl,
    createdAt: Date.now(),
  };

  try {
    window.sessionStorage.setItem(draftKey(draftId), JSON.stringify(draft));
    return draft;
  } catch {
    return null;
  }
}

export function readScanDraft(draftId: string | null | undefined): ScanDraft | null {
  if (!canUseStorage() || !draftId) return null;
  const normalizedDraftId = sanitizeText(draftId, AI_LIMITS.maxScanIdLength);
  if (!normalizedDraftId) return null;
  purgeStaleDrafts();

  try {
    const raw = window.sessionStorage.getItem(draftKey(normalizedDraftId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ScanDraft>;
    const source = parsed.source === "camera" || parsed.source === "gallery" ? parsed.source : null;
    const imageDataUrl = normalizeDataUrl(parsed.imageDataUrl);
    const createdAt =
      typeof parsed.createdAt === "number" && Number.isFinite(parsed.createdAt)
        ? parsed.createdAt
        : 0;
    if (!source || !imageDataUrl || !createdAt) return null;
    if (Date.now() - createdAt > MAX_DRAFT_AGE_MS) return null;
    return {
      draftId: normalizedDraftId,
      source,
      imageDataUrl,
      createdAt,
    };
  } catch {
    return null;
  }
}

export function removeScanDraft(draftId: string | null | undefined) {
  if (!canUseStorage() || !draftId) return;
  const normalizedDraftId = sanitizeText(draftId, AI_LIMITS.maxScanIdLength);
  if (!normalizedDraftId) return;
  try {
    window.sessionStorage.removeItem(draftKey(normalizedDraftId));
  } catch {
    // ignore
  }
}
