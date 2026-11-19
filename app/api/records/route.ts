import { NextResponse } from 'next/server';
import { db, sameOrigin, forbiddenOrigin, unauthorized, serverError } from '../../../lib/server';
import { currentProfile, multiuserConfigured } from '../../../lib/multiuser';
export const dynamic = 'force-dynamic';

type Incoming = {exercise_key?:unknown;exercise_name?:unknown;modality?:unknown;pr_weight_kg?:unknown;pr_reps?:unknown;planned_reps?:unknown};
export async function PUT(request:Request){
  if(!multiuserConfigured()) return NextResponse.json({error:'Ambiente não configurado.'},{status:503});
  const user=await currentProfile();
  if(!user)return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  let input:Incoming;
  try{input=await request.json() as Incoming;}catch{return NextResponse.json({error:'Dados inválidos.'},{status:400});}
  const key=typeof input.exercise_key==='string'?input.exercise_key.trim():'';
  const name=typeof input.exercise_name==='string'?input.exercise_name.trim():'';
  const modality=typeof input.modality==='string'?input.modality.trim():'';
  const weight=input.pr_weight_kg;
  const reps=input.pr_reps;
  const planned=input.planned_reps;
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(key)||name.length<1||name.length>100||modality.length<2||modality.length>40
    ||!Number.isInteger(planned)||Number(planned)<1||Number(planned)>30
    ||!((weight===null&&reps===null)||
      (typeof weight==='number'&&Number.isFinite(weight)&&weight>0&&weight<=2000
        &&Number.isInteger(reps)&&Number(reps)>=1&&Number(reps)<=30))){
    return NextResponse.json({error:'Confira exercício, modalidade, carga do PR e repetições (1 a 30).'}, {status:400});
  }
  try{
    const sql=db();
    const rows=await sql`
      INSERT INTO public.user_exercise_records
        (user_id,exercise_key,exercise_name,modality,pr_weight_kg,pr_reps,planned_reps)
      VALUES
        (${user.id}::uuid,${key},${name},${modality},${weight===null?null:weight as number},${reps===null?null:reps as number},${planned as number})
      ON CONFLICT (user_id,exercise_key) DO UPDATE
      SET exercise_name=EXCLUDED.exercise_name,modality=EXCLUDED.modality,
          pr_weight_kg=EXCLUDED.pr_weight_kg,pr_reps=EXCLUDED.pr_reps,
          planned_reps=EXCLUDED.planned_reps,updated_at=NOW()
      RETURNING exercise_key,exercise_name,modality,pr_weight_kg::float8 AS pr_weight_kg,
                pr_reps,planned_reps
    `;
    return NextResponse.json(rows[0],{headers:{'Cache-Control':'no-store'}});
  }catch(error){return serverError(error);}
}
