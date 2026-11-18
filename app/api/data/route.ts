import { NextResponse } from 'next/server';
import { db, hasSession, serverError, unauthorized } from '../../../lib/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (!await hasSession()) return unauthorized();
  try {
    const sql = db();
    const sessions = await sql`
      SELECT ws.id::text AS id, ws.template_id, ws.template_name, ws.performed_on::text AS performed_on,
        ws.started_at::text AS started_at, ws.finished_at::text AS finished_at, ws.status,
        COUNT(ss.id)::int AS total_sets,
        COUNT(ss.id) FILTER (WHERE ss.completed)::int AS completed_sets
      FROM workout_sessions ws LEFT JOIN session_sets ss ON ss.session_id = ws.id
      GROUP BY ws.id ORDER BY ws.performed_on DESC, ws.started_at DESC LIMIT 150
    `;
    const progress = await sql`
      SELECT ss.exercise_key, MAX(ss.exercise_name) AS exercise_name, MAX(ss.load_unit) AS load_unit,
        ws.performed_on::text AS performed_on, ws.id::text AS session_id,
        (CASE WHEN MAX(ss.load_unit) = 'assist_kg' THEN MIN(ss.weight_kg) ELSE MAX(ss.weight_kg) END)::float8 AS weight_kg
      FROM workout_sessions ws JOIN session_sets ss ON ss.session_id = ws.id
      WHERE ss.completed = TRUE AND ss.weight_kg IS NOT NULL
        AND ss.load_unit IN ('kg','assist_kg','km/h')
      GROUP BY ss.exercise_key, ws.id, ws.performed_on, ws.started_at
      ORDER BY ws.performed_on DESC, ws.started_at DESC LIMIT 600
    `;
    return NextResponse.json({sessions, progress}, {headers:{'Cache-Control':'no-store'}});
  } catch (error) { return serverError(error); }
}
