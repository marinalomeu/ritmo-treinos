-- Biblioteca pessoal de exercícios. Executar inicialmente apenas em staging.
-- Sem alterações no catálogo padrão compartilhado, nem no histórico já existente.
CREATE TABLE IF NOT EXISTS public.user_custom_exercises (
  user_id UUID NOT NULL REFERENCES public.app_profiles(id) ON DELETE RESTRICT,
  exercise_key TEXT NOT NULL CHECK (exercise_key ~ '^ex-[a-f0-9-]{36}$'),
  name TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  unit TEXT NOT NULL CHECK (unit IN ('kg','assist_kg','km/h','none')),
  modality TEXT NOT NULL CHECK (modality IN ('Academia','CrossFit','Funcional','Calistenia','Corrida','Pilates','Alongamentos','Outros')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, exercise_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS user_custom_exercises_user_normalized_name
  ON public.user_custom_exercises (user_id, lower(btrim(name)));
COMMENT ON TABLE public.user_custom_exercises IS 'Exercícios pessoais de cada conta. Identidade e nome jamais publicados para outros usuários.';
