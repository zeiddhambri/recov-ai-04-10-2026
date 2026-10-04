
CREATE TABLE public.dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_code text NOT NULL,
  debtor_name text NOT NULL,
  debtor_email text,
  debtor_phone text,
  amount numeric NOT NULL DEFAULT 0,
  due_date date,
  assigned_to text DEFAULT 'Non assigné',
  management_level text DEFAULT 'recouvreur',
  status text DEFAULT 'a_relancer',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own dossiers" ON public.dossiers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own dossiers" ON public.dossiers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own dossiers" ON public.dossiers FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own dossiers" ON public.dossiers FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_dossiers
  BEFORE UPDATE ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.dossiers;
