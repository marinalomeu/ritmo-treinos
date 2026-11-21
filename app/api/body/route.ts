import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {db,unauthorized,forbiddenOrigin,sameOrigin,serverError} from '../../../lib/server';
import {currentProfile,multiuserConfigured} from '../../../lib/multiuser';
import {STANDARD_METRICS,validDate,validMetric,validateEvaluation,type BodyData,type BodyMetric,type BodyEvaluation,type BodyGoal} from '../../../lib/bodyMetrics';
export const dynamic='force-dynamic';
const empty=():BodyData=>({evaluations:[],metrics:[...STANDARD_METRICS],goals:[],audit:[]});
const json=(o:unknown):Record<string,unknown>=>o&&typeof o==='object'&&!Array.isArray(o)?o as Record<string,unknown>:{};
const fail=(message:string,status=400)=>NextResponse.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
const success=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function load(uid:string):Promise<BodyData>{
  const rows=await db()`SELECT state FROM public.body_profile_state WHERE user_id=${uid}::uuid`;
  const raw=rows[0]?.state as Partial<BodyData>|undefined;
  if(!raw)return empty();
  const custom=(raw.metrics??[]).filter(m=>m.custom&&validMetric(m));
  return {evaluations:Array.isArray(raw.evaluations)?raw.evaluations:[],goals:Array.isArray(raw.goals)?raw.goals:[],
    metrics:[...STANDARD_METRICS,...custom],audit:Array.isArray(raw.audit)?raw.audit:[]};
}
export async function GET(){
  if(!multiuserConfigured())return fail('Ambiente não configurado.',503);
  const user=await currentProfile();if(!user)return unauthorized();
  try{return success(await load(user.id));}catch(err){return serverError(err);}
}
export async function POST(request:Request){
  if(!multiuserConfigured())return fail('Ambiente não configurado.',503);
  const user=await currentProfile();if(!user)return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  try{
    const body=json(await request.json()),action=String(body.action??''),uid=user.id,now=new Date().toISOString();
    const state=await load(uid);
    let before:unknown=null,after:unknown=null,recordId='',event=action;
    if(action==='evaluation.save'){
      const input=json(body.evaluation),id=typeof input.id==='string'&&state.evaluations.some(e=>e.id===input.id)?input.id:randomUUID();
      const old=state.evaluations.find(e=>e.id===id);
      if(old?.deleted_at)return fail('Restaure a avaliação antes de editar.',409);
      const values=json(input.values);
      const evaluation:BodyEvaluation={id,measured_on:String(input.measured_on??''),method:String(input.method??'').trim(),
        notes:String(input.notes??'').trim(),
        weight_unit:input.weight_unit==='lb'?'lb':'kg',values:values as Record<string,number>,created_at:old?.created_at??now,updated_at:now,deleted_at:null};
      if(!validateEvaluation(evaluation,state.metrics))return fail('Data ou medidas inválidas. Informe ao menos uma medida numérica válida.');
      before=old??null;after=evaluation;recordId=id;
      state.evaluations=old?state.evaluations.map(e=>e.id===id?evaluation:e):[...state.evaluations,evaluation];
    }else if(action==='evaluation.delete'||action==='evaluation.restore'){
      const id=String(body.id??''),old=state.evaluations.find(e=>e.id===id);if(!old)return fail('Avaliação não encontrada.',404);
      if(action==='evaluation.restore'&&!old.deleted_at)return fail('Esta avaliação não foi excluída.',409);
      if(action==='evaluation.delete'&&old.deleted_at)return fail('Esta avaliação já foi excluída.',409);
      const next={...old,deleted_at:action==='evaluation.delete'?now:null,updated_at:now};
      before=old;after=next;recordId=id;state.evaluations=state.evaluations.map(e=>e.id===id?next:e);
    }else if(action==='metric.create'){
      const name=String(body.name??'').trim(),side=body.side==='right'||body.side==='left'?body.side:'none';
      const metric:BodyMetric={key:'custom:'+randomUUID(),name,unit:'cm',group:'measurements',side,custom:true};
      if(!validMetric(metric))return fail('Nome de medida inválido.');
      if(state.metrics.some(m=>m.name.toLowerCase()===name.toLowerCase()&&(m.side??'none')===side))return fail('A medida já existe.',409);
      state.metrics.push(metric);after=metric;recordId=metric.key;
    }else if(action==='goal.save'){
      const input=json(body.goal),metric=state.metrics.find(m=>m.key===input.metric_key);
      if(!metric)return fail('Indicador de meta inválido.');
      const kind=input.kind==='range'?'range':'target',start=Number(input.start_value),started=String(input.started_on??'');
      const target=Number(input.target),min=Number(input.min),max=Number(input.max);
      const deadline=input.deadline?String(input.deadline):undefined;
      if(!validDate(started)||!Number.isFinite(start)||start<0||deadline&&!validDate(deadline))return fail('Data ou valor inicial inválido.');
      if(kind==='target'?(!Number.isFinite(target)||target<0):(!Number.isFinite(min)||!Number.isFinite(max)||min<0||max<min))return fail('Alvo ou faixa inválidos.');
      const active=state.goals.find(g=>g.metric_key===metric.key&&g.status!=='closed'&&!g.replaced_by);
      if(active&&body.revise_id!==active.id)return fail('Já existe meta ativa: revise ou encerre a atual.',409);
      const id=randomUUID(),goal:BodyGoal={id,metric_key:metric.key,kind,start_value:start,started_on:started,deadline,
        status:'active',version:active?active.version+1:1,created_at:now,updated_at:now,
        ...(kind==='target'?{target}:{min,max})};
      if(active){before={...active};active.status='closed';active.replaced_by=id;active.updated_at=now;}
      state.goals.push(goal);after=goal;recordId=id;
    }else if(action==='goal.pause'||action==='goal.resume'||action==='goal.close'){
      const id=String(body.id??''),old=state.goals.find(g=>g.id===id);if(!old)return fail('Meta não encontrada.',404);
      const expected=action==='goal.pause'?'active':action==='goal.resume'?'paused':undefined;
      if(expected&&old.status!==expected||action==='goal.close'&&old.status==='closed')return fail('Estado da meta incompatível.',409);
      before={...old};old.status=action==='goal.pause'?'paused':action==='goal.resume'?'active':'closed';old.updated_at=now;after={...old};recordId=id;
    }else return fail('Operação desconhecida.');
    const audit:BodyData['audit'][number]={id:randomUUID(),record_type:event.startsWith('evaluation.')?'evaluation':event.startsWith('metric.')?'metric':'goal',
      record_id:recordId,action:event,occurred_at:now,before,after};
    state.audit=[audit,...state.audit].slice(0,300);
    const sql=db();
    await sql`INSERT INTO public.body_profile_state(user_id,state) VALUES (${uid}::uuid,${JSON.stringify(state)}::jsonb)
      ON CONFLICT(user_id) DO UPDATE SET state=EXCLUDED.state,updated_at=now()`;
    await sql`INSERT INTO public.body_profile_audit(id,user_id,action,record_id,before_value,after_value)
      VALUES (${audit.id}::uuid,${uid}::uuid,${event},${recordId},
      ${JSON.stringify(before)}::jsonb,${JSON.stringify(after)}::jsonb)`;
    return success(state);
  }catch(err){return serverError(err);}
}
