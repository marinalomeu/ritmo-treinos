import { NextResponse } from 'next/server';
import { db, hasSession, sameOrigin, serverError, unauthorized, forbiddenOrigin } from '../../../lib/server';
import { getTemplate, makeSets } from '../../../lib/templates';
export async function POST(request: Request) {
  if (!await hasSession()) return unauthorized();
  if (!sameOrigin(request)) return forbiddenOrigin();
  try {
    const body = await request.json();
    const template = getTemplate(body.template_id);
    const date = body.performed_on;
    if (!template || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`))) {
      return NextResponse.json({error:'Ficha ou data inválida.'},{status:400});
    }
    const sql = db();
    const latest = await sql`
      SELECT DISTINCT ON (exercise_key) exercise_key, weight_kg::float8 AS weight_kg
      FROM session_sets WHERE completed = TRUE AND weight_kg IS NOT NULL
      ORDER BY exercise_key, completed_at DESC NULLS LAST, id DESC
    `;
    const past = Object.fromEntries(latest.map((r) => [r.exercise_key, r.weight_kg]));
    const sets = makeSets(template,past);
    const created = await sql`
      INSERT INTO workout_sessions(template_id,template_name,performed_on) VALUES (${template.id},${template.name},${date}::date)
      RETURNING id::text AS id
    `;
    const id = created[0].id as string;
    const entries = sets.map(s => ({ exercise_key:s.exercise_key, exercise_name:s.exercise_name, sort_order:s.sort_order,
      block_number:s.block_number, set_number:s.set_number, target_reps:s.target_reps,
      load_unit:s.load_unit, weight_kg:s.weight_kg }));
    try {
      await sql`
        INSERT INTO session_sets (session_id,exercise_key,exercise_name,sort_order,block_number,set_number,target_reps,load_unit,weight_kg)
        SELECT ${id}::uuid, j.exercise_key,j.exercise_name,j.sort_order,j.block_number,j.set_number,j.target_reps,j.load_unit,j.weight_kg
        FROM jsonb_to_recordset(${JSON.stringify(entries)}::jsonb)
          AS j(exercise_key text, exercise_name text, sort_order smallint, block_number smallint, set_number smallint, target_reps text,load_unit text,weight_kg numeric)
      `;
    } catch (error) {
      await sql`DELETE FROM workout_sessions WHERE id=${id}::uuid`;
      throw error;
    }
    return NextResponse.json({id}, {status:201});
  } catch (error) { return serverError(error); }
}
