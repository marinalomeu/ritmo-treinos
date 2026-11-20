-- Distância efetivamente realizada em metros, separada de reps e velocidade.
ALTER TABLE public.session_sets ADD COLUMN IF NOT EXISTS actual_distance_m numeric(12,2);
ALTER TABLE public.session_sets DROP CONSTRAINT IF EXISTS session_sets_actual_distance_check;
ALTER TABLE public.session_sets ADD CONSTRAINT session_sets_actual_distance_check CHECK (actual_distance_m IS NULL OR actual_distance_m BETWEEN 0 AND 1000000);
