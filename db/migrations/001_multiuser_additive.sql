-- ritmo. multiuser migration (ADD-ONLY)
-- Apply only after Neon Auth is enabled. Run staging checks first.
-- IMPORTANT: Does not migrate owner records or disable legacy tables. Those need an authenticated owner ID at cutover.

CREATE TABLE IF NOT EXISTS public.app_profiles (
  id uuid PRIMARY KEY REFERENCES neon_auth."user"(id) ON DELETE RESTRICT,
  email text NOT NULL UNIQUE CHECK (email = lower(email) AND length(email) BETWEEN 5 AND 254),
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_profiles_single_owner ON public.app_profiles(role) WHERE role='owner';

CREATE TABLE IF NOT EXISTS public.app_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (email = lower(email) AND length(email) BETWEEN 5 AND 254),
  token_hash text NOT NULL UNIQUE CHECK (length(token_hash)=64),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  invited_by uuid NOT NULL REFERENCES public.app_profiles(id) ON DELETE RESTRICT,
  accepted_by uuid REFERENCES public.app_profiles(id) ON DELETE SET NULL,
  CHECK (expires_at > created_at)
);

ALTER TABLE public.app_invitations ADD COLUMN IF NOT EXISTS activated_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS app_invitations_one_pending_per_email ON public.app_invitations (lower(email)) WHERE status='pending';

CREATE TABLE IF NOT EXISTS public.user_workout_templates (
  user_id uuid NOT NULL REFERENCES public.app_profiles(id) ON DELETE RESTRICT,
  id text NOT NULL CHECK (length(id) BETWEEN 1 AND 100),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  days text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Personalizado',
  exercises jsonb NOT NULL CHECK (jsonb_typeof(exercises)='array'),
  position integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,id)
);

CREATE INDEX IF NOT EXISTS idx_user_workout_templates_user ON public.user_workout_templates(user_id,position,created_at);

CREATE TABLE IF NOT EXISTS public.user_training_goals (
  user_id uuid PRIMARY KEY REFERENCES public.app_profiles(id) ON DELETE RESTRICT,
  name varchar(60) NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  workouts_per_week smallint NOT NULL CHECK (workouts_per_week BETWEEN 1 AND 6),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (starts_on<=ends_on)
);

ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.app_profiles(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON public.workout_sessions(user_id,performed_on DESC,started_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_sets_exercise_session ON public.session_sets(session_id,exercise_key) WHERE completed=true;
