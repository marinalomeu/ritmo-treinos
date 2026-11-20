'use client';
import {useMemo,useState} from 'react';
import {Check,LoaderCircle,X} from 'lucide-react';
import type {SessionDetail,Template} from '../lib/templates';

export type TemplateLoadSelection={exercise_key:string;weight_kg:number};
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
export default function TemplateLoadDialog({detail,template,busy,combined,onClose,onConfirm}:{
  detail:SessionDetail;template:Template;busy:boolean;combined:boolean;
  onClose:()=>void;onConfirm:(items:TemplateLoadSelection[])=>Promise<void>|void;
}){
  const original=useMemo(()=>templateLoadCandidates(detail,template),[detail,template]);
  const [rows,setRows]=useState<Row[]>(original);
  const [error,setError]=useState('');
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
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}>
    <div className="modal pr-select-modal" role="dialog" aria-modal="true" aria-labelledby="template-load-title">
      <div className="modal-head"><div><p className="overline">CARGAS PARA OS PRÓXIMOS TREINOS</p>
        <h2 id="template-load-title">Quais exercícios atualizar?</h2></div>
        <button className="close-btn" type="button" aria-label="Fechar" disabled={busy} onClick={onClose}><X size={18}/></button>
      </div>
      <p className="pr-select-intro">Ficha: <strong>{template.name}</strong>. Marque somente os exercícios desejados e confira ou ajuste a nova carga. Nenhum exercício vem selecionado; seu histórico não será alterado.</p>
      {!rows.length&&<p className="pr-select-intro">Não há séries concluídas com carga compatível com esta ficha. Somente exercícios concluídos podem atualizar cargas planejadas.</p>}
      <div className="pr-select-list">
        {rows.map(row=><div key={row.key} className={row.checked?'pr-select-item is-checked':'pr-select-item'}>
          <label className="pr-select-choice">
            <input type="checkbox" checked={row.checked} disabled={busy} onChange={e=>update(row.key,{checked:e.target.checked})}/>
            <span><strong>{row.name}</strong>
              <small>Ficha atual: {row.previous===null?'sem carga':row.previous+' '+(row.unit==='assist_kg'?'kg assistência':'kg')} · última série concluída: {row.weight} kg</small></span>
          </label>
          {row.checked&&<div className="pr-select-values"><label>Nova carga planejada ({row.unit==='assist_kg'?'kg assistência':'kg'})
            <input type="text" inputMode="decimal" disabled={busy} value={row.weight} onChange={e=>update(row.key,{weight:e.target.value})}/>
          </label></div>}
        </div>)}
      </div>
      {error&&<p className="template-alert" role="alert">{error}</p>}
      <div className="pr-select-actions">
        <button className="btn btn-outline-template" type="button" disabled={busy} onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" type="button" disabled={busy||!rows.length} onClick={submit}>
          {busy?<LoaderCircle className="spin" size={16}/>:<Check size={16}/>}
          {combined?`Continuar com ${chosen} carga(s)`:`Atualizar ${chosen} ${chosen===1?'carga':'cargas'}`}
        </button>
      </div>
    </div>
  </div>;
}
