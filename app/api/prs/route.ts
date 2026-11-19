import { NextResponse } from 'next/server';
import { db, sameOrigin, forbiddenOrigin, unauthorized, serverError } from '../../../lib/server';
import { currentProfile, multiuserConfigured } from '../../../lib/multiuser';
const validKey=(v:unknown):v is string=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v);
const isLoad=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>0&&v<=2000&&Math.abs(v*100-Math.round(v*100))<1e-6;
export async function PUT(request:Request){
  if(!multiuserConfigured())return NextResponse.json({error:'Ambiente indisponível.'},{status:503});
  const user=await currentProfile();if(!user)return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  try{
    const b=await request.json() as Record<string,unknown>;
    if(!validKey(b.exercise_key)||!isLoad(b.weight_kg)||!Number.isInteger(b.repetitions)||(b.repetitions as number)<1||(b.repetitions as number)>30)
      return NextResponse.json({error:'Informe carga positiva e até duas casas decimais, com 1 a 30 repetições.'},{status:400});
    const sql=db();
    const existing=await sql`
      SELECT 1 FROM public.user_workout_templates t
      CROSS JOIN LATERAL jsonb_array_elements(t.exercises) e
      WHERE t.user_id=${user.id}::uuid AND e->>'key'=${b.exercise_key} AND e->>'unit'='kg'
      UNION ALL
      SELECT 1 FROM public.session_sets ss JOIN public.workout_sessions ws ON ws.id=ss.session_id
      WHERE ws.user_id=${user.id}::uuid AND ss.exercise_key=${b.exercise_key} AND ss.load_unit='kg'
      LIMIT 1
    `;
    if(!existing.length)return NextResponse.json({error:'Exercício não encontrado nos seus treinos.'},{status:404});
    const rows=await sql`
      INSERT INTO public.user_personal_records(user_id,exercise_key,weight_kg,repetitions)
      VALUES (${user.id}::uuid,${b.exercise_key},${b.weight_kg},${b.repetitions})
      ON CONFLICT(user_id,exercise_key) DO UPDATE SET weight_kg=EXCLUDED.weight_kg,repetitions=EXCLUDED.repetitions,updated_at=NOW()
      RETURNING exercise_key,weight_kg::float8 AS weight_kg,repetitions,updated_at::text AS updated_at
    `;
    return NextResponse.json(rows[0],{headers:{'Cache-Control':'no-store'}});
  }catch(e){return serverError(e);}
}
export async function DELETE(request:Request){
  if(!multiuserConfigured())return NextResponse.json({error:'Ambiente indisponível.'},{status:503});
  const user=await currentProfile();if(!user)return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  try{
    const b=await request.json() as Record<string,unknown>;
    if(!validKey(b.exercise_key))return NextResponse.json({error:'Exercício inválido.'},{status:400});
    const sql=db();const rows=await sql`DELETE FROM public.user_personal_records WHERE user_id=${user.id}::uuid AND exercise_key=${b.exercise_key} RETURNING exercise_key`;
    if(!rows.length)return NextResponse.json({error:'PR não encontrado.'},{status:404});
    return NextResponse.json({ok:true});
  }catch(e){return serverError(e);}
}
