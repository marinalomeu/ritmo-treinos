import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { currentProfile, multiuserConfigured } from '../../../lib/multiuser';
import { db, forbiddenOrigin, sameOrigin, serverError, unauthorized } from '../../../lib/server';
import { BASE_EXERCISES, normalizeExerciseName } from '../../../lib/exerciseCatalog';
import { MODALITIES } from '../../../lib/personalRecords';
import type { Unit } from '../../../lib/templates';

const units:Unit[]=['kg','assist_kg','km/h','none'];
export async function POST(request:Request){
  if(!multiuserConfigured())return NextResponse.json({error:'Ambiente indisponível.'},{status:503});
  const user=await currentProfile();if(!user)return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  try {
    const b=await request.json() as Record<string,unknown>;
    const name=typeof b.name==='string'?b.name.trim().replace(/\s+/g,' '):'';
    if(!name||name.length>100||typeof b.unit!=='string'||!units.includes(b.unit as Unit)
      ||typeof b.modality!=='string'||!MODALITIES.some(m=>m===b.modality)){
      return NextResponse.json({error:'Preencha nome, unidade e modalidade válidos.'},{status:400});
    }
    if(BASE_EXERCISES.some(e=>normalizeExerciseName(e.name)===normalizeExerciseName(name))){
      return NextResponse.json({error:'O exercício já existe no catálogo geral. Selecione a sugestão.'},{status:409});
    }
    const sql=db();
    // Nunca oferecer um exercício de outra conta, mesmo se seu nome for igual.
    const matches=await sql`
      SELECT e->>'name' AS name FROM public.user_workout_templates t
      CROSS JOIN LATERAL jsonb_array_elements(t.exercises) e
      WHERE t.user_id=${user.id}::uuid
      UNION ALL
      SELECT ss.exercise_name AS name FROM public.session_sets ss
      JOIN public.workout_sessions ws ON ws.id=ss.session_id
      WHERE ws.user_id=${user.id}::uuid
      UNION ALL
      SELECT name FROM public.user_custom_exercises WHERE user_id=${user.id}::uuid
    `;
    if(matches.some(row=>typeof row.name==='string'&&normalizeExerciseName(row.name)===normalizeExerciseName(name))){
      return NextResponse.json({error:'Você já tem esse exercício. Selecione-o na busca para manter o histórico.'},{status:409});
    }
    const key=`ex-${randomUUID()}`;
    const rows=await sql`
      INSERT INTO public.user_custom_exercises(user_id,exercise_key,name,unit,modality)
      VALUES (${user.id}::uuid,${key},${name},${b.unit},${b.modality})
      RETURNING exercise_key AS key,name,unit,modality
    `;
    return NextResponse.json({...rows[0],origin:'personal'},{status:201,headers:{'Cache-Control':'no-store'}});
  } catch(e){return serverError(e);}
}
