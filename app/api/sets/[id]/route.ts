import { NextResponse } from 'next/server';
import { db, hasSession, sameOrigin, forbiddenOrigin, serverError, unauthorized } from '../../../../lib/server';
type Ctx = {params: Promise<{id:string}>};
export async function PATCH(request: Request, context: Ctx) {
  if (!await hasSession()) return unauthorized();
  if (!sameOrigin(request)) return forbiddenOrigin();
  const {id} = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({error:'Identificador inválido.'},{status:400});
  try {
    const body = await request.json();
    if (typeof body.completed !== 'boolean' || !(body.weight_kg === null ||
      (typeof body.weight_kg === 'number' && Number.isFinite(body.weight_kg) && body.weight_kg >= 0 && body.weight_kg <= 2000))) {
      return NextResponse.json({error:'Valores inválidos.'},{status:400});
    }
    const sql = db();
    const rows = await sql`
      UPDATE session_sets SET weight_kg=${body.weight_kg},completed=${body.completed},
        completed_at=CASE WHEN ${body.completed} THEN COALESCE(completed_at,NOW()) ELSE NULL END
      WHERE id=${id}::bigint RETURNING id::text AS id,weight_kg::float8 AS weight_kg,completed,completed_at::text AS completed_at
    `;
    if (!rows.length) return NextResponse.json({error:'Série não encontrada.'},{status:404});
    return NextResponse.json(rows[0]);
  } catch(error) { return serverError(error); }
}
