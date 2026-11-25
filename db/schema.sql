-- Execute uma única vez no Neon SQL Editor. Não armazena senhas de acesso ao app.
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL CHECK (length(template_id) BETWEEN 1 AND 100),
  template_name TEXT NOT NULL,
  performed_on DATE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  wod_blocks JSONB,
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
  load_unit TEXT NOT NULL CHECK (load_unit IN ('kg','lb','assist_kg','km/h','none')),
  weight_kg NUMERIC(14,8),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(session_id, exercise_key, set_number)
);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(performed_on DESC, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_sets_session ON session_sets(session_id, sort_order, set_number);
CREATE INDEX IF NOT EXISTS idx_session_sets_progress ON session_sets(exercise_key, completed_at DESC) WHERE completed = TRUE;

-- Meta pessoal editável (singleton; nunca armazena dados de visitante da demonstração).
CREATE TABLE IF NOT EXISTS training_goal (
 id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id=1),
 name VARCHAR(60) NOT NULL,
 starts_on DATE NOT NULL,
 ends_on DATE NOT NULL,
 workouts_per_week SMALLINT NOT NULL CHECK (workouts_per_week BETWEEN 1 AND 6),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT training_goal_dates CHECK (starts_on <= ends_on)
);
INSERT INTO training_goal (id,name,starts_on,ends_on,workouts_per_week)
VALUES (1,'Projeto Carnaval','2026-11-18','2027-02-11',6)
ON CONFLICT (id) DO NOTHING;

-- Fichas editáveis. Cada sessão guarda sua própria cópia dos exercícios em session_sets.
-- Excluir/alterar uma ficha nunca remove as séries históricas.
CREATE TABLE IF NOT EXISTS workout_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  days TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Personalizado',
  exercises JSONB NOT NULL CHECK (jsonb_typeof(exercises)='array'),
  position INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- As quatro fichas originais são inseridas uma única vez pela migração inicial,
-- sem substituir versões editadas pelo usuário.
