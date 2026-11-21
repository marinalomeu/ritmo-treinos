'use client';
import { TEMPLATES, getTemplate, makeSets, type SessionDetail, type StoredSet, type HistoryData, type WorkoutSession, type Template } from './templates';
import { SHOWCASE_GOAL, type TrainingGoal } from './goal';
import { DEMO_TEMPLATES } from './demoTemplates';
import { BASE_EXERCISES, normalizeExerciseName, type CatalogExercise } from './exerciseCatalog';
import type { Modality } from './personalRecords';
import type { Unit } from './templates';
export type Mode = 'demo' | 'cloud' | 'showcase';
const STORAGE_KEY = 'ritmo_treinos_demo_v1';
let showcaseExercises:CatalogExercise[]=[];
let showcaseTemplates:Template[]|null=null;
let showcaseSessions:SessionDetail[]|null=null;
const customKey=(mode:Mode)=>mode==='showcase'?'ritmo_showcase_custom_exercises_v1':'ritmo_demo_custom_exercises_v1';
const readCustom=(mode:Mode):CatalogExercise[]=>{if(mode==='showcase')return [...showcaseExercises];try{return JSON.parse(localStorage.getItem(customKey(mode))||'[]') as CatalogExercise[];}catch{return [];}};
const SHOWCASE_KEY = 'ritmo_showcase_v2';
const SHOWCASE_TEMPLATES_KEY='ritmo_showcase_templates_v1';
const DEMO_TEMPLATES_KEY='ritmo_local_templates_v1';
const templatesKey=(mode:Mode)=>mode==='showcase'?SHOWCASE_TEMPLATES_KEY:DEMO_TEMPLATES_KEY;
const localTemplates=(mode:Mode):Template[]=>{
  if(mode==='showcase')return JSON.parse(JSON.stringify(showcaseTemplates??DEMO_TEMPLATES)) as Template[];
  try {
    const raw=localStorage.getItem(templatesKey(mode));
    const fromStorage=raw?JSON.parse(raw):null;
    if(Array.isArray(fromStorage)) return fromStorage as Template[];
  }catch{}
  return JSON.parse(JSON.stringify(mode==='showcase'?DEMO_TEMPLATES:TEMPLATES)) as Template[];
};
const storeTemplates=(mode:Mode,templates:Template[])=>{if(mode==='showcase'){showcaseTemplates=JSON.parse(JSON.stringify(templates));return;}localStorage.setItem(templatesKey(mode),JSON.stringify(templates));};
const localKey = (mode:Mode) => mode==='showcase'?SHOWCASE_KEY:STORAGE_KEY;
const sampleSessions=():SessionDetail[] => {
  // Seis meses de treino inteiramente fictício, gerado a partir das fichas de demonstração.
  const days=['2026-06-08','2026-06-11','2026-07-07','2026-07-10','2026-08-06','2026-08-09','2026-09-08','2026-09-11','2026-10-07','2026-10-10','2026-11-09','2026-11-12'];
  const definitions=days.map((date,index)=>({date,template:index%2===0?'A':index%4===1?'B':'C',factor:Math.floor(index/2)*2+(index%3===0?0:1)}));
  return definitions.map((entry,index)=>{
    const template=DEMO_TEMPLATES.find(t=>t.id===entry.template)!;
    const id=`showcase-${index+1}`;
    const completedAt=`${entry.date}T18:30:00.000Z`;
    const sets=makeSets(template).map((set,i)=>({
      ...set,id:`${id}__${set.id}`,
      weight_kg:set.weight_kg===null?null:(set.load_unit==='assist_kg'?Math.max(0,set.weight_kg-entry.factor):set.weight_kg+entry.factor),
      completed:true,completed_at:completedAt
    }));
    return {session:{id,template_id:template.id,template_name:template.name,performed_on:entry.date,
      started_at:`${entry.date}T17:00:00.000Z`,finished_at:completedAt,status:'finished',completed_sets:sets.length,total_sets:sets.length},sets};
  });
};
const parseResponse = async <T>(res: Response): Promise<T> => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Não foi possível salvar. Tente novamente.');
  return data as T;
};
const read = (mode:Mode): SessionDetail[] => {
  try {
    if(mode==='showcase')return JSON.parse(JSON.stringify(showcaseSessions??(showcaseSessions=sampleSessions()))) as SessionDetail[];
    const raw=localStorage.getItem(localKey(mode));
    if(!raw && mode==='showcase'){
      const samples=sampleSessions();
      localStorage.setItem(localKey(mode),JSON.stringify(samples));
      return samples;
    }
    return JSON.parse(raw || '[]');
  } catch { return mode==='showcase'?sampleSessions():[]; }
};
const write = (mode:Mode,sessions: SessionDetail[]) => {if(mode==='showcase'){showcaseSessions=JSON.parse(JSON.stringify(sessions));return;}localStorage.setItem(localKey(mode),JSON.stringify(sessions));};
const recalc = (detail: SessionDetail):SessionDetail => ({...detail,session:{...detail.session,completed_sets:detail.sets.filter(s=>s.completed).length,total_sets:detail.sets.length}});
export async function listData(mode:Mode):Promise<HistoryData> {
  if (mode==='cloud') return parseResponse<HistoryData>(await fetch('/api/data',{cache:'no-store'}));
  const details = read(mode).map(recalc).sort((a,b)=> b.session.performed_on.localeCompare(a.session.performed_on) || b.session.started_at.localeCompare(a.session.started_at));
  const progress: HistoryData['progress'] = [];
  details.forEach(d => {
    const map = new Map<string,StoredSet>();
    d.sets.filter(s=>s.completed && s.weight_kg!==null && s.load_unit!=='none').forEach(s=>{
      const old = map.get(s.exercise_key);
      if (!old || (s.load_unit==='assist_kg' ? (s.weight_kg ?? 0) < (old.weight_kg ?? 0) : (s.weight_kg ?? 0) > (old.weight_kg ?? 0))) map.set(s.exercise_key,s);
    });
    map.forEach(s=>progress.push({exercise_key:s.exercise_key,exercise_name:s.exercise_name,load_unit:s.load_unit,performed_on:d.session.performed_on,weight_kg:s.weight_kg!,session_id:d.session.id}));
  });
  const historicalExercises=[...new Map(progress.map(p=>[p.exercise_key,{key:p.exercise_key,name:p.exercise_name,unit:p.load_unit}])).values()];
  return {sessions:details.map(d=>d.session),progress,goal:mode==='showcase'?SHOWCASE_GOAL:undefined,templates:localTemplates(mode),historicalExercises,customExercises:readCustom(mode)};
}
export async function createCustomExercise(mode:Mode,name:string,unit:Unit,modality:Modality):Promise<CatalogExercise>{
  if(mode==='cloud')return parseResponse<CatalogExercise>(await fetch('/api/exercises',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,unit,modality})}));
  const existing=[...BASE_EXERCISES,...readCustom(mode),...localTemplates(mode).flatMap(t=>t.exercises.map(e=>({...e,modality:'Outros' as const,origin:'existing' as const})))];
  if(existing.some(e=>normalizeExerciseName(e.name)===normalizeExerciseName(name)))throw new Error('Exercício já cadastrado. Selecione-o na busca.');
  const created:CatalogExercise={key:`ex-${crypto.randomUUID()}`,name,unit,modality,origin:'personal'};
  if(mode==='showcase')showcaseExercises=[...showcaseExercises,created];
  else localStorage.setItem(customKey(mode),JSON.stringify([...readCustom(mode),created]));
  return created;
}
export async function createSession(mode:Mode,templateId:string,date:string,gymName?:string):Promise<string> {
  if (mode==='cloud') { const r=await parseResponse<{id:string}>(await fetch('/api/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({template_id:templateId,performed_on:date,...(gymName!==undefined?{gym_name:gymName}:{})})})); return r.id; }
  const template=localTemplates(mode).find(t=>t.id===templateId); if (!template) throw new Error('Ficha desconhecida.');
  const now = new Date().toISOString(); const id=crypto.randomUUID();
  const past:Record<string,number> = {};
  const old=read(mode).sort((a,b)=>b.session.started_at.localeCompare(a.session.started_at));
  old.forEach(d=> d.sets.filter(s=>s.completed&&s.weight_kg!==null).forEach(s=>{if (past[s.exercise_key]===undefined) past[s.exercise_key]=s.weight_kg!;}));
  const sets = makeSets(template,past).map(s=>({...s,id:`${id}__${s.id}`}));
  const session:WorkoutSession={id,template_id:templateId,template_name:template.name,performed_on:date,gym_name:gymName??template.gym_name??null,started_at:now,finished_at:null,status:'active',completed_sets:0,total_sets:sets.length};
  write(mode,[{session,sets},...old]); return id;
}
export async function getSession(mode:Mode,id:string):Promise<SessionDetail> {
  if (mode==='cloud') return parseResponse<SessionDetail>(await fetch(`/api/sessions/${encodeURIComponent(id)}`,{cache:'no-store'}));
  const session=read(mode).find(s=>s.session.id===id); if (!session) throw new Error('Sessão não encontrada.'); return recalc(session);
}
export async function saveSet(mode:Mode,setId:string,completed:boolean,weight_kg:number|null,actual_reps:number|null=null,actual_distance_m:number|null=null):Promise<void> {
  if (mode==='cloud') { await parseResponse(await fetch(`/api/sets/${encodeURIComponent(setId)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({completed,weight_kg,actual_reps,actual_distance_m})})); return; }
  const list=read(mode); for (const d of list) {const s=d.sets.find(x=>x.id===setId); if (!s) continue; s.completed=completed;s.weight_kg=weight_kg;s.actual_reps=actual_reps;s.actual_distance_m=actual_distance_m;s.completed_at=completed?(s.completed_at || new Date().toISOString()):null;break;}write(mode,list);
}
export async function saveSessionGym(mode:Mode,id:string,gymName:string):Promise<string|null>{
  const name=gymName.trim().slice(0,100);
  if(mode==='cloud'){
    const result=await parseResponse<{gym_name:string|null}>(await fetch(`/api/sessions/${encodeURIComponent(id)}`,{
      method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({gym_name:name})
    }));
    return result.gym_name;
  }
  const list=read(mode);const detail=list.find(x=>x.session.id===id);
  if(!detail)throw new Error('Treino não encontrado.');
  detail.session.gym_name=name||null;write(mode,list);return detail.session.gym_name;
}
export async function finishSession(mode:Mode,id:string):Promise<void> {
  if(mode==='cloud') {await parseResponse(await fetch(`/api/sessions/${encodeURIComponent(id)}/finish`,{method:'POST'}));return;}
  const list=read(mode);const s=list.find(x=>x.session.id===id);if(!s)throw new Error('Sessão não encontrada.');s.session.status='finished';s.session.finished_at=new Date().toISOString();write(mode,list);
}
export async function deleteSession(mode:Mode,id:string):Promise<void> {
  if(mode==='cloud') {await parseResponse(await fetch(`/api/sessions/${encodeURIComponent(id)}`,{method:'DELETE'}));return;}
  write(mode,read(mode).filter(s=>s.session.id!==id));
}

export async function saveGoal(mode:Mode, goal:TrainingGoal):Promise<TrainingGoal>{
  if(mode!=='cloud') throw new Error('A meta só pode ser atualizada no perfil real.');
  return parseResponse<TrainingGoal>(await fetch('/api/goal',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(goal)}));
}

/** As fichas atuais são independentes das sessões históricas: nunca regravamos session_sets. */
export async function persistTemplate(mode:Mode,template:Template,isNew:boolean):Promise<Template>{
  if(mode==='cloud'){
    const url=isNew?'/api/templates':`/api/templates/${encodeURIComponent(template.id)}`;
    return parseResponse<Template>(await fetch(url,{method:isNew?'POST':'PUT',
      headers:{'Content-Type':'application/json'},body:JSON.stringify(template)}));
  }
  const items=localTemplates(mode);
  const saved={...template,id:isNew?`custom-${crypto.randomUUID()}`:template.id};
  const next=isNew?[...items,saved]:items.map(item=>item.id===saved.id?saved:item);
  storeTemplates(mode,next);
  return saved;
}
export async function removeTemplate(mode:Mode,id:string):Promise<void>{
  if(mode==='cloud'){
    await parseResponse(await fetch(`/api/templates/${encodeURIComponent(id)}`,{method:'DELETE'}));
    return;
  }
  storeTemplates(mode,localTemplates(mode).filter(item=>item.id!==id));
}
