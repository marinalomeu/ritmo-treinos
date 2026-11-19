import { NextResponse } from 'next/server';
import { db, unauthorized, serverError } from '../../../lib/server';
import { currentProfile, multiuserConfigured } from '../../../lib/multiuser';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!multiuserConfigured()) return NextResponse.json({error:'Ambiente não configurado.'},{status:503});
  const user = await currentProfile();
  if (!user) return unauthorized();
  try {
    const sql = db();
    const sessions = await sql`
      SELECT ws.id::text AS id,ws.template_id,ws.template_name,ws.performed_on::text AS performed_on,
        ws.started_at::text AS started_at,ws.finished_at::text AS finished_at,ws.status,
        COUNT(ss.id)::int AS total_sets,
        COUNT(ss.id) FILTER (WHERE ss.completed)::int AS completed_sets
      FROM public.workout_sessions ws
      LEFT JOIN public.session_sets ss ON ss.session_id=ws.id
      WHERE ws.user_id=${user.id}::uuid
      GROUP BY ws.id
      ORDER BY ws.performed_on DESC,ws.started_at DESC LIMIT 3000
    `;
    const progress = await sql`
      SELECT ss.exercise_key,MAX(ss.exercise_name) AS exercise_name,MAX(ss.load_unit) AS load_unit,
        ws.performed_on::text AS performed_on,ws.id::text AS session_id,
        (CASE WHEN MAX(ss.load_unit)='assist_kg' THEN MIN(ss.weight_kg) ELSE MAX(ss.weight_kg) END)::float8 AS weight_kg
      FROM public.workout_sessions ws JOIN public.session_sets ss ON ss.session_id=ws.id
      WHERE ws.user_id=${user.id}::uuid AND ss.completed=true
        AND ss.weight_kg IS NOT NULL AND ss.load_unit IN ('kg','assist_kg','km/h')
      GROUP BY ss.exercise_key,ws.id,ws.performed_on,ws.started_at
      ORDER BY ws.performed_on DESC,ws.started_at DESC LIMIT 10000
    `;
    // Usuário recém-convidado sem meta salva recebe um padrão ESTÁVEL desde o dia
    // do cadastro (horário de Brasília). Personalizações prevalecem, sem escrita no GET.
    const goals = await sql`
      SELECT name,starts_on::text AS starts_on,ends_on::text AS ends_on,workouts_per_week
      FROM public.user_training_goals WHERE user_id=${user.id}::uuid
      UNION ALL
      SELECT 'Minha primeira meta' AS name,
        (u."createdAt" AT TIME ZONE 'America/Sao_Paulo')::date::text AS starts_on,
        make_date(EXTRACT(YEAR FROM (u."createdAt" AT TIME ZONE 'America/Sao_Paulo'))::integer,12,31)::text AS ends_on,
        7::integer AS workouts_per_week
      FROM neon_auth."user" u
      WHERE u.id=${user.id}::uuid AND ${user.role}='member'
        AND NOT EXISTS (SELECT 1 FROM public.user_training_goals WHERE user_id=${user.id}::uuid)
      LIMIT 1
    `;
    const templates = await sql`
      SELECT id,name,description,days,category,exercises FROM public.user_workout_templates
      WHERE user_id=${user.id}::uuid ORDER BY position,created_at,id
    `;
    const historicalExercises = await sql`
      SELECT DISTINCT ON (ss.exercise_key)
        ss.exercise_key AS key,ss.exercise_name AS name,ss.load_unit AS unit
      FROM public.session_sets ss
      JOIN public.workout_sessions ws ON ws.id=ss.session_id
      WHERE ws.user_id=${user.id}::uuid AND ss.completed=true
        AND ss.weight_kg IS NOT NULL AND ss.load_unit IN ('kg','assist_kg','km/h')
      ORDER BY ss.exercise_key,ss.completed_at DESC NULLS LAST,ss.id DESC
    `;
    const personalRecords=await sql`
      SELECT exercise_key,weight_kg::float8 AS weight_kg,repetitions,updated_at::text AS updated_at
      FROM public.user_personal_records WHERE user_id=${user.id}::uuid ORDER BY exercise_key
    `;
    // A página de PRs só recebe exercícios de fichas fixas ou desta lista
    // de adições explícitas; sessões avulsas não criam pins automaticamente.
    const prPinned=await sql`
      SELECT exercise_key FROM public.user_pr_exercises
      WHERE user_id=${user.id}::uuid ORDER BY added_at
    `;
    // Última carga CONCLUÍDA; target_reps é a meta planejada, não reps medidas.
    // A interface a identifica como referência, nunca como PR confirmado.
    const prReferences=await sql`
      SELECT DISTINCT ON (ss.exercise_key) ss.exercise_key,
        ss.weight_kg::float8 AS weight_kg,ss.actual_reps,ss.target_reps,
        ws.performed_on::text AS performed_on
      FROM public.session_sets ss JOIN public.workout_sessions ws ON ws.id=ss.session_id
      WHERE ws.user_id=${user.id}::uuid AND ws.status='finished'
        AND ss.completed=true AND ss.weight_kg>0
        AND ss.load_unit IN ('kg','none')
      ORDER BY ss.exercise_key,ws.performed_on DESC,ws.started_at DESC,
        ss.completed_at DESC NULLS LAST,ss.id DESC
    `;
    const exerciseModalities=await sql`
      SELECT exercise_key,modality FROM public.user_exercise_modalities
      WHERE user_id=${user.id}::uuid ORDER BY exercise_key
    `;
    const customExercises=await sql`
      SELECT exercise_key AS key,name,unit,modality FROM public.user_custom_exercises
      WHERE user_id=${user.id}::uuid ORDER BY name
    `;
    return NextResponse.json({sessions,progress,goal:goals[0]||null,templates,historicalExercises,personalRecords,prPinned:prPinned.map(e=>e.exercise_key),prReferences,exerciseModalities,customExercises:customExercises.map(e=>({...e,origin:'personal'}))},
      {headers:{'Cache-Control':'no-store'}});
  } catch(error) { return serverError(error); }
}
