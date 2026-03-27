export type DetectedItem = {
  id?: number;
  name: string;
  confidence?: number;
  source?: string;
};

export type ScanPayload = {
  scanId: string;
  imageUri?: string;
  source?: "camera" | "gallery";
  detectedItems: DetectedItem[];
  createdAt: number;
};

const SCAN_PAYLOAD_PREFIX = "cosmiccrave:scanPayload:";
const MAX_DETECTED_ITEMS = 24;
const MAX_DETECTED_NAME_LENGTH = 40;
const MAX_SOURCE_LENGTH = 24;
const MAX_SCAN_ID_LENGTH = 120;
const FALLBACK_SCAN_ID = "recipe-ideas-default";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function sanitizeText(value: string, maxLength: number) {
  const withoutControl = value.replace(/[\u0000-\u001F\u007F]/g, "");
  return normalizeWhitespace(withoutControl).slice(0, maxLength);
}

function safeDecodeURIComponent(raw: string) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function safeParseDetectedInput(raw: string | null): unknown {
  if (!raw) return [];
  try {
    return JSON.parse(safeDecodeURIComponent(raw));
  } catch {
    return [];
  }
}

export function sanitizeDetectedItems(input: unknown): DetectedItem[] {
  if (!Array.isArray(input)) return [];

  const byName = new Map<string, DetectedItem>();
  const maxScanCandidates = MAX_DETECTED_ITEMS * 8;
  const candidateCount = Math.min(input.length, maxScanCandidates);

  for (let idx = 0; idx < candidateCount; idx += 1) {
    const entry = input[idx];
    const nameRaw = typeof (entry as { name?: unknown })?.name === "string" ? (entry as { name: string }).name : "";
    const name = sanitizeText(nameRaw, MAX_DETECTED_NAME_LENGTH);
    if (!name) continue;

    const confidenceRaw = (entry as { confidence?: unknown })?.confidence;
    const confidence =
      typeof confidenceRaw === "number" && Number.isFinite(confidenceRaw)
        ? clamp(confidenceRaw, 0, 1)
        : undefined;

    const sourceRaw = (entry as { source?: unknown })?.source;
    const source =
      typeof sourceRaw === "string"
        ? sanitizeText(sourceRaw, MAX_SOURCE_LENGTH)
        : undefined;

    const idRaw = (entry as { id?: unknown })?.id;
    const id = typeof idRaw === "number" && Number.isFinite(idRaw) ? idRaw : undefined;

    const key = name.toLowerCase();
    const existing = byName.get(key);

    if (!existing || (confidence ?? -1) > (existing.confidence ?? -1)) {
      byName.set(key, { id, name, confidence, source });
    }
  }

  return Array.from(byName.values())
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0) || a.name.localeCompare(b.name))
    .slice(0, MAX_DETECTED_ITEMS);
}

export function safeParseDetectedItems(raw: string | null): DetectedItem[] {
  return sanitizeDetectedItems(safeParseDetectedInput(raw));
}

export function normalizeScanSessionId(scanId: string | null | undefined, detectedItems: DetectedItem[]) {
  const normalizedId = sanitizeText(scanId ?? "", MAX_SCAN_ID_LENGTH);
  if (normalizedId) return normalizedId;
  if (detectedItems.length) {
    const compact = detectedItems
      .slice(0, 8)
      .map((item) => item.name.toLowerCase())
      .join("|");
    return sanitizeText(compact, MAX_SCAN_ID_LENGTH) || FALLBACK_SCAN_ID;
  }
  return FALLBACK_SCAN_ID;
}

function payloadKey(scanId: string) {
  return `${SCAN_PAYLOAD_PREFIX}${scanId}`;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function normalizeImageUri(imageUri: unknown) {
  if (typeof imageUri !== "string") return undefined;
  const next = imageUri.trim();
  if (!next) return undefined;
  return next.slice(0, 2048);
}

export function storeScanPayload(payload: ScanPayload) {
  if (!canUseStorage()) return;
  const scanId = sanitizeText(payload.scanId, MAX_SCAN_ID_LENGTH);
  if (!scanId) return;

  const normalized: ScanPayload = {
    scanId,
    imageUri: normalizeImageUri(payload.imageUri),
    source: payload.source === "camera" || payload.source === "gallery" ? payload.source : undefined,
    detectedItems: sanitizeDetectedItems(payload.detectedItems),
    createdAt:
      typeof payload.createdAt === "number" && Number.isFinite(payload.createdAt)
        ? payload.createdAt
        : Date.now(),
  };

  try {
    window.sessionStorage.setItem(payloadKey(scanId), JSON.stringify(normalized));
  } catch {
    // ignore storage write failures (quota/private mode)
  }
}

export function readScanPayload(scanId: string | null | undefined): ScanPayload | null {
  if (!canUseStorage() || !scanId) return null;
  const normalizedScanId = sanitizeText(scanId, MAX_SCAN_ID_LENGTH);
  if (!normalizedScanId) return null;
  try {
    const raw = window.sessionStorage.getItem(payloadKey(normalizedScanId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ScanPayload> | null;
    if (!parsed || typeof parsed !== "object") return null;
    const parsedScanId = sanitizeText(parsed.scanId ?? "", MAX_SCAN_ID_LENGTH);
    if (!parsedScanId) return null;
    return {
      scanId: parsedScanId,
      imageUri: normalizeImageUri(parsed.imageUri),
      source: parsed.source === "camera" || parsed.source === "gallery" ? parsed.source : undefined,
      detectedItems: sanitizeDetectedItems(parsed.detectedItems),
      createdAt:
        typeof parsed.createdAt === "number" && Number.isFinite(parsed.createdAt)
          ? parsed.createdAt
          : 0,
    };
  } catch {
    return null;
  }
}

export function removeScanPayload(scanId: string | null | undefined) {
  if (!canUseStorage() || !scanId) return;
  const normalizedScanId = sanitizeText(scanId, MAX_SCAN_ID_LENGTH);
  if (!normalizedScanId) return;
  try {
    window.sessionStorage.removeItem(payloadKey(normalizedScanId));
  } catch {
    // ignore storage failures
  }
}
