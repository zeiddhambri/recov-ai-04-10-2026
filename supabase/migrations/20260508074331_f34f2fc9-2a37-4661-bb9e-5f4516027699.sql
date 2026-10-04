
CREATE TABLE IF NOT EXISTS public.leasing_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  -- Lessee
  lessee_name text NOT NULL,
  lessee_id text,
  lessee_email text,
  lessee_phone text,
  -- Contract
  contract_ref text,
  contract_status text NOT NULL DEFAULT 'active',
  start_date date,
  end_date date,
  maturity_date date,
  duration_months integer,
  -- Asset
  asset_type text,
  asset_description text,
  asset_value numeric NOT NULL DEFAULT 0,
  residual_value numeric NOT NULL DEFAULT 0,
  -- Financials
  monthly_rent numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  remaining_capital numeric NOT NULL DEFAULT 0,
  interest_rate numeric,
  payment_frequency text DEFAULT 'monthly',
  next_payment_date date,
  overdue_amount numeric NOT NULL DEFAULT 0,
  overdue_days integer NOT NULL DEFAULT 0,
  -- Risk
  risk_score integer NOT NULL DEFAULT 0,
  risk_level text DEFAULT 'low',
  -- Source / AI
  source_file_url text,
  source_file_name text,
  ai_confidence numeric,
  notes text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leasing_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own leasing" ON public.leasing_portfolio
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own leasing" ON public.leasing_portfolio
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own leasing" ON public.leasing_portfolio
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own leasing" ON public.leasing_portfolio
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_leasing_portfolio_updated_at
  BEFORE UPDATE ON public.leasing_portfolio
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.leasing_portfolio;
ALTER TABLE public.leasing_portfolio REPLICA IDENTITY FULL;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('leasing-files', 'leasing-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own leasing files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'leasing-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own leasing files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'leasing-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own leasing files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'leasing-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own leasing files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'leasing-files' AND auth.uid()::text = (storage.foldername(name))[1]);
