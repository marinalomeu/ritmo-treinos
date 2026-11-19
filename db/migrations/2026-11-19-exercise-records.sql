-- Apenas staging até a homologação do multiusuário.
-- Repositório de PRs e classificação de exercícios POR USUÁRIO.
CREATE TABLE IF NOT EXISTS public.user_exercise_records (
  user_id UUID NOT NULL REFERENCES public.app_profiles(id) ON DELETE CASCADE,
  exercise_key TEXT NOT NULL CHECK (length(exercise_key) BETWEEN 1 AND 100),
  exercise_name TEXT NOT NULL CHECK (length(exercise_name) BETWEEN 1 AND 100),
  modality TEXT NOT NULL DEFAULT 'Não classificado' CHECK (length(modality) BETWEEN 2 AND 40),
  pr_weight_kg NUMERIC(8,2) CHECK (pr_weight_kg > 0 AND pr_weight_kg <= 2000),
  pr_reps SMALLINT CHECK (pr_reps BETWEEN 1 AND 30),
  planned_reps SMALLINT NOT NULL DEFAULT 8 CHECK (planned_reps BETWEEN 1 AND 30),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, exercise_key),
  CONSTRAINT user_exercise_records_pair_check CHECK ((pr_weight_kg IS NULL) = (pr_reps IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_user_exercise_records_modality
  ON public.user_exercise_records (user_id, modality);
