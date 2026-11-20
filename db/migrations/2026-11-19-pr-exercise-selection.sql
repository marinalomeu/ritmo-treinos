-- Ritmo: exercícios explicitamente adicionados à página de PRs.
-- Apenas staging nesta etapa. Não altera nem exclui treinos/PRs existentes.
BEGIN;
CREATE TABLE IF NOT EXISTS public.user_pr_exercises(
  user_id uuid NOT NULL REFERENCES public.app_profiles(id) ON DELETE RESTRICT,
  exercise_key text NOT NULL CHECK (exercise_key ~ '^[A-Za-z0-9_-]{1,100}$'),
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,exercise_key)
);
COMMIT;
