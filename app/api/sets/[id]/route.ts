import { NextResponse } from 'next/server';
import { db, sameOrigin, forbiddenOrigin, unauthorized, serverError } from '../../../../lib/server';
import { currentProfile, multiuserConfigured } from '../../../../lib/multiuser';
type Ctx={params:Promise<{id:string}>};
export async function PATCH(request:Request,context:Ctx){
  if(!multiuserConfigured())return NextResponse.json({error:'Ambiente não configurado.'},{status:503});
  const user=await currentProfile();
  if(!user)return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  const {id}=await context.params;
  if(!/^\d+$/.test(id))return NextResponse.json({error:'ID inválido.'},{status:400});
  try{
    const body=await request.json();
    if(typeof body.completed!=='boolean'||!(body.weight_kg===null||
      (typeof body.weight_kg==='number'&&Number.isFinite(body.weight_kg)&&body.weight_kg>=0&&body.weight_kg<=2000))) {
      return NextResponse.json({error:'Valores inválidos.'},{status:400});
    }
    const includesActual=Object.prototype.hasOwnProperty.call(body,'actual_reps');
    const actual=body.actual_reps;
    if(includesActual&&!(actual===null||(Number.isInteger(actual)&&actual>=0&&actual<=10000)))
      return NextResponse.json({error:'Repetições realizadas inválidas.'},{status:400});
    const distanceIncluded=Object.prototype.hasOwnProperty.call(body,'actual_distance_m');
    const distance=body.actual_distance_m;
    if(distanceIncluded&&!(distance===null||(typeof distance==='number'&&Number.isFinite(distance)&&distance>=0&&distance<=1000000)))
      return NextResponse.json({error:'Distância realizada inválida.'},{status:400});
    const sql=db();
    const rows=await sql`
      UPDATE public.session_sets ss
      SET weight_kg=${body.weight_kg},completed=${body.completed},
        actual_reps=CASE WHEN ${includesActual} THEN ${includesActual?actual:null}::integer ELSE ss.actual_reps END,
        actual_distance_m=CASE WHEN ${distanceIncluded} THEN ${distanceIncluded?distance:null}::numeric ELSE ss.actual_distance_m END,
        completed_at=CASE WHEN ${body.completed} THEN COALESCE(ss.completed_at,NOW()) ELSE NULL END
      FROM public.workout_sessions ws
      WHERE ss.id=${id}::bigint AND ss.session_id=ws.id AND ws.user_id=${user.id}::uuid
        AND to_jsonb(ws)->>'wod_blocks' IS NULL
      RETURNING ss.id::text AS id,ss.weight_kg::float8 AS weight_kg,ss.actual_reps,ss.actual_distance_m::float8 AS actual_distance_m,
        ss.completed,ss.completed_at::text AS completed_at
    `;
    if(!rows.length)return NextResponse.json({error:'Série não encontrada.'},{status:404});
    return NextResponse.json(rows[0]);
  }catch(error){return serverError(error);}
}
