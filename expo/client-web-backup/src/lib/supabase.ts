import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a fallback client if keys are missing (for development)
// This allows the app to load even without Supabase configured
const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'placeholder-key';

export const supabase = createClient(
  supabaseUrl || fallbackUrl,
  supabaseAnonKey || fallbackKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

/** True when real Supabase URL and anon key are set; false when using placeholder (auth will not work). */
export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co');

// Log warning if using fallback (only in development)
if (import.meta.env.DEV && !isSupabaseConfigured) {
  console.warn(
    '⚠️ Supabase: use VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (names must start with VITE_). Restart the dev server after editing .env.'
  );
}
