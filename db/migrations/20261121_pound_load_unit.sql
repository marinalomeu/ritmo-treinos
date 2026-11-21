BEGIN;
SET LOCAL lock_timeout = '3s';
ALTER TABLE public.session_sets
  ALTER COLUMN weight_kg TYPE numeric(14,8),
  DROP CONSTRAINT session_sets_load_unit_check,
  ADD CONSTRAINT session_sets_load_unit_check
    CHECK (load_unit IN ('kg','lb','assist_kg','km/h','none'));
COMMIT;
