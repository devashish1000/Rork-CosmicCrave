import fs from "fs";
import path from "path";
import { z } from "zod";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    if (!key) continue;
    if (process.env[key] != null) continue;
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function loadLocalEnvFiles() {
  const projectRoot = process.cwd();
  loadEnvFile(path.join(projectRoot, ".env"));
  loadEnvFile(path.join(projectRoot, ".env.local"));
}

loadLocalEnvFiles();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().optional(),

  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),

  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.0-flash"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid environment configuration: ${issues}`);
}

const data = parsed.data;

const supabaseUrl = data.SUPABASE_URL ?? data.VITE_SUPABASE_URL;
const hasSupabase = Boolean(supabaseUrl && data.SUPABASE_SERVICE_ROLE_KEY);
const hasGemini = Boolean(data.GEMINI_API_KEY);

export const env = {
  nodeEnv: data.NODE_ENV,
  port: data.PORT,
  supabaseUrl,
  supabaseServiceRoleKey: data.SUPABASE_SERVICE_ROLE_KEY,
  supabaseAnonKey: data.VITE_SUPABASE_ANON_KEY,
  geminiApiKey: data.GEMINI_API_KEY,
  geminiModel: data.GEMINI_MODEL,
  hasSupabase,
  hasGemini,
};

export function getStartupWarnings() {
  const warnings: string[] = [];

  if (!env.supabaseUrl) {
    warnings.push("⚠️  SUPABASE_URL is missing. Cloud persistence is disabled.");
  }
  if (!env.supabaseAnonKey) {
    warnings.push("⚠️  VITE_SUPABASE_ANON_KEY is missing. Client auth integration will be unavailable.");
  }
  if (!env.supabaseServiceRoleKey) {
    warnings.push("⚠️  SUPABASE_SERVICE_ROLE_KEY is missing. Server-side Supabase writes are disabled.");
  }
  if (!env.geminiApiKey) {
    warnings.push("⚠️  GEMINI_API_KEY is missing. AI scan endpoint will return fallback recipes.");
  }

  // Critical warnings for production
  if (env.nodeEnv === "production") {
    if (!env.hasSupabase) {
      warnings.push("🚨 CRITICAL: Supabase not configured. Authentication and database features will not work.");
    }
    if (!env.hasGemini) {
      warnings.push("🚨 CRITICAL: Gemini API not configured. AI scanning will not work.");
    }
  }

  return warnings;
}

/**
 * Validate that all required environment variables are present
 * Throws if critical variables are missing in production
 */
export function validateEnvironment(): void {
  const warnings = getStartupWarnings();
  
  if (warnings.length > 0) {
    console.warn("Environment Configuration Warnings:");
    warnings.forEach(warning => console.warn(warning));
  }

  if (env.nodeEnv === "production") {
    if (!env.hasSupabase) {
      throw new Error("Production requires Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }
  }
}
