import { NextResponse } from 'next/server';
import { db, hasSession, sameOrigin, forbiddenOrigin, unauthorized, serverError } from '../../../../lib/server';
import { normalizeTemplate } from '../../../../lib/templateEditor';
type Ctx={params:Promise<{id:string}>};
const validId=(id:string)=>/^[a-zA-Z0-9_-]{1,100}$/.test(id);

export async function PUT(request:Request,context:Ctx){
  if(!await hasSession())return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  const {id}=await context.params;
  if(!validId(id))return NextResponse.json({error:'Identificador de ficha inválido.'},{status:400});
  try{
    const template=normalizeTemplate(await request.json(),id);
    if(!template)return NextResponse.json({error:'Preencha a ficha com pelo menos um exercício válido.'},{status:400});
    const sql=db();
    const changed=await sql`
      UPDATE workout_templates SET
        name=${template.name},description=${template.description},days=${template.days},
        category=${template.category},exercises=${JSON.stringify(template.exercises)}::jsonb,updated_at=NOW()
      WHERE id=${id}
      RETURNING id
    `;
    if(!changed.length)return NextResponse.json({error:'Ficha não encontrada.'},{status:404});
    return NextResponse.json(template);
  }catch(error){return serverError(error);}
}

export async function DELETE(request:Request,context:Ctx){
  if(!await hasSession())return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  const {id}=await context.params;
  if(!validId(id))return NextResponse.json({error:'Identificador inválido.'},{status:400});
  try{
    const sql=db();
    // Exclui apenas o modelo atual. Treinos e séries históricas NÃO têm vínculo com esta tabela.
    const deleted=await sql`DELETE FROM workout_templates WHERE id=${id} RETURNING id`;
    if(!deleted.length)return NextResponse.json({error:'Ficha não encontrada.'},{status:404});
    return NextResponse.json({ok:true});
  }catch(error){return serverError(error);}
}
