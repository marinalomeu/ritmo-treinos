import { NextResponse } from 'next/server';
import { db, sameOrigin, forbiddenOrigin, unauthorized, serverError } from '../../../../../lib/server';
import { currentProfile, multiuserConfigured } from '../../../../../lib/multiuser';
type Ctx={params:Promise<{id:string}>};

export async function POST(request:Request,context:Ctx){
  if(!multiuserConfigured())return NextResponse.json({error:'Ambiente não configurado.'},{status:503});
  const user=await currentProfile();
  if(!user)return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  const {id}=await context.params;
  if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:'ID inválido.'},{status:400});
  try{
    const sql=db();
    const rows=await sql`UPDATE public.workout_sessions
      SET status='finished',finished_at=COALESCE(finished_at,NOW())
      WHERE id=${id}::uuid AND user_id=${user.id}::uuid RETURNING id`;
    if(!rows.length)return NextResponse.json({error:'Treino não encontrado.'},{status:404});
    return NextResponse.json({ok:true});
  }catch(error){return serverError(error);}
}
