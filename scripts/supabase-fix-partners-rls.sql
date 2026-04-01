-- Fix Supabase Security Advisor: "RLS Disabled in Public" for public.partners
-- Goal:
-- 1) Keep partners readable by everyone (anon + authenticated)
-- 2) Block direct writes from anon/authenticated via PostgREST
-- Notes:
-- - Your app backoffice writes through server-side Prisma, not Supabase auth JWT.
-- - The DB role used by your server (often postgres/service role) can bypass RLS.

BEGIN;

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Defense in depth on table grants (PostgREST roles)
REVOKE INSERT, UPDATE, DELETE ON TABLE public.partners FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.partners FROM authenticated;
GRANT SELECT ON TABLE public.partners TO anon, authenticated;

-- Public read policy (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'partners'
      AND policyname = 'partners_select_public'
  ) THEN
    EXECUTE 'CREATE POLICY partners_select_public ON public.partners FOR SELECT TO anon, authenticated USING (true)';
  END IF;
END
$$;

COMMIT;
