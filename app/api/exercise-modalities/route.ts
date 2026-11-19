import { NextResponse } from 'next/server';
import { db, sameOrigin, forbiddenOrigin, unauthorized, serverError } from '../../../lib/server';
import { currentProfile, multiuserConfigured } from '../../../lib/multiuser';
import { MODALITIES } from '../../../lib/personalRecords';

export async function PUT(request:Request){
  if(!multiuserConfigured())return NextResponse.json({error:'Ambiente indisponível.'},{status:503});
  const user=await currentProfile();if(!user)return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  try{
    const b=await request.json() as Record<string,unknown>;
    if(typeof b.exercise_key!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(b.exercise_key) ||
       typeof b.modality!=='string'||(b.modality!==''&&!MODALITIES.some(m=>m===b.modality)))
      return NextResponse.json({error:'Exercício ou modalidade inválidos.'},{status:400});
    const sql=db();
    const existing=await sql`
      SELECT 1 FROM public.user_workout_templates t CROSS JOIN LATERAL jsonb_array_elements(t.exercises) e
      WHERE t.user_id=${user.id}::uuid AND e->>'key'=${b.exercise_key}
      UNION ALL
      SELECT 1 FROM public.session_sets ss JOIN public.workout_sessions ws ON ws.id=ss.session_id
      WHERE ws.user_id=${user.id}::uuid AND ss.exercise_key=${b.exercise_key}
      LIMIT 1
    `;
    if(!existing.length)return NextResponse.json({error:'Exercício não pertence à conta.'},{status:404});
    if(b.modality===''){
      await sql`DELETE FROM public.user_exercise_modalities WHERE user_id=${user.id}::uuid AND exercise_key=${b.exercise_key}`;
      return NextResponse.json({exercise_key:b.exercise_key,modality:null});
    }
    const rows=await sql`
      INSERT INTO public.user_exercise_modalities(user_id,exercise_key,modality)
      VALUES (${user.id}::uuid,${b.exercise_key},${b.modality})
      ON CONFLICT(user_id,exercise_key) DO UPDATE SET modality=EXCLUDED.modality,updated_at=NOW()
      RETURNING exercise_key,modality
    `;
    return NextResponse.json(rows[0]);
  }catch(e){return serverError(e);}
}
