-- ============================================================================
-- DukaLive Nuclear Reset Script
-- ============================================================================
-- Run this in Supabase SQL Editor. It will:
-- 1. Remove ALL DukaLive objects cleanly
-- 2. Fix PostgREST permissions
-- 3. Force schema cache reload
-- ============================================================================

-- Step 1: Drop everything safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Remove from realtime publication BEFORE dropping tables
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Publication drop skipped: %', SQLERRM;
END $$;

DROP TABLE IF EXISTS public.sms_logs CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Step 2: Fix PostgREST permissions on public schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- Step 3: Force PostgREST reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
