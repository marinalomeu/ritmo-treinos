import { NextResponse } from 'next/server';
import { db, hasSession, sameOrigin, forbiddenOrigin, serverError, unauthorized } from '../../../../lib/server';
export const dynamic = 'force-dynamic';
type Ctx = {params: Promise<{id:string}>};
export async function GET(_request: Request, context: Ctx) {
  if (!await hasSession()) return unauthorized();
  const {id} = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({error:'Identificador inválido.'},{status:400});
  try {
    const sql = db();
    const rows = await sql`
      SELECT ws.id::text AS id,ws.template_id,ws.template_name,ws.performed_on::text AS performed_on,
        ws.started_at::text AS started_at,ws.finished_at::text AS finished_at,ws.status,
        COUNT(ss.id)::int AS total_sets,COUNT(ss.id) FILTER (WHERE ss.completed)::int AS completed_sets
      FROM workout_sessions ws LEFT JOIN session_sets ss ON ws.id=ss.session_id
      WHERE ws.id=${id}::uuid GROUP BY ws.id
    `;
    if (!rows.length) return NextResponse.json({error:'Treino não encontrado.'},{status:404});
    const sets = await sql`
      SELECT id::text AS id,exercise_key,exercise_name,sort_order,block_number,set_number,target_reps,load_unit,
        weight_kg::float8 AS weight_kg,completed,completed_at::text AS completed_at
      FROM session_sets WHERE session_id=${id}::uuid ORDER BY sort_order,set_number
    `;
    return NextResponse.json({session: rows[0], sets}, {headers:{'Cache-Control':'no-store'}});
  } catch(error) { return serverError(error); }
}
export async function DELETE(request: Request, context: Ctx) {
  if (!await hasSession()) return unauthorized();
  if (!sameOrigin(request)) return forbiddenOrigin();
  const {id} = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({error:'Identificador inválido.'},{status:400});
  try {
    const sql = db();
    const deleted = await sql`DELETE FROM workout_sessions WHERE id=${id}::uuid RETURNING id`;
    return NextResponse.json({ok: deleted.length > 0});
  } catch(error) { return serverError(error); }
}
