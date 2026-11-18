import { NextResponse } from 'next/server';
import { db, hasSession, sameOrigin, forbiddenOrigin, serverError, unauthorized } from '../../../../../lib/server';
type Ctx = {params: Promise<{id:string}>};
export async function POST(request: Request, context: Ctx) {
  if (!await hasSession()) return unauthorized();
  if (!sameOrigin(request)) return forbiddenOrigin();
  const {id} = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({error:'Identificador inválido.'},{status:400});
  try {
    const sql = db();
    const rows = await sql`UPDATE workout_sessions SET status='finished', finished_at=COALESCE(finished_at,NOW()) WHERE id=${id}::uuid RETURNING id`;
    if (!rows.length) return NextResponse.json({error:'Treino não encontrado.'},{status:404});
    return NextResponse.json({ok:true});
  } catch(error) { return serverError(error); }
}
