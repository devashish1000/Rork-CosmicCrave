import { createClient } from '@supabase/supabase-js';
import { env } from '../env';

const supabase = env.supabaseUrl && env.supabaseServiceRoleKey
  ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey)
  : null;

export interface QuotaInfo {
  canScan: boolean;
  weeklyCount: number;
  monthlyCount: number;
  weeklyLimit: number;
  monthlyLimit: number;
  tier: 'free' | 'starter' | 'premium';
  weeklyRemaining: number;
  monthlyRemaining: number;
}

/**
 * Check if user can perform a scan (quota enforcement)
 */
export async function checkScanQuota(userId: string): Promise<QuotaInfo> {
  if (!supabase) {
    throw new Error('Database not configured');
  }

  const { data, error } = await supabase.rpc('can_user_scan', {
    p_user_id: userId,
  });

  if (error || !data || data.length === 0) {
    // Default to free tier if query fails
    return {
      canScan: false,
      weeklyCount: 0,
      monthlyCount: 0,
      weeklyLimit: 5,
      monthlyLimit: 20,
      tier: 'free',
      weeklyRemaining: 0,
      monthlyRemaining: 0,
    };
  }

  const result = data[0];
  return {
    canScan: result.can_scan,
    weeklyCount: result.weekly_count,
    monthlyCount: result.monthly_count,
    weeklyLimit: result.weekly_limit,
    monthlyLimit: result.monthly_limit,
    tier: result.tier as 'free' | 'starter' | 'premium',
    weeklyRemaining: Math.max(0, result.weekly_limit - result.weekly_count),
    monthlyRemaining: Math.max(0, result.monthly_limit - result.monthly_count),
  };
}

/**
 * Record a scan usage
 */
export async function recordScanUsage(
  userId: string,
  scanId: string,
  source: 'camera' | 'gallery' | 'hint' | 'ai',
  success: boolean = true,
  errorMessage?: string
): Promise<void> {
  if (!supabase) {
    console.warn('Database not configured, cannot record scan usage');
    return;
  }

  const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM

  const { error } = await supabase.from('scan_usage').insert({
    user_id: userId,
    scan_id: scanId,
    source,
    month_key: monthKey,
    success,
    error_message: errorMessage,
  });

  if (error) {
    console.error('Failed to record scan usage:', error);
  }
}

/**
 * Get user's subscription tier
 */
export async function getUserTier(userId: string): Promise<'free' | 'starter' | 'premium'> {
  if (!supabase) {
    return 'free';
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return 'free';
  }

  return (data.tier as 'free' | 'starter' | 'premium') || 'free';
}
