-- MIGRAÇÃO FUTURA. NÃO EXECUTAR sem autenticação individual + isolamento de dados.
BEGIN;
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS app_users_verified_email_idx
  ON app_users(lower(email)) WHERE email_verified_at IS NOT NULL AND status <> 'deleted';

CREATE TABLE IF NOT EXISTS partner_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,59}$'),
  name TEXT NOT NULL,
  organization_type TEXT NOT NULL DEFAULT 'crossfit_box'
    CHECK (organization_type IN ('crossfit_box','gym','studio','coach','other')),
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','suspended','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS partner_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES partner_organizations(id),
  user_id UUID NOT NULL REFERENCES app_users(id),
  role TEXT NOT NULL CHECK (role IN ('owner','admin','coach','member')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','suspended','revoked')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  UNIQUE (organization_id,user_id)
);
CREATE INDEX IF NOT EXISTS memberships_by_user_active
  ON partner_memberships(user_id,organization_id) WHERE status='active';
CREATE INDEX IF NOT EXISTS memberships_by_org_active
  ON partner_memberships(organization_id,role) WHERE status='active';

CREATE TABLE IF NOT EXISTS partner_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES partner_organizations(id),
  email TEXT NOT NULL,
  invited_role TEXT NOT NULL DEFAULT 'member' CHECK (invited_role IN ('coach','member')),
  token_hash BYTEA NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  redeemed_by UUID REFERENCES app_users(id),
  revoked_at TIMESTAMPTZ,
  invited_by UUID NOT NULL REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (redeemed_at IS NULL OR redeemed_by IS NOT NULL),
  CHECK (redeemed_at IS NULL OR revoked_at IS NULL)
);
CREATE INDEX IF NOT EXISTS invitations_by_org ON partner_invitations(organization_id,created_at DESC);

-- Aquisição comercial não concede acesso à área privada.
CREATE TABLE IF NOT EXISTS partner_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id),
  organization_id UUID NOT NULL REFERENCES partner_organizations(id),
  channel TEXT NOT NULL CHECK (channel IN ('partner_sale','referral','manual_verified')),
  attribution_code TEXT,
  attributed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  evidence_reference TEXT,
  UNIQUE (user_id,organization_id,channel)
);
CREATE INDEX IF NOT EXISTS attribution_by_org ON partner_attributions(organization_id,attributed_at DESC);

CREATE TABLE IF NOT EXISTS partner_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES partner_organizations(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','ended')),
  starts_on DATE,
  ends_on DATE,
  terms_version TEXT,
  CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on)
);

-- WODs não aparecem em consultas públicas. Acesso deve ser autorizado NO SERVIDOR.
CREATE TABLE IF NOT EXISTS partner_wods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES partner_organizations(id),
  author_user_id UUID NOT NULL REFERENCES app_users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  scheduled_for DATE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','published','archived')),
  publication_at TIMESTAMPTZ,
  exercises JSONB NOT NULL CHECK (jsonb_typeof(exercises)='array'),
  format TEXT NOT NULL DEFAULT 'custom'
    CHECK (format IN ('custom','for_time','amrap','emom','strength','intervals')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version>=1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_wods_calendar
  ON partner_wods(organization_id,scheduled_for DESC,status);
COMMIT;

-- AQUI NÃO SE FAZ MIGRAÇÃO DAS SESSÕES ANTIGAS. Pré-requisitos:
-- 1) Autenticação individual e email verificado.
-- 2) Backfill de user_id em workout_sessions, workout_templates e training_goal.
-- 3) Imposição de user_id em TODAS as consultas antigas antes de conectar estas tabelas.
-- 4) Autorizações de tenant e papel auditadas no backend.
-- 5) Implementar source_kind + source_wod_id nas sessões para preservar origem.
