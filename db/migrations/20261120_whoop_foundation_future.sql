-- WHOOP future-only migration. DO NOT EXECUTE until multiuser and third-party data QA is approved.
-- Tables isolate tokens and imported metrics to a verified app_profiles owner.
-- This migration intentionally does NOT enable a connection, seed tokens or read WHOOP.
CREATE TABLE IF NOT EXISTS public.whoop_connections (
  user_id uuid PRIMARY KEY REFERENCES public.app_profiles(id) ON DELETE CASCADE,
  whoop_user_id text,
  encrypted_access_token text,
  encrypted_refresh_token text,
  token_expires_at timestamptz,
  granted_scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  connected_at timestamptz,
  last_sync_at timestamptz,
  disconnected_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whoop_id_length CHECK (whoop_user_id IS NULL OR length(whoop_user_id) <= 150),
  CONSTRAINT whoop_tokens_paired CHECK (
    (encrypted_access_token IS NULL AND encrypted_refresh_token IS NULL)
    OR (encrypted_access_token IS NOT NULL AND encrypted_refresh_token IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.whoop_oauth_states (
  state_sha256 char(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.app_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  CONSTRAINT whoop_oauth_expiry CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS whoop_oauth_states_user_expiry_idx
  ON public.whoop_oauth_states (user_id, expires_at);

CREATE TABLE IF NOT EXISTS public.whoop_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_profiles(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'whoop' CHECK (provider = 'whoop'),
  kind text NOT NULL CHECK (kind IN ('workout','cycle','recovery','sleep')),
  external_id varchar(150) NOT NULL,
  measured_at timestamptz NOT NULL,
  measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, kind, external_id)
);

CREATE INDEX IF NOT EXISTS whoop_imports_user_measured_idx
  ON public.whoop_imports (user_id, measured_at DESC);

-- Planned authorization policy: all reads/writes through authenticated server
-- routes that resolve currentProfile() and require user_id=profile.id.
-- Do not expose these tables through client-side SQL, PUBLIC grants or unscoped APIs.
-- At activation time, review owner role, token key rotation, deletion/retention
-- and concurrent refresh-token rotation. No automated sync until approved.
