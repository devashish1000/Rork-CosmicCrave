import type { ScanSource } from "@shared/ai-constraints";
import { supabase } from "./supabase";

type AnalyzeRequest = {
  scanId?: string;
  source: ScanSource;
  imageDataUrl?: string;
  detectedHint?: string[];
  dietaryPreferences?: {
    dietType?: string;
    allergies?: string[];
  };
};

export class AnalyzeScanError extends Error {
  status: number;
  code?: string;

  constructor(message: string, options: { status: number; code?: string }) {
    super(message);
    this.name = "AnalyzeScanError";
    this.status = options.status;
    this.code = options.code;
  }
}

/**
 * Get auth token from Supabase session
 */
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function analyzeScan(request: AnalyzeRequest) {
  const token = await getAuthToken();
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch("/api/scan/analyze", {
    method: "POST",
    headers,
    body: JSON.stringify(request),
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => ({ message: response.statusText }))) as { message?: string; error?: string };
    
    // Handle quota exceeded
    if (response.status === 403 && errorData.error === "quota_exceeded") {
      throw new AnalyzeScanError(errorData.message || "Scan quota exceeded", {
        status: 403,
        code: "quota_exceeded",
      });
    }
    
    // Handle rate limit
    if (response.status === 429) {
      throw new AnalyzeScanError(errorData.message || "Too many requests. Please wait a moment.", {
        status: 429,
        code: "rate_limited",
      });
    }
    
    // 404 usually means the API server isn't running (e.g. only Vite dev is running)
    const message =
      response.status === 404
        ? "Scan service unavailable. Run the full app with `npm run dev` in the project root (not just the client)."
        : errorData.message || `Analyze failed (${response.status})`;
    throw new AnalyzeScanError(message, {
      status: response.status,
      code: typeof errorData.error === "string" ? errorData.error : undefined,
    });
  }

  return (await response.json()) as unknown;
}

/**
 * Get user's quota information
 */
export async function getQuotaInfo() {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch("/api/quota", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get quota info");
  }

  return response.json();
}

/**
 * Get user's subscription information
 */
export async function getSubscriptionInfo() {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch("/api/subscription", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get subscription info");
  }

  return response.json();
}

/**
 * Get user's scan history
 */
export async function getScanHistory(limit = 50, offset = 0) {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`/api/scans/history?limit=${limit}&offset=${offset}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get scan history");
  }

  return response.json();
}
