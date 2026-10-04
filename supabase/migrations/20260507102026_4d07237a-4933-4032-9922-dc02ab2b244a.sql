
-- Table avocats
CREATE TABLE public.lawyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  firm text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lawyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lawyers viewable by authenticated"
  ON public.lawyers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage lawyers"
  ON public.lawyers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.lawyers (name, firm, phone, email) VALUES
  ('Maître Sonia Trabelsi', 'Cabinet Trabelsi & Associés', '+216 71 123 456', 's.trabelsi@cabinet-trabelsi.tn'),
  ('Maître Karim Belhaj', 'BLG Avocats', '+216 71 654 321', 'k.belhaj@blg-avocats.tn'),
  ('Maître Leila Mansouri', 'Cabinet Mansouri', '+216 71 222 333', 'l.mansouri@mansouri-law.tn');

-- Table dossiers contentieux
CREATE TABLE public.dossiers_contentieux (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  debtor_name text NOT NULL,
  amount numeric(14,3) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'precontentieux',
  lawyer_id uuid REFERENCES public.lawyers(id) ON DELETE SET NULL,
  court_level text NOT NULL DEFAULT 'tpi',
  guarantee text NOT NULL DEFAULT 'aucune',
  recommendation text,
  observations text,
  last_acknowledgment_date date,
  estimated_legal_fees numeric(14,3) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dossiers_contentieux ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own contentieux"
  ON public.dossiers_contentieux FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own contentieux"
  ON public.dossiers_contentieux FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own contentieux"
  ON public.dossiers_contentieux FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own contentieux"
  ON public.dossiers_contentieux FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_dossiers_contentieux_updated
  BEFORE UPDATE ON public.dossiers_contentieux
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.dossiers_contentieux;
