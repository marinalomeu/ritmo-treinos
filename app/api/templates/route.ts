import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { db, hasSession, sameOrigin, forbiddenOrigin, unauthorized, serverError } from '../../../lib/server';
import { normalizeTemplate } from '../../../lib/templateEditor';

export async function POST(request:Request){
  if(!await hasSession())return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  try{
    const body=await request.json();
    const id=`custom-${randomUUID()}`;
    const template=normalizeTemplate(body,id);
    if(!template)return NextResponse.json({error:'Preencha a ficha com pelo menos um exercício válido.'},{status:400});
    const sql=db();
    await sql`
      INSERT INTO workout_templates (id,name,description,days,category,exercises,position)
      VALUES (${template.id},${template.name},${template.description},${template.days},${template.category},
        ${JSON.stringify(template.exercises)}::jsonb,100)
    `;
    return NextResponse.json(template,{status:201});
  }catch(error){return serverError(error);}
}
