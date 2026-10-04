-- RecovAI — lot P1.1/P1.2/P1.3 : noyau Postgres de production.
-- Appliquer sur une base vierge (ex. docker-compose ou instance managée).
-- Convention : l'application appelle set_config('app.institution', <code/nom>, true)
-- par transaction ; les politiques RLS ci-dessous cloisonnent alors chaque lecture
-- et écriture à l'institution du contexte. Sans GUC (chaîne vide), seule la vue
-- administrateur (app.role = 'admin') voit tout — posé par set_config('app.actor'...).

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Dossiers de recouvrement (source de vérité)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dossiers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution      text,                         -- code ou nom de l'établissement créancier
  client_code      text NOT NULL UNIQUE,
  debtor_name      text NOT NULL,
  debtor_email     text,
  debtor_phone     text,
  amount           numeric(18,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  recovered_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK (recovered_amount >= 0),
  status           text NOT NULL DEFAULT 'a_relancer',
  management_level text NOT NULL DEFAULT 'recouvreur',
  assigned_to      text DEFAULT 'Non assigné',
  risk_level       text DEFAULT 'Moyen',
  delay_days       integer NOT NULL DEFAULT 0 CHECK (delay_days >= 0),
  due_date         date,
  notes            text DEFAULT '',
  portfolio        text,
  branch           text,
  -- métadonnées d'intégrité (lot P1)
  version          integer NOT NULL DEFAULT 1,   -- verrou optimiste
  row_hash         text,                          -- empreinte stable (hors version/maj)
  created_by       text NOT NULL DEFAULT 'system',
  updated_by       text NOT NULL DEFAULT 'system',
  deleted_at       timestamptz,                   -- suppression logique (soft-delete)
  deleted_by       text,
  retention_until  timestamptz,                   -- épurable après échéance (loi 2004-63)
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dossiers_institution ON public.dossiers (institution) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dossiers_status ON public.dossiers (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dossiers_created ON public.dossiers (created_at DESC);

CREATE OR REPLACE FUNCTION public.dossier_row_hash(r public.dossiers)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT encode(digest((to_jsonb(r) - 'version' - 'updated_at' - 'row_hash' - 'created_at' - 'created_by' - 'updated_by' - 'deleted_at' - 'deleted_by')::text, 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.set_dossier_updated()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  NEW.version := OLD.version + 1;
  NEW.row_hash := public.dossier_row_hash(NEW);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dossiers_meta ON public.dossiers;
CREATE TRIGGER trg_dossiers_meta BEFORE UPDATE ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.set_dossier_updated();

CREATE OR REPLACE FUNCTION public.set_dossier_created()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.row_hash := public.dossier_row_hash(NEW);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dossiers_insert ON public.dossiers;
CREATE TRIGGER trg_dossiers_insert BEFORE INSERT ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.set_dossier_created();

-- ---------------------------------------------------------------------------
-- 2. Journal d'audit append-only, chaîné, avec différentiels
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_events (
  id           bigserial PRIMARY KEY,
  action       text NOT NULL,
  details      text NOT NULL,
  actor        text NOT NULL,
  actor_role   text NOT NULL,
  entity_type  text,
  entity_id    text,
  before_state jsonb,
  after_state  jsonb,
  prev_hash    text NOT NULL,
  hash         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_events (entity_type, entity_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_events (actor, id DESC);

-- Append-only : toute modification ou suppression de ligne est refusée par la base.
CREATE OR REPLACE FUNCTION public.forbid_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events est append-only (journal probatoire)';
END $$;

DROP TRIGGER IF EXISTS trg_audit_append_only ON public.audit_events;
CREATE TRIGGER trg_audit_append_only BEFORE UPDATE OR DELETE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.forbid_audit_mutation();

-- ---------------------------------------------------------------------------
-- 3. Cloisonnement par institution (RLS piloté par GUC applicatif)
-- ---------------------------------------------------------------------------
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
-- Le propriétaire est lui-même soumis aux politiques (au cas où l'app se connecterait en owner).
ALTER TABLE public.dossiers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events FORCE ROW LEVEL SECURITY;

CREATE POLICY p_dossiers_tenant ON public.dossiers
  USING (
    current_setting('app.institution', true) = ''
    OR institution = current_setting('app.institution', true)
  )
  WITH CHECK (
    current_setting('app.institution', true) = ''
    OR institution = current_setting('app.institution', true)
  );

-- Le journal ne se lit que sans contexte locataire (console d'audit) ou par son auteur.
CREATE POLICY p_audit_read ON public.audit_events
  FOR SELECT USING (
    current_setting('app.institution', true) = ''
    OR actor = current_setting('app.actor', true)
  );

CREATE POLICY p_audit_write ON public.audit_events
  FOR INSERT WITH CHECK (true);

-- Pas de politique UPDATE/DELETE => refusé par RLS, doublon du trigger append-only.

-- ---------------------------------------------------------------------------
-- 4. Rôles applicatifs (défense en profondeur)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'recovai_app') THEN
    CREATE ROLE recovai_app LOGIN PASSWORD 'change_me_in_deployment';
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE (
  institution, client_code, debtor_name, debtor_email, debtor_phone,
  amount, recovered_amount, status, management_level, assigned_to,
  risk_level, delay_days, due_date, notes, portfolio, branch, updated_by,
  deleted_at, deleted_by, retention_until, version, updated_at
) ON public.dossiers TO recovai_app;
GRANT DELETE ON public.dossiers TO recovai_app; -- jamais utilisé (soft-delete), mais le trigger append-only suffit pour audit
GRANT SELECT, INSERT ON public.audit_events TO recovai_app;
GRANT USAGE, SELECT ON SEQUENCE public.audit_events_id_seq TO recovai_app;

COMMIT;
