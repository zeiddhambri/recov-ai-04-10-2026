
-- Add new fields to dossiers_contentieux for AI extraction & file linking
ALTER TABLE public.dossiers_contentieux
  ADD COLUMN IF NOT EXISTS debtor_email text,
  ADD COLUMN IF NOT EXISTS debtor_phone text,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS source_file_url text,
  ADD COLUMN IF NOT EXISTS source_file_name text;

-- Storage bucket for litigation source files (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('contentieux-files', 'contentieux-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for the bucket: users can manage their own folder (prefix = user id)
CREATE POLICY "Users read own contentieux files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contentieux-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own contentieux files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contentieux-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own contentieux files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'contentieux-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own contentieux files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'contentieux-files' AND auth.uid()::text = (storage.foldername(name))[1]);
