-- EXECUTE SOMENTE APÓS A CONTA PROPRIETÁRIA ESTAR CRIADA E O BACKUP SER VALIDADO.
-- Requer psql com variável -v owner_id='<UUID real do Neon Auth>' (não inserir e-mail ou senha no SQL).
-- ATENÇÃO: jamais executar em produção antes de aprovado o go/no-go.
-- Manter o aplicativo antigo em modo leitura durante a janela de migração.
BEGIN;

-- Impede a transferência silenciosa para um usuário não verificado.
INSERT INTO public.app_profiles(id,email,role,enabled)
SELECT id,lower(email),'owner',true FROM neon_auth."user"
WHERE id=:'owner_id'::uuid AND "emailVerified"=true
ON CONFLICT(id) DO NOTHING;

-- Rejeitar via checagem externa se nenhuma linha owner foi criada; não prosseguir cegamente.
-- A FK garante que o ID não seja inventado.
INSERT INTO public.user_workout_templates
  (user_id,id,name,description,days,category,exercises,position,created_at,updated_at)
SELECT :'owner_id'::uuid,id,name,description,days,category,exercises,position,created_at,updated_at
FROM public.workout_templates
ON CONFLICT(user_id,id) DO NOTHING;

INSERT INTO public.user_training_goals
  (user_id,name,starts_on,ends_on,workouts_per_week,updated_at)
SELECT :'owner_id'::uuid,name,starts_on,ends_on,workouts_per_week,updated_at
FROM public.training_goal
WHERE id=1
ON CONFLICT(user_id) DO NOTHING;

UPDATE public.workout_sessions SET user_id=:'owner_id'::uuid
WHERE user_id IS NULL;

-- Conferir as contagens de migração ANTES de efetivar qualquer constraint destrutiva.
SELECT
 (SELECT count(*) FROM public.workout_templates) AS old_templates,
 (SELECT count(*) FROM public.user_workout_templates WHERE user_id=:'owner_id'::uuid) AS owner_templates,
 (SELECT count(*) FROM public.workout_sessions) AS all_sessions,
 (SELECT count(*) FROM public.workout_sessions WHERE user_id=:'owner_id'::uuid) AS owner_sessions,
 (SELECT count(*) FROM public.session_sets) AS all_sets,
 (SELECT count(*) FROM public.session_sets ss
  JOIN public.workout_sessions ws ON ws.id=ss.session_id
  WHERE ws.user_id=:'owner_id'::uuid) AS owner_sets,
 (SELECT count(*) FROM public.training_goal) AS old_goals,
 (SELECT count(*) FROM public.user_training_goals WHERE user_id=:'owner_id'::uuid) AS owner_goals;

-- Revisar contagens manualmente antes do COMMIT:
-- Recomendação: executar a última SELECT em uma transação de staging;
-- adicionar constraints NOT NULL apenas depois da confirmação do backfill.
COMMIT;
