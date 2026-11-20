'use client';
import { TEMPLATES, getTemplate, makeSets, type SessionDetail, type StoredSet, type HistoryData, type WorkoutSession, type Template } from './templates';
import { SHOWCASE_GOAL, type TrainingGoal } from './goal';
import { DEMO_TEMPLATES } from './demoTemplates';
export type Mode = 'demo' | 'cloud' | 'showcase';
const STORAGE_KEY = 'ritmo_treinos_demo_v1';
const SHOWCASE_KEY = 'ritmo_showcase_v2';
const SHOWCASE_TEMPLATES_KEY='ritmo_showcase_templates_v1';
const DEMO_TEMPLATES_KEY='ritmo_local_templates_v1';
const templatesKey=(mode:Mode)=>mode==='showcase'?SHOWCASE_TEMPLATES_KEY:DEMO_TEMPLATES_KEY;
const localTemplates=(mode:Mode):Template[]=>{
  try {
    const raw=localStorage.getItem(templatesKey(mode));
    const fromStorage=raw?JSON.parse(raw):null;
    if(Array.isArray(fromStorage)) return fromStorage as Template[];
  }catch{}
  return JSON.parse(JSON.stringify(mode==='showcase'?DEMO_TEMPLATES:TEMPLATES)) as Template[];
};
const storeTemplates=(mode:Mode,templates:Template[])=>localStorage.setItem(templatesKey(mode),JSON.stringify(templates));
const localKey = (mode:Mode) => mode==='showcase'?SHOWCASE_KEY:STORAGE_KEY;
const sampleSessions=():SessionDetail[] => {
  const definitions:{date:string;template:string;factor:number}[] = [
    {date:'2026-11-09',template:'A',factor:0},
    {date:'2026-11-10',template:'B',factor:0},
    {date:'2026-11-11',template:'C',factor:1},
    {date:'2026-11-12',template:'D',factor:0},
    {date:'2026-11-13',template:'E',factor:2}
  ];
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
    if(mode==='showcase') localStorage.removeItem('ritmo_showcase_v1');
    const raw=localStorage.getItem(localKey(mode));
    if(!raw && mode==='showcase'){
      const samples=sampleSessions();
      localStorage.setItem(localKey(mode),JSON.stringify(samples));
      return samples;
    }
    return JSON.parse(raw || '[]');
  } catch { return mode==='showcase'?sampleSessions():[]; }
};
const write = (mode:Mode,sessions: SessionDetail[]) => localStorage.setItem(localKey(mode),JSON.stringify(sessions));
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
  return {sessions:details.map(d=>d.session),progress,goal:mode==='showcase'?SHOWCASE_GOAL:undefined,templates:localTemplates(mode),historicalExercises};
}
export async function createSession(mode:Mode,templateId:string,date:string):Promise<string> {
  if (mode==='cloud') { const r=await parseResponse<{id:string}>(await fetch('/api/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({template_id:templateId,performed_on:date})})); return r.id; }
  const template=localTemplates(mode).find(t=>t.id===templateId); if (!template) throw new Error('Ficha desconhecida.');
  const now = new Date().toISOString(); const id=crypto.randomUUID();
  const past:Record<string,number> = {};
  const old=read(mode).sort((a,b)=>b.session.started_at.localeCompare(a.session.started_at));
  old.forEach(d=> d.sets.filter(s=>s.completed&&s.weight_kg!==null).forEach(s=>{if (past[s.exercise_key]===undefined) past[s.exercise_key]=s.weight_kg!;}));
  const sets = makeSets(template,past).map(s=>({...s,id:`${id}__${s.id}`}));
  const session:WorkoutSession={id,template_id:templateId,template_name:template.name,performed_on:date,started_at:now,finished_at:null,status:'active',completed_sets:0,total_sets:sets.length};
  write(mode,[{session,sets},...old]); return id;
}
/** Creates a one-off workout, without saving a reusable template. */
export async function createAdhocSession(mode:Mode,template:Template,date:string,preserveInitialLoads=false):Promise<string>{
  if(mode==='cloud'){
    const r=await parseResponse<{id:string}>(await fetch('/api/sessions',{method:'POST',
      headers:{'Content-Type':'application/json'},body:JSON.stringify({template,performed_on:date,preserve_initial_loads:preserveInitialLoads})}));
    return r.id;
  }
  const now=new Date().toISOString(),id=crypto.randomUUID();
  const past:Record<string,number>={};
  read(mode).sort((a,b)=>b.session.started_at.localeCompare(a.session.started_at))
    .forEach(d=>d.sets.filter(s=>s.completed&&s.weight_kg!==null).forEach(s=>{
      if(past[s.exercise_key]===undefined)past[s.exercise_key]=s.weight_kg!;
    }));
  const sets=makeSets(template,preserveInitialLoads?{}:past).map(s=>({...s,id:`${id}__${s.id}`}));
  const session:WorkoutSession={id,template_id:'avulso',template_name:template.name,
    performed_on:date,started_at:now,finished_at:null,status:'active',completed_sets:0,total_sets:sets.length};
  write(mode,[{session,sets},...read(mode)]);
  return id;
}
export async function getSession(mode:Mode,id:string):Promise<SessionDetail> {
  if (mode==='cloud') return parseResponse<SessionDetail>(await fetch(`/api/sessions/${encodeURIComponent(id)}`,{cache:'no-store'}));
  const session=read(mode).find(s=>s.session.id===id); if (!session) throw new Error('Sessão não encontrada.'); return recalc(session);
}
export async function saveSet(mode:Mode,setId:string,completed:boolean,weight_kg:number|null):Promise<void> {
  if (mode==='cloud') { await parseResponse(await fetch(`/api/sets/${encodeURIComponent(setId)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({completed,weight_kg})})); return; }
  const list=read(mode); for (const d of list) {const s=d.sets.find(x=>x.id===setId); if (!s) continue; s.completed=completed;s.weight_kg=weight_kg;s.completed_at=completed?(s.completed_at || new Date().toISOString()):null;break;}write(mode,list);
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
