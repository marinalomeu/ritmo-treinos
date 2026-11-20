-- PLANEJAMENTO DE MIGRAÇÃO FUTURA — NÃO EXECUTAR.
-- Depende de 20261120_partner_boxes_foundation.sql e autenticação individual.
-- Link de indicação comercial NUNCA concede acesso ao painel privado do box.
BEGIN;
CREATE TABLE IF NOT EXISTS referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Za-z0-9_-]{6,64}$'),
  organization_id UUID REFERENCES partner_organizations(id),
  user_id UUID REFERENCES app_users(id),
  created_by UUID NOT NULL REFERENCES app_users(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  CHECK ((organization_id IS NOT NULL) <> (user_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS referral_links_organization ON referral_links(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS referral_links_user ON referral_links(user_id) WHERE user_id IS NOT NULL;

-- Observação: visitas anônimas de marketing e cookies dependem de consentimento,
-- política de retenção e controles antifraude; não são modelados aqui.
CREATE TABLE IF NOT EXISTS referral_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referred_user_id UUID NOT NULL REFERENCES app_users(id),
  referral_link_id UUID NOT NULL REFERENCES referral_links(id),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending','verified','rejected')),
  UNIQUE(referred_user_id)
);
-- 1 claim principal por usuário; modelo de atribuição first/last touch
-- será definido e registrado contratualmente antes da implementação.

-- Uma conversão paga pode produzir um evento financeiro auditável.
-- Não calcular comissão a partir de clique, cadastro ou membership.
CREATE TABLE IF NOT EXISTS referral_conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_claim_id UUID NOT NULL REFERENCES referral_claims(id),
  external_subscription_reference TEXT NOT NULL,
  external_payment_reference TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('paid','refunded','chargeback')),
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(external_payment_reference,event_type)
);
CREATE INDEX IF NOT EXISTS referral_conversions_claim ON referral_conversion_events(referral_claim_id,occurred_at DESC);

-- Comissão e repasse dependem de termos aprovados, estornos e regras financeiras.
-- Nenhuma comissão é gerada automaticamente por esta migração.
COMMIT;
