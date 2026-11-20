import { NextResponse } from 'next/server';
import { db, sameOrigin, forbiddenOrigin, unauthorized, serverError } from '../../../../lib/server';
import { currentProfile, multiuserConfigured } from '../../../../lib/multiuser';
import { normalizeTemplate } from '../../../../lib/templateEditor';
type Ctx={params:Promise<{id:string}>};
const validId=(id:string)=>/^[a-zA-Z0-9_-]{1,100}$/.test(id);

export async function PUT(request:Request,context:Ctx){
  if(!multiuserConfigured())return NextResponse.json({error:'Ambiente não configurado.'},{status:503});
  const user=await currentProfile();
  if(!user)return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  const {id}=await context.params;
  if(!validId(id))return NextResponse.json({error:'ID de ficha inválido.'},{status:400});
  try{
    const template=normalizeTemplate(await request.json(),id);
    if(!template)return NextResponse.json({error:'Preencha a ficha com pelo menos um exercício válido.'},{status:400});
    const sql=db();
    const rows=await sql`
      UPDATE public.user_workout_templates
      SET name=${template.name},description=${template.description},days=${template.days},
        category=${template.category},gym_name=${template.gym_name||null},exercises=${JSON.stringify(template.exercises)}::jsonb,updated_at=now()
      WHERE user_id=${user.id}::uuid AND id=${id} RETURNING id
    `;
    if(!rows.length)return NextResponse.json({error:'Ficha não encontrada.'},{status:404});
    return NextResponse.json(template);
  }catch(error){return serverError(error);}
}

export async function DELETE(request:Request,context:Ctx){
  if(!multiuserConfigured())return NextResponse.json({error:'Ambiente não configurado.'},{status:503});
  const user=await currentProfile();
  if(!user)return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  const {id}=await context.params;
  if(!validId(id))return NextResponse.json({error:'ID inválido.'},{status:400});
  try{
    const sql=db();
    const deleted=await sql`
      DELETE FROM public.user_workout_templates
      WHERE user_id=${user.id}::uuid AND id=${id} RETURNING id
    `;
    if(!deleted.length)return NextResponse.json({error:'Ficha não encontrada.'},{status:404});
    return NextResponse.json({ok:true});
  }catch(error){return serverError(error);}
}
