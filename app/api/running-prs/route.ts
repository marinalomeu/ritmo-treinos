import {NextResponse} from 'next/server';
import {db,sameOrigin,forbiddenOrigin,unauthorized,serverError} from '../../../lib/server';
import {currentProfile,multiuserConfigured} from '../../../lib/multiuser';
import {BASE_EXERCISES} from '../../../lib/exerciseCatalog';

const validKey=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v);
export async function GET(){
 if(!multiuserConfigured())return NextResponse.json({error:'Ambiente não configurado.'},{status:503});
 const user=await currentProfile();if(!user)return unauthorized();
 try{
  const sql=db();
  const rows=await sql`SELECT exercise_key,distance_m::float8 AS distance_m,duration_seconds,updated_at::text AS updated_at
    FROM public.user_running_records WHERE user_id=${user.id}::uuid ORDER BY exercise_key,distance_m`;
  return NextResponse.json({records:rows},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return serverError(e);}
}
export async function PUT(request:Request){
 if(!multiuserConfigured())return NextResponse.json({error:'Ambiente não configurado.'},{status:503});
 const user=await currentProfile();if(!user)return unauthorized();
 if(!sameOrigin(request))return forbiddenOrigin();
 try{
  const b=await request.json() as Record<string,unknown>;
  if(!validKey(b.exercise_key)||typeof b.distance_m!=='number'||!Number.isFinite(b.distance_m)||b.distance_m<=0||b.distance_m>1000000||
    typeof b.duration_seconds!=='number'||!Number.isInteger(b.duration_seconds)||b.duration_seconds<1||b.duration_seconds>864000)
   return NextResponse.json({error:'Informe distância e tempo realizados válidos.'},{status:400});
  const sql=db();
  const [e,fromSession]=await Promise.all([
   sql`SELECT 1 FROM public.user_pr_exercises WHERE user_id=${user.id}::uuid AND exercise_key=${b.exercise_key}
    UNION ALL
    SELECT 1 FROM public.user_workout_templates t CROSS JOIN LATERAL jsonb_array_elements(t.exercises) x
     WHERE t.user_id=${user.id}::uuid AND x->>'key'=${b.exercise_key}
    LIMIT 1`,
   sql`SELECT 1 FROM public.session_sets ss JOIN public.workout_sessions ws ON ws.id=ss.session_id
     WHERE ws.user_id=${user.id}::uuid AND ss.exercise_key=${b.exercise_key} LIMIT 1`
  ]);
  const catalogRun=BASE_EXERCISES.some(e=>e.key===b.exercise_key && e.modality==='Corrida');
  if(!e.length&&!fromSession.length&&!catalogRun)return NextResponse.json({error:'Exercício indisponível.'},{status:404});
  const eligibleRun=catalogRun||(await sql`SELECT 1 FROM public.session_sets ss JOIN public.workout_sessions ws ON ws.id=ss.session_id
     WHERE ws.user_id=${user.id}::uuid AND ss.exercise_key=${b.exercise_key}
     AND (ss.load_unit='km/h' OR lower(ss.exercise_name) LIKE '%corrida%') LIMIT 1`).length>0;
  if(!eligibleRun)return NextResponse.json({error:'Use o registro de força para este exercício.'},{status:400});
  const rounded=Math.round(b.distance_m*100)/100;
  const rows=await sql`
    INSERT INTO public.user_running_records(user_id,exercise_key,distance_m,duration_seconds)
    VALUES(${user.id}::uuid,${b.exercise_key},${rounded},${b.duration_seconds})
    ON CONFLICT(user_id,exercise_key,distance_m) DO UPDATE
      SET duration_seconds=EXCLUDED.duration_seconds,updated_at=now()
    WHERE EXCLUDED.duration_seconds < public.user_running_records.duration_seconds
    RETURNING exercise_key,distance_m::float8 AS distance_m,duration_seconds
  `;
  if(rows.length)return NextResponse.json({updated:true,record:rows[0]});
  const kept=await sql`SELECT exercise_key,distance_m::float8 AS distance_m,duration_seconds
    FROM public.user_running_records
    WHERE user_id=${user.id}::uuid AND exercise_key=${b.exercise_key} AND distance_m=${rounded}`;
  return NextResponse.json({updated:false,record:kept[0]});
 }catch(e){return serverError(e);}
}
