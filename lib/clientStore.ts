'use client';
import { getTemplate, makeSets, type SessionDetail, type StoredSet, type HistoryData, type WorkoutSession } from './templates';
export type Mode = 'demo' | 'cloud';
const STORAGE_KEY = 'ritmo_treinos_demo_v1';
const parseResponse = async <T>(res: Response): Promise<T> => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Não foi possível salvar. Tente novamente.');
  return data as T;
};
const read = (): SessionDetail[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};
const write = (sessions: SessionDetail[]) => localStorage.setItem(STORAGE_KEY,JSON.stringify(sessions));
const recalc = (detail: SessionDetail):SessionDetail => ({...detail,session:{...detail.session,completed_sets:detail.sets.filter(s=>s.completed).length,total_sets:detail.sets.length}});
export async function listData(mode:Mode):Promise<HistoryData> {
  if (mode==='cloud') return parseResponse<HistoryData>(await fetch('/api/data',{cache:'no-store'}));
  const details = read().map(recalc).sort((a,b)=> b.session.performed_on.localeCompare(a.session.performed_on) || b.session.started_at.localeCompare(a.session.started_at));
  const progress: HistoryData['progress'] = [];
  details.forEach(d => {
    const map = new Map<string,StoredSet>();
    d.sets.filter(s=>s.completed && s.weight_kg!==null && s.load_unit!=='none').forEach(s=>{
      const old = map.get(s.exercise_key);
      if (!old || (s.load_unit==='assist_kg' ? (s.weight_kg ?? 0) < (old.weight_kg ?? 0) : (s.weight_kg ?? 0) > (old.weight_kg ?? 0))) map.set(s.exercise_key,s);
    });
    map.forEach(s=>progress.push({exercise_key:s.exercise_key,exercise_name:s.exercise_name,load_unit:s.load_unit,performed_on:d.session.performed_on,weight_kg:s.weight_kg!,session_id:d.session.id}));
  });
  return {sessions:details.map(d=>d.session),progress};
}
export async function createSession(mode:Mode,templateId:string,date:string):Promise<string> {
  if (mode==='cloud') { const r=await parseResponse<{id:string}>(await fetch('/api/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({template_id:templateId,performed_on:date})})); return r.id; }
  const template = getTemplate(templateId); if (!template) throw new Error('Ficha desconhecida.');
  const now = new Date().toISOString(); const id=crypto.randomUUID();
  const past:Record<string,number> = {};
  const old=read().sort((a,b)=>b.session.started_at.localeCompare(a.session.started_at));
  old.forEach(d=> d.sets.filter(s=>s.completed&&s.weight_kg!==null).forEach(s=>{if (past[s.exercise_key]===undefined) past[s.exercise_key]=s.weight_kg!;}));
  const sets = makeSets(template,past).map(s=>({...s,id:`${id}__${s.id}`}));
  const session:WorkoutSession={id,template_id:templateId,template_name:template.name,performed_on:date,started_at:now,finished_at:null,status:'active',completed_sets:0,total_sets:sets.length};
  write([{session,sets},...old]); return id;
}
export async function getSession(mode:Mode,id:string):Promise<SessionDetail> {
  if (mode==='cloud') return parseResponse<SessionDetail>(await fetch(`/api/sessions/${encodeURIComponent(id)}`,{cache:'no-store'}));
  const session=read().find(s=>s.session.id===id); if (!session) throw new Error('Sessão não encontrada.'); return recalc(session);
}
export async function saveSet(mode:Mode,setId:string,completed:boolean,weight_kg:number|null):Promise<void> {
  if (mode==='cloud') { await parseResponse(await fetch(`/api/sets/${encodeURIComponent(setId)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({completed,weight_kg})})); return; }
  const list=read(); for (const d of list) {const s=d.sets.find(x=>x.id===setId); if (!s) continue; s.completed=completed;s.weight_kg=weight_kg;s.completed_at=completed?(s.completed_at || new Date().toISOString()):null;break;}write(list);
}
export async function finishSession(mode:Mode,id:string):Promise<void> {
  if(mode==='cloud') {await parseResponse(await fetch(`/api/sessions/${encodeURIComponent(id)}/finish`,{method:'POST'}));return;}
  const list=read();const s=list.find(x=>x.session.id===id);if(!s)throw new Error('Sessão não encontrada.');s.session.status='finished';s.session.finished_at=new Date().toISOString();write(list);
}
export async function deleteSession(mode:Mode,id:string):Promise<void> {
  if(mode==='cloud') {await parseResponse(await fetch(`/api/sessions/${encodeURIComponent(id)}`,{method:'DELETE'}));return;}
  write(read().filter(s=>s.session.id!==id));
}
