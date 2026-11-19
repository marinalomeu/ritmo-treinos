-- Repetições efetivamente realizadas, distintas das metas da ficha.
-- Migração aditiva: histórico antigo permanece com actual_reps=NULL (não medido).
-- Executar primeiro SOMENTE na branch de homologação.
BEGIN;
ALTER TABLE public.session_sets ADD COLUMN IF NOT EXISTS actual_reps integer NULL;
ALTER TABLE public.session_sets
  ADD CONSTRAINT session_sets_actual_reps_check
  CHECK (actual_reps IS NULL OR actual_reps BETWEEN 0 AND 10000);
COMMIT;
