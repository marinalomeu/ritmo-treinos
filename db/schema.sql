-- Execute uma única vez no Neon SQL Editor. Não armazena senhas de acesso ao app.
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL CHECK (template_id IN ('A','B','C','D')),
  template_name TEXT NOT NULL,
  performed_on DATE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished'))
);

CREATE TABLE IF NOT EXISTS session_sets (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_key TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  sort_order SMALLINT NOT NULL,
  block_number SMALLINT,
  set_number SMALLINT NOT NULL CHECK (set_number > 0),
  target_reps TEXT NOT NULL,
  load_unit TEXT NOT NULL CHECK (load_unit IN ('kg','assist_kg','km/h','none')),
  weight_kg NUMERIC(8,2),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(session_id, exercise_key, set_number)
);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(performed_on DESC, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_sets_session ON session_sets(session_id, sort_order, set_number);
CREATE INDEX IF NOT EXISTS idx_session_sets_progress ON session_sets(exercise_key, completed_at DESC) WHERE completed = TRUE;
