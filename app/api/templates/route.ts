import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { db, sameOrigin, forbiddenOrigin, unauthorized, serverError } from '../../../lib/server';
import { currentProfile, multiuserConfigured } from '../../../lib/multiuser';
import { normalizeTemplate } from '../../../lib/templateEditor';

export async function POST(request:Request){
  if(!multiuserConfigured())return NextResponse.json({error:'Ambiente não configurado.'},{status:503});
  const user=await currentProfile();
  if(!user)return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  try{
    const body=await request.json();
    const template=normalizeTemplate(body,`custom-${randomUUID()}`);
    if(!template)return NextResponse.json({error:'Preencha a ficha com pelo menos um exercício válido.'},{status:400});
    const sql=db();
    await sql`
      INSERT INTO public.user_workout_templates
        (user_id,id,name,description,days,category,exercises,position)
      VALUES (${user.id}::uuid,${template.id},${template.name},${template.description},
        ${template.days},${template.category},${JSON.stringify(template.exercises)}::jsonb,100)
    `;
    return NextResponse.json(template,{status:201});
  }catch(error){return serverError(error);}
}
