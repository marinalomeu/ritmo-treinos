import { NextResponse } from 'next/server';
import { db, sameOrigin, forbiddenOrigin, unauthorized, serverError } from '../../../../lib/server';
import { currentProfile, multiuserConfigured } from '../../../../lib/multiuser';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};
const uuid=(v:string)=>/^[0-9a-f-]{36}$/i.test(v);

export async function GET(_request:Request,context:Ctx){
  if(!multiuserConfigured())return NextResponse.json({error:'Ambiente não configurado.'},{status:503});
  const user=await currentProfile();
  if(!user)return unauthorized();
  const {id}=await context.params;
  if(!uuid(id))return NextResponse.json({error:'ID inválido.'},{status:400});
  try{
    const sql=db();
    const rows=await sql`
      SELECT ws.id::text AS id,ws.template_id,ws.template_name,ws.performed_on::text AS performed_on,
        ws.started_at::text AS started_at,ws.finished_at::text AS finished_at,ws.status,
        COUNT(ss.id)::int AS total_sets,COUNT(ss.id) FILTER(WHERE ss.completed)::int AS completed_sets
      FROM public.workout_sessions ws LEFT JOIN public.session_sets ss ON ws.id=ss.session_id
      WHERE ws.id=${id}::uuid AND ws.user_id=${user.id}::uuid GROUP BY ws.id
    `;
    if(!rows.length)return NextResponse.json({error:'Treino não encontrado.'},{status:404});
    const sets=await sql`
      SELECT ss.id::text AS id,ss.exercise_key,ss.exercise_name,ss.sort_order,
        ss.block_number,ss.set_number,ss.target_reps,ss.actual_reps,ss.load_unit,ss.weight_kg::float8 AS weight_kg,
        ss.completed,ss.completed_at::text AS completed_at
      FROM public.session_sets ss JOIN public.workout_sessions ws ON ws.id=ss.session_id
      WHERE ss.session_id=${id}::uuid AND ws.user_id=${user.id}::uuid
      ORDER BY ss.sort_order,ss.set_number
    `;
    return NextResponse.json({session:rows[0],sets},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return serverError(error);}
}

export async function DELETE(request:Request,context:Ctx){
  if(!multiuserConfigured())return NextResponse.json({error:'Ambiente não configurado.'},{status:503});
  const user=await currentProfile();
  if(!user)return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  const {id}=await context.params;
  if(!uuid(id))return NextResponse.json({error:'ID inválido.'},{status:400});
  try{
    const sql=db();
    const deleted=await sql`DELETE FROM public.workout_sessions
      WHERE id=${id}::uuid AND user_id=${user.id}::uuid RETURNING id`;
    return NextResponse.json({ok:deleted.length>0});
  }catch(error){return serverError(error);}
}
