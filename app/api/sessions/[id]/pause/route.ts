import {NextResponse} from 'next/server';
import {db,sameOrigin,forbiddenOrigin,unauthorized,serverError} from '../../../../../lib/server';
import {currentProfile,multiuserConfigured} from '../../../../../lib/multiuser';
type Ctx={params:Promise<{id:string}>};
export async function POST(request:Request,context:Ctx){
 if(!multiuserConfigured())return NextResponse.json({error:'Indisponível.'},{status:503});
 const user=await currentProfile();if(!user)return unauthorized();
 if(!sameOrigin(request))return forbiddenOrigin();
 const {id}=await context.params;
 if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:'Treino inválido.'},{status:400});
 try{
  const sql=db();const rows=await sql`UPDATE public.workout_sessions ws
   SET paused_ms=paused_ms+CASE WHEN paused_at IS NOT NULL THEN GREATEST(0,FLOOR(EXTRACT(EPOCH FROM (NOW()-paused_at))*1000))::bigint ELSE 0 END,
       paused_at=CASE WHEN paused_at IS NULL THEN NOW() ELSE NULL END
   WHERE id=${id}::uuid AND user_id=${user.id}::uuid AND status='active' AND to_jsonb(ws)->>'wod_blocks' IS NULL
   RETURNING paused_at::text AS paused_at,paused_ms`;
  if(!rows.length)return NextResponse.json({error:'Treino em andamento não encontrado.'},{status:404});
  return NextResponse.json(rows[0],{headers:{'Cache-Control':'no-store'}});
 }catch(e){return serverError(e);}
}
