import { NextResponse } from 'next/server';
import { db, sameOrigin, forbiddenOrigin, unauthorized, serverError } from '../../../../../lib/server';
import { currentProfile, multiuserConfigured } from '../../../../../lib/multiuser';
import { applyWodAction, type WodAction, type WodState } from '../../../../../lib/wodBlocks';

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  if (!multiuserConfigured()) return NextResponse.json({error:'Ambiente não configurado.'},{status:503});
  const user = await currentProfile();
  if (!user) return unauthorized();
  if (!sameOrigin(request)) return forbiddenOrigin();
  const {id} = await params;
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))
    return NextResponse.json({error:'ID inválido.'},{status:400});

  const action = await request.json().catch(() => null) as WodAction | null;
  if (!action || !['start','record','end'].includes(action.kind) ||
      !Number.isInteger(action.revision) || !Number.isInteger(action.block))
    return NextResponse.json({error:'Registro de bloco inválido.'},{status:400});
  try {
    const sql = db();
    const [row] = await sql`SELECT wod_blocks FROM public.workout_sessions
      WHERE id=${id}::uuid AND user_id=${user.id}::uuid AND status='active'`;
    if (!row?.wod_blocks) return NextResponse.json({error:'Treino com blocos indisponível.'},{status:404});
    const state = row.wod_blocks as WodState;
    let change: ReturnType<typeof applyWodAction>;
    try {
      change = applyWodAction(state,action,Date.now(),id);
    } catch (error) {
      return NextResponse.json({error:error instanceof Error?error.message:'Registro inválido.'},{status:409});
    }
    const [updated] = await sql`
      WITH saved AS (
        UPDATE public.workout_sessions SET wod_blocks=${JSON.stringify(change.state)}::jsonb
        WHERE id=${id}::uuid AND user_id=${user.id}::uuid AND status='active'
          AND wod_blocks->>'revision'=${String(state.revision)}
        RETURNING id
      ), recorded AS (
        INSERT INTO public.session_sets(session_id,exercise_key,exercise_name,sort_order,block_number,set_number,
          target_reps,actual_reps,actual_distance_m,load_unit,weight_kg,completed,completed_at)
        SELECT saved.id,x.exercise_key,x.exercise_name,x.sort_order,x.block_number,x.set_number,
          x.target_reps,x.actual_reps,x.actual_distance_m,x.load_unit,x.weight_kg,x.completed,x.completed_at
        FROM saved CROSS JOIN jsonb_to_recordset(${JSON.stringify(change.set ? [change.set] : [])}::jsonb) AS x(
          exercise_key text,exercise_name text,sort_order smallint,block_number smallint,set_number smallint,
          target_reps text,actual_reps integer,actual_distance_m numeric,load_unit text,weight_kg numeric,
          completed boolean,completed_at timestamptz)
        RETURNING id
      )
      SELECT id FROM saved
    `;
    if (!updated) return NextResponse.json({error:'O treino mudou. Confira a etapa e tente novamente.'},{status:409});
    return NextResponse.json({ok:true});
  } catch (error) {
    return serverError(error);
  }
}
