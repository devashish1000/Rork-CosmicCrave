-- CosmicCrave Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table (tracks premium tier)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  revenuecat_user_id TEXT,
  revenuecat_product_id TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Scan usage table (tracks every scan)
CREATE TABLE IF NOT EXISTS public.scan_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scan_id TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK (source IN ('camera', 'gallery', 'hint', 'ai')),
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  month_key TEXT NOT NULL, -- e.g., "2024-02"
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scan_usage_user_month ON public.scan_usage(user_id, month_key);
CREATE INDEX IF NOT EXISTS idx_scan_usage_scanned_at ON public.scan_usage(scanned_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON public.subscriptions(tier);

-- Function to check if user can scan (quota enforcement)
CREATE OR REPLACE FUNCTION public.can_user_scan(p_user_id UUID)
RETURNS TABLE(
  can_scan BOOLEAN,
  daily_count INTEGER,
  monthly_count INTEGER,
  daily_limit INTEGER,
  monthly_limit INTEGER,
  tier TEXT
) AS $$
DECLARE
  v_tier TEXT := 'free';
  v_daily_limit INTEGER := 5;
  v_monthly_limit INTEGER := 20;
  v_daily_count INTEGER;
  v_monthly_count INTEGER;
  v_current_month TEXT;
BEGIN
  -- Get user's subscription tier
  SELECT COALESCE(s.tier, 'free') INTO v_tier
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id
  LIMIT 1;

  -- Set limits based on tier
  IF v_tier = 'premium' THEN
    v_daily_limit := 100;
    v_monthly_limit := 1000;
  END IF;

  -- Get current month key (YYYY-MM)
  v_current_month := TO_CHAR(NOW(), 'YYYY-MM');

  -- Count scans in last 24 hours
  SELECT COUNT(*) INTO v_daily_count
  FROM public.scan_usage
  WHERE user_id = p_user_id
    AND scanned_at >= NOW() - INTERVAL '24 hours'
    AND success = true;

  -- Count scans in current month
  SELECT COUNT(*) INTO v_monthly_count
  FROM public.scan_usage
  WHERE user_id = p_user_id
    AND month_key = v_current_month
    AND success = true;

  -- Check if user can scan
  RETURN QUERY SELECT
    (v_daily_count < v_daily_limit AND v_monthly_count < v_monthly_limit) AS can_scan,
    v_daily_count AS daily_count,
    v_monthly_count AS monthly_count,
    v_daily_limit AS daily_limit,
    v_monthly_limit AS monthly_limit,
    v_tier AS tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get daily scan count
CREATE OR REPLACE FUNCTION public.get_daily_scan_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.scan_usage
  WHERE user_id = p_user_id
    AND scanned_at >= NOW() - INTERVAL '24 hours'
    AND success = true;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get monthly scan count
CREATE OR REPLACE FUNCTION public.get_monthly_scan_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_current_month TEXT;
BEGIN
  v_current_month := TO_CHAR(NOW(), 'YYYY-MM');
  SELECT COUNT(*) INTO v_count
  FROM public.scan_usage
  WHERE user_id = p_user_id
    AND month_key = v_current_month
    AND success = true;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: Auto-create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  -- Auto-create free subscription
  INSERT INTO public.subscriptions (user_id, tier)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_usage ENABLE ROW LEVEL SECURITY;

-- Users: Users can only read/update their own data
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Subscriptions: Users can only view their own subscription
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Scan usage: Users can only view their own scans
CREATE POLICY "Users can view own scans"
  ON public.scan_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (for server-side operations)
CREATE POLICY "Service role full access"
  ON public.users FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access scan_usage"
  ON public.scan_usage FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
