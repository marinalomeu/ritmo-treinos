-- Migracao aditiva, inicialmente apenas na branch staging/multiuser-2026-11-18.
CREATE TABLE IF NOT EXISTS public.user_personal_records (
  user_id UUID NOT NULL REFERENCES public.app_profiles(id) ON DELETE RESTRICT,
  exercise_key TEXT NOT NULL CHECK (exercise_key ~ '^[A-Za-z0-9_-]{1,100}$'),
  weight_kg NUMERIC(8,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg <= 2000),
  repetitions SMALLINT NOT NULL CHECK (repetitions BETWEEN 1 AND 30),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(user_id,exercise_key)
);
CREATE TABLE IF NOT EXISTS public.user_exercise_modalities (
  user_id UUID NOT NULL REFERENCES public.app_profiles(id) ON DELETE RESTRICT,
  exercise_key TEXT NOT NULL CHECK (exercise_key ~ '^[A-Za-z0-9_-]{1,100}$'),
  modality TEXT NOT NULL CHECK (modality IN ('Academia','CrossFit','Funcional','Calistenia','Corrida','Pilates','Outros')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(user_id,exercise_key)
);
COMMENT ON TABLE public.user_personal_records IS 'Recorde por usuario e exercicio, carga e repeticoes; 1RM calculado com Epley.';
COMMENT ON TABLE public.user_exercise_modalities IS 'Modalidade categorizada por usuario por chave de exercicio; sem alterar fichas nem series.';
