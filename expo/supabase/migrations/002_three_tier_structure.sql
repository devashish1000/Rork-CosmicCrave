-- Migration: Three-Tier Structure (Free, Starter, Premium)
-- Run this in Supabase SQL Editor after 001_initial_schema.sql

-- Update subscriptions table to support 'starter' tier
ALTER TABLE public.subscriptions 
  DROP CONSTRAINT IF EXISTS subscriptions_tier_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_tier_check 
  CHECK (tier IN ('free', 'starter', 'premium'));

-- Update can_user_scan function to support three tiers with weekly limits
-- First, drop the existing function since we're changing the return type
DROP FUNCTION IF EXISTS public.can_user_scan(UUID);

-- Now create the new function with updated return type
CREATE FUNCTION public.can_user_scan(p_user_id UUID)
RETURNS TABLE(
  can_scan BOOLEAN,
  weekly_count INTEGER,
  monthly_count INTEGER,
  weekly_limit INTEGER,
  monthly_limit INTEGER,
  tier TEXT
) AS $$
DECLARE
  v_tier TEXT := 'free';
  v_weekly_limit INTEGER := 5;  -- Free: 5 scans/week
  v_monthly_limit INTEGER := 20; -- Free: 20 scans/month
  v_weekly_count INTEGER;
  v_monthly_count INTEGER;
  v_current_month TEXT;
  v_week_start TIMESTAMPTZ; -- Start of current week (Sunday)
BEGIN
  -- Get user's subscription tier
  SELECT COALESCE(s.tier, 'free') INTO v_tier
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id
  LIMIT 1;

  -- Set limits based on tier
  IF v_tier = 'starter' THEN
    v_weekly_limit := 999999; -- No weekly limit (very high number)
    v_monthly_limit := 50;     -- Starter: 50 scans/month
  ELSIF v_tier = 'premium' THEN
    v_weekly_limit := 999999; -- No weekly limit (very high number)
    v_monthly_limit := 100;   -- Premium: 100 scans/month
  ELSE
    -- Free tier: 5 scans/week, 20 scans/month
    v_weekly_limit := 5;
    v_monthly_limit := 20;
  END IF;

  -- Get current month key (YYYY-MM)
  v_current_month := TO_CHAR(NOW(), 'YYYY-MM');

  -- Calculate start of current week (Sunday)
  -- PostgreSQL: date_trunc('week', NOW()) gives Monday, so we adjust to Sunday
  v_week_start := date_trunc('week', NOW()) - INTERVAL '1 day';

  -- Count scans in current week (last 7 days from week start)
  SELECT COUNT(*) INTO v_weekly_count
  FROM public.scan_usage
  WHERE user_id = p_user_id
    AND scanned_at >= v_week_start
    AND success = true;

  -- Count scans in current month
  SELECT COUNT(*) INTO v_monthly_count
  FROM public.scan_usage
  WHERE user_id = p_user_id
    AND month_key = v_current_month
    AND success = true;

  -- Check if user can scan
  -- For free tier: must pass both weekly AND monthly limits
  -- For starter/premium: only monthly limit matters (weekly_limit is very high)
  RETURN QUERY SELECT
    (v_weekly_count < v_weekly_limit AND v_monthly_count < v_monthly_limit) AS can_scan,
    v_weekly_count AS weekly_count,
    v_monthly_count AS monthly_count,
    v_weekly_limit AS weekly_limit,
    v_monthly_limit AS monthly_limit,
    v_tier AS tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add function to get weekly scan count (for free tier)
CREATE OR REPLACE FUNCTION public.get_weekly_scan_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_week_start TIMESTAMPTZ;
BEGIN
  -- Calculate start of current week (Sunday)
  v_week_start := date_trunc('week', NOW()) - INTERVAL '1 day';
  
  SELECT COUNT(*) INTO v_count
  FROM public.scan_usage
  WHERE user_id = p_user_id
    AND scanned_at >= v_week_start
    AND success = true;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
