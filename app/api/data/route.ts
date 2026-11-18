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
    const goals = await sql`
      SELECT name,starts_on::text AS starts_on,ends_on::text AS ends_on,workouts_per_week
      FROM public.user_training_goals WHERE user_id=${user.id}::uuid LIMIT 1
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
    return NextResponse.json({sessions,progress,goal:goals[0]||null,templates,historicalExercises},
      {headers:{'Cache-Control':'no-store'}});
  } catch(error) { return serverError(error); }
}
