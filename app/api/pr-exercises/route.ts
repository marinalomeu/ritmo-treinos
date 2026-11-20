import { NextResponse } from 'next/server';
import { db, sameOrigin, forbiddenOrigin, unauthorized, serverError } from '../../../lib/server';
import { currentProfile, multiuserConfigured } from '../../../lib/multiuser';
import { BASE_EXERCISES } from '../../../lib/exerciseCatalog';

const validKey=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v);

export async function POST(request:Request){
  if(!multiuserConfigured())return NextResponse.json({error:'Ambiente indisponível.'},{status:503});
  const user=await currentProfile();if(!user)return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  try{
    const b=await request.json() as {exercise_key?:unknown};
    if(!validKey(b.exercise_key))return NextResponse.json({error:'Exercício inválido.'},{status:400});
    const sql=db();
    const isCatalog=BASE_EXERCISES.some(e=>e.key===b.exercise_key);
    if(!isCatalog){
      const allowed=await sql`
        SELECT 1 FROM public.user_custom_exercises WHERE user_id=${user.id}::uuid AND exercise_key=${b.exercise_key}
        UNION ALL SELECT 1 FROM public.user_workout_templates t
          CROSS JOIN LATERAL jsonb_array_elements(t.exercises) ex
          WHERE t.user_id=${user.id}::uuid AND ex->>'key'=${b.exercise_key}
        UNION ALL SELECT 1 FROM public.session_sets ss
          JOIN public.workout_sessions ws ON ws.id=ss.session_id
          WHERE ws.user_id=${user.id}::uuid AND ss.exercise_key=${b.exercise_key}
        LIMIT 1
      `;
      if(allowed.length===0)return NextResponse.json({error:'Exercício fora do seu catálogo.'},{status:404});
    }
    await sql`
      INSERT INTO public.user_pr_exercises(user_id,exercise_key)
      VALUES (${user.id}::uuid,${b.exercise_key})
      ON CONFLICT(user_id,exercise_key) DO NOTHING
    `;
    return NextResponse.json({ok:true,exercise_key:b.exercise_key});
  }catch(error){return serverError(error);}
}

export async function DELETE(request:Request){
  if(!multiuserConfigured())return NextResponse.json({error:'Ambiente indisponível.'},{status:503});
  const user=await currentProfile();if(!user)return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  try{
    const b=await request.json() as {exercise_key?:unknown};
    if(!validKey(b.exercise_key))return NextResponse.json({error:'Exercício inválido.'},{status:400});
    const sql=db();
    await sql`
      DELETE FROM public.user_pr_exercises
      WHERE user_id=${user.id}::uuid AND exercise_key=${b.exercise_key}
    `;
    return NextResponse.json({ok:true});
  }catch(error){return serverError(error);}
}
