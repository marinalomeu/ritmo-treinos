'use client';
import {useMemo,useState} from 'react';
import {Check,LoaderCircle,X} from 'lucide-react';
import type {SessionDetail,Template} from '../lib/templates';

export type TemplateLoadSelection={exercise_key:string;weight_kg:number};
export type TemplateAppendSelection={exercise_key:string;sets:number;target:string;useRecordedLoad:boolean};
type MissingRow=TemplateAppendSelection&{name:string;unit:string;checked:boolean;recordedLoad:number|null};
type Row={key:string;name:string;unit:string;previous:number|null;weight:string;checked:boolean};
export function templateLoadCandidates(detail:SessionDetail,template:Template):Row[]{
  const last=new Map<string,SessionDetail['sets'][number]>();
  for(const set of detail.sets){
    if(set.completed&&(set.load_unit==='kg'||set.load_unit==='assist_kg')&&
       typeof set.weight_kg==='number'&&Number.isFinite(set.weight_kg)&&set.weight_kg>=0&&set.weight_kg<=2000)
      last.set(set.exercise_key,set);
  }
  return template.exercises.flatMap(exercise=>{
    const recorded=last.get(exercise.key);
    if(!recorded||recorded.load_unit!==exercise.unit)return [];
    return [{key:exercise.key,name:exercise.name,unit:exercise.unit,previous:exercise.defaultLoad,
      weight:String(recorded.weight_kg),checked:false}];
  });
}
export default function TemplateLoadDialog({detail,template,busy,combined,onClose,onConfirm,onAddMissing}:{
  detail:SessionDetail;template:Template;busy:boolean;combined:boolean;
  onClose:()=>void;onConfirm:(items:TemplateLoadSelection[])=>Promise<void>|void;
  onAddMissing:(items:TemplateAppendSelection[])=>Promise<void>|void;
}){
  const original=useMemo(()=>templateLoadCandidates(detail,template),[detail,template]);
  const [rows,setRows]=useState<Row[]>(original);
  const [error,setError]=useState('');
  const missing=useMemo(()=>{
    const existing=new Set(template.exercises.map(x=>x.key));
    const grouped=new Map<string,MissingRow>();
    for(const set of detail.sets){
      if(!set.completed||existing.has(set.exercise_key))continue;
      const previous=grouped.get(set.exercise_key);
      if(previous){previous.sets++;continue;}
      grouped.set(set.exercise_key,{exercise_key:set.exercise_key,name:set.exercise_name,unit:set.load_unit,sets:1,target:set.target_reps,checked:false,useRecordedLoad:false,
        recordedLoad:(set.load_unit==='kg'||set.load_unit==='assist_kg')&&typeof set.weight_kg==='number'?set.weight_kg:null});
    }
    return [...grouped.values()];
  },[detail,template]);
  const [missingRows,setMissingRows]=useState<MissingRow[]>(missing);
  const [adding,setAdding]=useState(false);
  const hasCompleted=detail.sets.some(s=>s.completed);
  const hasSharedCompleted=detail.sets.some(s=>s.completed&&template.exercises.some(e=>e.key===s.exercise_key));
  const chosen=rows.filter(x=>x.checked).length;
  const update=(key:string,patch:Partial<Row>)=>{
    setRows(items=>items.map(x=>x.key===key?{...x,...patch}:x));setError('');
  };
  const submit=()=>{
    const selected:TemplateLoadSelection[]=[];
    for(const row of rows.filter(x=>x.checked)){
      const kg=Number(row.weight.replace(',','.'));
      if(!row.weight.trim()||!Number.isFinite(kg)||kg<0||kg>2000||
        Math.abs(kg*100-Math.round(kg*100))>1e-6){
        setError('Confira a carga entre 0 e 2.000 kg de cada exercício marcado.');return;
      }
      selected.push({exercise_key:row.key,weight_kg:kg});
    }
    if(!selected.length){setError('Selecione ao menos um exercício para atualizar a ficha.');return;}
    void onConfirm(selected);
  };

  const submitMissing=()=>{
    const selected=missingRows.filter(x=>x.checked);
    if(!selected.length){setError('Selecione ao menos um exercício realizado.');return;}
    if(template.exercises.length+selected.length>40){setError('Uma ficha pode ter no máximo 40 exercícios.');return;}
    if(selected.some(x=>x.sets<1||x.sets>20||!x.target.trim())){setError('Confira séries e repetições previstas.');return;}
    void onAddMissing(selected.map(x=>({exercise_key:x.exercise_key,sets:x.sets,target:x.target,useRecordedLoad:x.useRecordedLoad})));
  };
  const updateMissing=(key:string,patch:Partial<MissingRow>)=>{
    setMissingRows(current=>current.map(x=>x.exercise_key===key?{...x,...patch}:x));setError('');
  };
  const noShared=hasCompleted&&!hasSharedCompleted&&missing.length>0;
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}>
    <div className="modal pr-select-modal" role="dialog" aria-modal="true" aria-labelledby="template-load-title">
      <div className="modal-head"><div><p className="overline">CARGAS PARA OS PRÓXIMOS TREINOS</p>
        <h2 id="template-load-title">{adding?'Adicionar exercícios à ficha':noShared?'Esses exercícios ainda não estão na ficha':rows.length?'Atualizar cargas da ficha':'Nenhuma carga para atualizar'}</h2></div>
        <button className="close-btn" type="button" aria-label="Fechar" disabled={busy} onClick={onClose}><X size={18}/></button>
      </div>
      {adding?<>
        <p className="pr-select-intro">Selecione somente os exercícios concluídos que deseja incluir na ficha <strong>{template.name}</strong>. Ajuste séries, metas e carga antes de confirmar. O treino concluído não será alterado.</p>
        <div className="pr-select-list">{missingRows.map(row=><div className="pr-select-item" key={row.exercise_key}>
          <label className="pr-select-choice"><input type="checkbox" disabled={busy} checked={row.checked} onChange={e=>updateMissing(row.exercise_key,{checked:e.target.checked})}/><strong>{row.name}</strong></label>
          {row.checked&&<div className="pr-select-values">
            <label>Séries na ficha<input type="number" min="1" max="20" value={row.sets} onChange={e=>updateMissing(row.exercise_key,{sets:Number(e.target.value)})}/></label>
            <label>Repetições ou meta<input maxLength={100} value={row.target} onChange={e=>updateMissing(row.exercise_key,{target:e.target.value})}/></label>
            <small>Unidade: {row.unit}</small>
            {row.recordedLoad!==null&&<label><input type="checkbox" checked={row.useRecordedLoad} onChange={e=>updateMissing(row.exercise_key,{useRecordedLoad:e.target.checked})}/> Usar carga registrada neste treino ({row.recordedLoad} kg)</label>}
          </div>}
        </div>)}</div>
        <p className="pr-select-intro">A adição preserva o histórico e não altera os exercícios já existentes na ficha.</p>
      </>:rows.length?<>
        <p className="pr-select-intro">Selecione os exercícios cujas cargas quer usar nos próximos treinos. Os valores podem ser ajustados. Seu histórico permanecerá igual.</p>
        <div className="pr-select-list">{rows.map(row=><div key={row.key} className={row.checked?'pr-select-item is-checked':'pr-select-item'}>
          <label className="pr-select-choice"><input type="checkbox" checked={row.checked} disabled={busy} onChange={e=>update(row.key,{checked:e.target.checked})}/><span><strong>{row.name}</strong><small>Atual: {row.previous===null?'sem carga':row.previous+' kg'} · concluída: {row.weight} kg</small></span></label>
          {row.checked&&<div className="pr-select-values"><label>Nova carga planejada<input type="text" inputMode="decimal" value={row.weight} onChange={e=>update(row.key,{weight:e.target.value})}/></label></div>}
        </div>)}</div>
      </>:<>
        <p className="pr-select-intro">{noShared?'Nenhum dos exercícios realizados neste treino faz parte da ficha '+template.name+'. Por isso, não há cargas existentes para atualizar.':'Não encontramos cargas elegíveis para atualizar esta ficha. Conclua uma série com peso válido em exercício que pertença à ficha.'}</p>
        <p className="pr-select-intro">Nenhuma carga ou registro foi alterado.</p>
      </>}
      {!adding&&missing.length>0&&<div className="pr-select-intro"><p>Você pode adicionar os exercícios concluídos que ainda não estão na ficha para os próximos treinos.</p>
        <button type="button" className="btn btn-outline-template" onClick={()=>setAdding(true)} disabled={busy}>Adicionar exercícios à ficha</button>
      </div>}
      {error&&<p className="template-alert" role="alert">{error}</p>}
      <div className="pr-select-actions">
        <button className="btn btn-outline-template" type="button" disabled={busy} onClick={adding?()=>setAdding(false):onClose}>{adding?'Voltar':'Cancelar'}</button>
        {adding?<button className="btn btn-primary" type="button" disabled={busy||!missingRows.some(x=>x.checked)} onClick={submitMissing}>Adicionar {missingRows.filter(x=>x.checked).length} exercícios</button>:
        rows.length?<button className="btn btn-primary" type="button" disabled={busy||!chosen} onClick={submit}>{busy?<LoaderCircle className="spin" size={16}/>:<Check size={16}/>} {combined?'Continuar':'Atualizar '+chosen+' carga(s)'}</button>:
        <button className="btn btn-primary" type="button" onClick={onClose}>Entendi</button>}
      </div>
    </div>
  </div>;
}
