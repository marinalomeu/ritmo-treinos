-- Ritmo multiusuário: permitir até sete treinos por semana.
-- Migração ADITIVA de regra: preserva todas as metas existentes e seus valores.
-- Executar primeiro na branch Neon staging, nunca em produção sem autorização de cutover.

BEGIN;

ALTER TABLE public.user_training_goals
  DROP CONSTRAINT user_training_goals_workouts_per_week_check,
  ADD CONSTRAINT user_training_goals_workouts_per_week_check
  CHECK (workouts_per_week BETWEEN 1 AND 7);

COMMIT;
