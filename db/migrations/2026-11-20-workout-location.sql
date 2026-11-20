-- Local opcional do treino, informado manualmente, sem geolocalização.
-- Executar somente após backup, primeiro no branch de staging.
-- Não fazer alterações em produção sem aprovação de cutover.
ALTER TABLE public.user_workout_templates
  ADD COLUMN IF NOT EXISTS gym_name varchar(100);
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS gym_name varchar(100);
-- Os registros legados permanecem com NULL; alterações em fichas não reescrevem sessões.
