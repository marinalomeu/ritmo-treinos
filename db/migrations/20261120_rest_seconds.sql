-- Descanso opcional por exercício (snapshot nas séries), migração aditiva.
ALTER TABLE public.session_sets ADD COLUMN IF NOT EXISTS rest_seconds smallint;
ALTER TABLE public.session_sets DROP CONSTRAINT IF EXISTS session_sets_rest_seconds_check;
ALTER TABLE public.session_sets ADD CONSTRAINT session_sets_rest_seconds_check CHECK (rest_seconds IS NULL OR rest_seconds BETWEEN 0 AND 3600);
