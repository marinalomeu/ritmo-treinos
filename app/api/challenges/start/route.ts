import { NextResponse } from 'next/server';
import { db, sameOrigin, forbiddenOrigin, unauthorized, serverError } from '../../../../lib/server';
import { currentProfile, multiuserConfigured } from '../../../../lib/multiuser';
import { CHALLENGES, challengeToTemplate } from '../../../../lib/challengeTemplates';
import { makeSets } from '../../../../lib/templates';

export async function POST(request:Request){
  if(!multiuserConfigured())return NextResponse.json({error:'Ambiente indisponível.'},{status:503});
  const user=await currentProfile();
  if(!user)return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  try{
    const body=await request.json() as Record<string,unknown>;
    const id=typeof body.challenge_id==='string'?body.challenge_id:'';
    const division=typeof body.division==='string'?body.division:'';
    const date=typeof body.performed_on==='string'?body.performed_on:'';
    const challenge=CHALLENGES.find(c=>c.id===id);
    if(!challenge)return NextResponse.json({error:'Desafio não encontrado.'},{status:404});
    const allowedDivisions=challenge.divisions?.length?challenge.divisions:['women','men'];
    if(!allowedDivisions.includes(division))return NextResponse.json({error:'Divisão inválida.'},{status:400});
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00Z')))
      return NextResponse.json({error:'Data inválida.'},{status:400});
    const template=challengeToTemplate(challenge,division);
    if(!template.exercises.length||template.exercises.length>40)
      return NextResponse.json({error:'Prescrição fora dos limites permitidos.'},{status:422});
    // The challenge is selected by a server-owned ID, never trusted as client-supplied exercises.
    const sets=makeSets(template).map(s=>({
      exercise_key:s.exercise_key,exercise_name:s.exercise_name,sort_order:s.sort_order,
      block_number:s.block_number,set_number:s.set_number,target_reps:s.target_reps,
      load_unit:s.load_unit,weight_kg:s.weight_kg
    }));
    const sql=db();
    const inserted=await sql`
      INSERT INTO public.workout_sessions(user_id,template_id,template_name,performed_on)
      VALUES (${user.id}::uuid,'challenge',${template.name},${date}::date)
      RETURNING id::text AS id
    `;
    const sessionId=inserted[0].id as string;
    try{
      await sql`
        INSERT INTO public.session_sets
          (session_id,exercise_key,exercise_name,sort_order,block_number,set_number,target_reps,load_unit,weight_kg)
        SELECT ${sessionId}::uuid,e.exercise_key,e.exercise_name,e.sort_order,e.block_number,
          e.set_number,e.target_reps,e.load_unit,e.weight_kg
        FROM jsonb_to_recordset(${JSON.stringify(sets)}::jsonb) AS e(
          exercise_key text,exercise_name text,sort_order smallint,block_number smallint,
          set_number smallint,target_reps text,load_unit text,weight_kg numeric
        )
      `;
    }catch(error){
      await sql`DELETE FROM public.workout_sessions WHERE id=${sessionId}::uuid AND user_id=${user.id}::uuid`;
      throw error;
    }
    return NextResponse.json({id:sessionId},{status:201,headers:{'Cache-Control':'no-store'}});
  }catch(error){return serverError(error);}
}
