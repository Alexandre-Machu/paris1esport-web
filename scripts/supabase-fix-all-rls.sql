-- Supabase Security Advisor: Fix "RLS Disabled in Public" for all tables
-- Tables to fix:
-- 1. public.publications_settings
-- 2. public.events
-- 3. public.games
-- 4. public.org_members
-- 5. public.teams
-- 6. public.competitions
-- 7. public.partners (if not already fixed)

-- Strategy:
-- - All tables are readable by everyone (anon, authenticated)
-- - Writes blocked for anon/authenticated (your server app handles writes via Prisma)

BEGIN;

-- 1. publications_settings
ALTER TABLE public.publications_settings ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.publications_settings FROM anon, authenticated;
GRANT SELECT ON TABLE public.publications_settings TO anon, authenticated;
DROP POLICY IF EXISTS "publications_settings_select_public" ON public.publications_settings;
CREATE POLICY "publications_settings_select_public"
  ON public.publications_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.events FROM anon, authenticated;
GRANT SELECT ON TABLE public.events TO anon, authenticated;
DROP POLICY IF EXISTS "events_select_public" ON public.events;
CREATE POLICY "events_select_public"
  ON public.events
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. games
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.games FROM anon, authenticated;
GRANT SELECT ON TABLE public.games TO anon, authenticated;
DROP POLICY IF EXISTS "games_select_public" ON public.games;
CREATE POLICY "games_select_public"
  ON public.games
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4. org_members
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.org_members FROM anon, authenticated;
GRANT SELECT ON TABLE public.org_members TO anon, authenticated;
DROP POLICY IF EXISTS "org_members_select_public" ON public.org_members;
CREATE POLICY "org_members_select_public"
  ON public.org_members
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.teams FROM anon, authenticated;
GRANT SELECT ON TABLE public.teams TO anon, authenticated;
DROP POLICY IF EXISTS "teams_select_public" ON public.teams;
CREATE POLICY "teams_select_public"
  ON public.teams
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 6. competitions
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.competitions FROM anon, authenticated;
GRANT SELECT ON TABLE public.competitions TO anon, authenticated;
DROP POLICY IF EXISTS "competitions_select_public" ON public.competitions;
CREATE POLICY "competitions_select_public"
  ON public.competitions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 7. partners (if not already fixed)
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.partners FROM anon, authenticated;
GRANT SELECT ON TABLE public.partners TO anon, authenticated;
DROP POLICY IF EXISTS "partners_select_public" ON public.partners;
CREATE POLICY "partners_select_public"
  ON public.partners
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMIT;
