'use client';
import { useMemo, useState } from 'react';
import { Check, LoaderCircle, Trophy, X } from 'lucide-react';
import type { SessionDetail } from '../lib/templates';
import { estimatedOneRM } from '../lib/personalRecords';

export type PrSelection={exercise_key:string;weight_kg:number;repetitions:number};
type Entry={key:string;name:string;unit:string;weight:string;reps:string;active:boolean;hasRecorded:boolean;partial:boolean};
const toInput=(n:number|null)=>n===null?'':String(n);
function candidate(detail:SessionDetail):Entry[]{
  const seen=new Map<string,Entry>();
  for(const s of detail.sets){
    if(seen.has(s.exercise_key))continue;
    if(s.load_unit!=='kg'&&s.load_unit!=='none')continue;
    const records=detail.sets.filter(x=>x.exercise_key===s.exercise_key &&
      typeof x.weight_kg==='number' && x.weight_kg>0 &&
      x.actual_reps!==null && Number.isInteger(x.actual_reps) &&
      x.actual_reps>=1 && x.actual_reps<=30);
    const best=records.slice().sort((a,b)=>
      estimatedOneRM(b.weight_kg!,b.actual_reps!)-estimatedOneRM(a.weight_kg!,a.actual_reps!))[0];
    seen.set(s.exercise_key,{
      key:s.exercise_key,name:s.exercise_name,unit:s.load_unit,
      weight:toInput(best?.weight_kg??null),reps:toInput(best?.actual_reps??null),
      active:false,hasRecorded:!!best,partial:Boolean(best&&!best.completed)
    });
  }
  return [...seen.values()];
}
export default function PrUpdateDialog({detail,includeTemplate,busy,onClose,onConfirm}:{
  detail:SessionDetail;includeTemplate:boolean;busy:boolean;onClose:()=>void;
  onConfirm:(choices:PrSelection[])=>Promise<void>;
}){
  const initial=useMemo(()=>candidate(detail),[detail]);
  const [entries,setEntries]=useState<Entry[]>(initial);
  const [error,setError]=useState('');
  const selectedCount=entries.filter(e=>e.active).length;
  const update=(key:string,changes:Partial<Entry>)=>{
    setEntries(all=>all.map(e=>e.key===key?{...e,...changes}:e));
    setError('');
  };
  const save=async()=>{
    const selections:PrSelection[]=[];
    for(const e of entries.filter(x=>x.active)){
      const weight=Number(e.weight.replace(',','.')),repetitions=Number(e.reps);
      if(!e.weight.trim()||!e.reps.trim()||!Number.isFinite(weight)||weight<=0||weight>2000||
         Math.abs(weight*100-Math.round(weight*100))>1e-6||
         !Number.isInteger(repetitions)||repetitions<1||repetitions>30){
        setError('Confira carga externa positiva e 1 a 30 repetições de cada exercício selecionado.');
        return;
      }
      selections.push({exercise_key:e.key,weight_kg:weight,repetitions});
    }
    if(!selections.length){setError('Selecione ao menos um exercício para atualizar seus PRs.');return;}
    await onConfirm(selections);
  };
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}>
    <div className="modal pr-select-modal" role="dialog" aria-modal="true" aria-labelledby="pr-select-title">
      <div className="modal-head"><div><p className="overline">SEU TREINO, SUAS MARCAS</p>
        <h2 id="pr-select-title">Quais PRs atualizar?</h2></div>
        <button type="button" className="close-btn" aria-label="Fechar" disabled={busy} onClick={onClose}><X size={18}/></button>
      </div>
      <p className="pr-select-intro">Escolha apenas os exercícios que deseja registrar. Pode usar uma série parcial ou informar o resultado manualmente, mesmo sem ter marcado todas as séries como concluídas.</p>
      <p className="pr-select-note"><Trophy size={15}/> Um resultado inferior nunca substituirá seu melhor PR registrado.</p>
      {!entries.length&&<p className="pr-select-intro">Este treino não contém exercícios com PR de carga externa. Corrida e assistência não usam esta estimativa.</p>}
      <div className="pr-select-list">
        {entries.map(e=><div key={e.key} className={e.active?'pr-select-item is-checked':'pr-select-item'}>
          <label className="pr-select-choice">
            <input type="checkbox" checked={e.active} disabled={busy} onChange={ev=>update(e.key,{active:ev.target.checked})}/>
            <span><strong>{e.name}</strong><small>{e.hasRecorded?
              (e.partial?'Série parcial registrada · confira o resultado':'Série registrada · confira o resultado'):
              'Sem medição: informe as repetições e a carga que realizou'}</small></span>
          </label>
          {e.active&&<div className="pr-select-values">
            <label>Carga externa (kg)<input type="text" inputMode="decimal" value={e.weight} disabled={busy}
              placeholder="Ex.: 25" onChange={ev=>update(e.key,{weight:ev.target.value})}/></label>
            <label>Repetições feitas<input type="number" min="1" max="30" step="1" value={e.reps} disabled={busy}
              placeholder="Ex.: 8" onChange={ev=>update(e.key,{reps:ev.target.value})}/></label>
          </div>}
        </div>)}
      </div>
      {error&&<p className="template-alert" role="alert">{error}</p>}
      <div className="pr-select-actions">
        <button className="btn btn-outline-template" type="button" disabled={busy} onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" type="button" disabled={busy||!entries.length} onClick={()=>void save()}>
          {busy?<LoaderCircle className="spin" size={16}/>:<Check size={16}/>}
          {includeTemplate?'Atualizar ficha e PRs':`Atualizar ${selectedCount} ${selectedCount===1?'PR':'PRs'}`}
        </button>
      </div>
    </div>
  </div>;
}
