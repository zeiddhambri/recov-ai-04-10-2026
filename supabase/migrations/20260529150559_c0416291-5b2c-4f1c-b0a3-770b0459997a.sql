
-- 1. Restrict lawyers table SELECT to admins only
DROP POLICY IF EXISTS "Lawyers viewable by authenticated" ON public.lawyers;
CREATE POLICY "Admins view lawyers"
ON public.lawyers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Remove tables from realtime publication (app does not use realtime subscriptions)
ALTER PUBLICATION supabase_realtime DROP TABLE public.dossiers;
ALTER PUBLICATION supabase_realtime DROP TABLE public.dossiers_contentieux;
ALTER PUBLICATION supabase_realtime DROP TABLE public.leasing_portfolio;

-- 3. Revoke direct EXECUTE on has_role from API roles; it remains usable inside RLS policies because it is SECURITY DEFINER and policies execute as the table owner.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated;
