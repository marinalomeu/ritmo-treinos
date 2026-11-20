-- Recordes de corrida: melhor tempo para distância equivalente, por usuário.
CREATE TABLE IF NOT EXISTS public.user_running_records (
 user_id uuid NOT NULL REFERENCES public.app_profiles(id) ON DELETE RESTRICT,
 exercise_key text NOT NULL CHECK (exercise_key ~ '^[A-Za-z0-9_-]{1,100}$'),
 distance_m numeric(12,2) NOT NULL CHECK (distance_m>0 AND distance_m<=1000000),
 duration_seconds integer NOT NULL CHECK (duration_seconds BETWEEN 1 AND 864000),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,exercise_key,distance_m)
);
