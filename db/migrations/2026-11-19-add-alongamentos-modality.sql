-- Migração incremental para a modalidade Alongamentos.
-- Aplicar inicialmente APENAS em staging, após revisão e autorização.
-- Não altera fichas, sessões, PRs nem registros existentes.
BEGIN;
ALTER TABLE public.user_exercise_modalities
  DROP CONSTRAINT IF EXISTS user_exercise_modalities_modality_check;
ALTER TABLE public.user_exercise_modalities
  ADD CONSTRAINT user_exercise_modalities_modality_check
  CHECK (modality IN (
    'Academia','CrossFit','Funcional','Calistenia',
    'Corrida','Pilates','Alongamentos','Outros'
  ));
COMMIT;
