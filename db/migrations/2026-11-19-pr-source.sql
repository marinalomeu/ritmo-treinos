-- Proveniência de PR: diferenciar registro manual de atualização explícita pós-treino.
-- Valores existentes permanecem manuais. Aplicar inicialmente só em staging.
BEGIN;
ALTER TABLE public.user_personal_records
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
ALTER TABLE public.user_personal_records
  ADD CONSTRAINT user_personal_records_source_check
  CHECK (source IN ('manual','workout'));
COMMIT;
