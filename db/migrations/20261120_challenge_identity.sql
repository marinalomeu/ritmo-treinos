-- Identidade canônica do desafio para distinguir conclusões e recordes por conta.
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS challenge_id text;
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS challenge_division text;
CREATE INDEX IF NOT EXISTS idx_workout_sessions_challenge_user ON public.workout_sessions(user_id,challenge_id,challenge_division,finished_at) WHERE challenge_id IS NOT NULL;
