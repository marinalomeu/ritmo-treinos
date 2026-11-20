import { NextResponse } from 'next/server';
import {db,sameOrigin,forbiddenOrigin,unauthorized,serverError} from '../../../../../lib/server';
import {currentProfile,multiuserConfigured} from '../../../../../lib/multiuser';
import type {Exercise} from '../../../../../lib/templates';
type Ctx={params:Promise<{id:string}>};
export async function POST(request:Request,context:Ctx){
 if(!multiuserConfigured())return NextResponse.json({error:'Ambiente indisponível.'},{status:503});
 const user=await currentProfile();if(!user)return unauthorized();
 if(!sameOrigin(request))return forbiddenOrigin();
 const {id}=await context.params;
 if(!/^[A-Za-z0-9_-]{1,100}$/.test(id))return NextResponse.json({error:'Ficha inválida.'},{status:400});
 try{
  const body=await request.json() as {session_id?:unknown;items?:unknown};
  if(typeof body.session_id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.session_id)||
     !Array.isArray(body.items)||body.items.length<1||body.items.length>40)
     return NextResponse.json({error:'Dados inválidos.'},{status:400});
  const seen=new Set<string>();
  const inputs:{exercise_key:string;sets:number;target:string;useRecordedLoad:boolean}[]=[];
  for(const raw of body.items){
   if(!raw||typeof raw!=='object')return NextResponse.json({error:'Exercício inválido.'},{status:400});
   const v=raw as Record<string,unknown>;
   if(typeof v.exercise_key!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(v.exercise_key)||
     seen.has(v.exercise_key)||!Number.isInteger(v.sets)||Number(v.sets)<1||Number(v.sets)>20||
     typeof v.target!=='string'||!v.target.trim()||v.target.trim().length>100||
     typeof v.useRecordedLoad!=='boolean')
     return NextResponse.json({error:'Revise exercícios, séries, metas e carga.'},{status:400});
   seen.add(v.exercise_key);
   inputs.push({exercise_key:v.exercise_key,sets:Number(v.sets),target:v.target.trim(),useRecordedLoad:v.useRecordedLoad});
  }
  const sql=db();
  const [sessions,source,templates]=await Promise.all([
   sql`SELECT id FROM public.workout_sessions WHERE id=${body.session_id}::uuid AND user_id=${user.id}::uuid AND status='finished'`,
   sql`SELECT DISTINCT ON (ss.exercise_key) ss.exercise_key,ss.exercise_name,ss.load_unit,ss.weight_kg::float8 AS weight_kg
       FROM public.session_sets ss JOIN public.workout_sessions ws ON ws.id=ss.session_id
       WHERE ws.id=${body.session_id}::uuid AND ws.user_id=${user.id}::uuid AND ss.completed=true
       ORDER BY ss.exercise_key,ss.set_number DESC,ss.id DESC`,
   sql`SELECT exercises FROM public.user_workout_templates WHERE id=${id} AND user_id=${user.id}::uuid`
  ]);
  if(!sessions.length||!templates.length)return NextResponse.json({error:'Sessão finalizada ou ficha não encontrada.'},{status:404});
  const existing=new Set((templates[0].exercises as Exercise[]).map(x=>x.key));
  const byKey=new Map(source.map(x=>[x.exercise_key as string,x]));
  const additions:Exercise[]=[];
  for(const input of inputs){
   if(existing.has(input.exercise_key))return NextResponse.json({error:'Um exercício selecionado já existe na ficha. Atualize e tente novamente.'},{status:409});
   const set=byKey.get(input.exercise_key);
   if(!set)return NextResponse.json({error:'Selecione apenas exercícios concluídos do seu treino.'},{status:400});
   const eligible=set.load_unit==='kg'||set.load_unit==='assist_kg';
   const load=input.useRecordedLoad&&eligible&&typeof set.weight_kg==='number'?set.weight_kg:null;
   if(input.useRecordedLoad&&load===null)return NextResponse.json({error:'Carga incompatível; escolha adicionar sem carga.'},{status:400});
   additions.push({key:input.exercise_key,name:set.exercise_name as string,unit:set.load_unit as Exercise['unit'],
      sets:input.sets,target:input.target,defaultLoad:load});
  }
  if((templates[0].exercises as Exercise[]).length+additions.length>40)
   return NextResponse.json({error:'Limite de 40 exercícios por ficha.'},{status:400});
  const result=await sql`
   UPDATE public.user_workout_templates t
   SET exercises=t.exercises || ${JSON.stringify(additions)}::jsonb,updated_at=now()
   WHERE t.id=${id} AND t.user_id=${user.id}::uuid
     AND jsonb_array_length(t.exercises)+${additions.length}<=40
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_array_elements(t.exercises) e
       WHERE e->>'key'=ANY(${additions.map(x=>x.key)}::text[])
     )
   RETURNING t.id
  `;
  if(!result.length)return NextResponse.json({error:'A ficha mudou. Atualize e tente novamente.'},{status:409});
  return NextResponse.json({added:additions.length});
 }catch(error){return serverError(error);}
}
