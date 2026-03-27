-- Migration: Harden SECURITY DEFINER functions by fixing search_path
-- Uses catalog checks for compatibility (ALTER FUNCTION IF EXISTS is not portable across all PG variants).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'can_user_scan'
  ) THEN
    ALTER FUNCTION public.can_user_scan(uuid) SET search_path = public;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_daily_scan_count'
  ) THEN
    ALTER FUNCTION public.get_daily_scan_count(uuid) SET search_path = public;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_monthly_scan_count'
  ) THEN
    ALTER FUNCTION public.get_monthly_scan_count(uuid) SET search_path = public;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_weekly_scan_count'
  ) THEN
    ALTER FUNCTION public.get_weekly_scan_count(uuid) SET search_path = public;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
  ) THEN
    ALTER FUNCTION public.handle_new_user() SET search_path = public;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
  ) THEN
    ALTER FUNCTION public.rls_auto_enable() SET search_path = public;
  END IF;
END $$;
