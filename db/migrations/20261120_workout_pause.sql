-- Pausas persistentes por sessão, com relógio baseado em timestamps do servidor.
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS paused_at timestamptz;
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS paused_ms bigint NOT NULL DEFAULT 0;
ALTER TABLE public.workout_sessions DROP CONSTRAINT IF EXISTS workout_sessions_paused_ms_nonnegative;
ALTER TABLE public.workout_sessions ADD CONSTRAINT workout_sessions_paused_ms_nonnegative CHECK (paused_ms>=0);
