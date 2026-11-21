import { NextResponse } from 'next/server';
import { db, sameOrigin, forbiddenOrigin, unauthorized, serverError } from '../../../lib/server';
import { currentProfile, multiuserConfigured } from '../../../lib/multiuser';
import { makeSets, type Template } from '../../../lib/templates';

export async function POST(request: Request) {
  if (!multiuserConfigured()) return NextResponse.json({error:'Ambiente não configurado.'},{status:503});
  const user=await currentProfile();
  if(!user)return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  try {
    const body=await request.json();
    const date=body.performed_on;
    const gymOverride=typeof body.gym_name==='string'?body.gym_name.trim():null;
    if(gymOverride!==null&&gymOverride.length>100)return NextResponse.json({error:'Local deve ter até 100 caracteres.'},{status:400});
    if(typeof body.template_id!=='string'||typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)
      ||Number.isNaN(Date.parse(`${date}T12:00:00Z`))) {
      return NextResponse.json({error:'Ficha ou data inválida.'},{status:400});
    }
    const sql=db();
    const rows=await sql`
      SELECT id,name,description,days,category,gym_name,exercises FROM public.user_workout_templates
      WHERE user_id=${user.id}::uuid AND id=${body.template_id} LIMIT 1
    `;
    if(!rows.length)return NextResponse.json({error:'Ficha não encontrada.'},{status:404});
    const template=rows[0] as unknown as Template;
    const latest=await sql`
      SELECT DISTINCT ON (ss.exercise_key) ss.exercise_key,ss.weight_kg::float8 AS weight_kg
      FROM public.session_sets ss JOIN public.workout_sessions ws ON ws.id=ss.session_id
      WHERE ws.user_id=${user.id}::uuid AND ss.completed=true AND ss.weight_kg IS NOT NULL
      ORDER BY ss.exercise_key,ss.completed_at DESC NULLS LAST,ss.id DESC
    `;
    const past=Object.fromEntries(latest.map(r=>[r.exercise_key,r.weight_kg]));
    const sets=makeSets(template,past);
    const created=await sql`
      INSERT INTO public.workout_sessions(user_id,template_id,template_name,performed_on,gym_name)
      VALUES (${user.id}::uuid,${template.id},${template.name},${date}::date,${gymOverride??template.gym_name??null})
      RETURNING id::text AS id
    `;
    const id=created[0].id as string;
    const entries=sets.map(s=>({
      exercise_key:s.exercise_key,exercise_name:s.exercise_name,sort_order:s.sort_order,
      block_number:s.block_number,set_number:s.set_number,target_reps:s.target_reps,
      load_unit:s.load_unit,weight_kg:s.weight_kg,rest_seconds:s.rest_seconds
    }));
    try{
      await sql`
        INSERT INTO public.session_sets
          (session_id,exercise_key,exercise_name,sort_order,block_number,set_number,target_reps,load_unit,weight_kg,rest_seconds)
        SELECT ${id}::uuid,j.exercise_key,j.exercise_name,j.sort_order,j.block_number,
          j.set_number,j.target_reps,j.load_unit,j.weight_kg,j.rest_seconds
        FROM jsonb_to_recordset(${JSON.stringify(entries)}::jsonb) AS j(
          exercise_key text,exercise_name text,sort_order smallint,block_number smallint,
          set_number smallint,target_reps text,load_unit text,weight_kg numeric,rest_seconds smallint
        )
      `;
    }catch(error){
      await sql`DELETE FROM public.workout_sessions WHERE id=${id}::uuid AND user_id=${user.id}::uuid`;
      throw error;
    }
    return NextResponse.json({id},{status:201});
  }catch(error){return serverError(error);}
}
