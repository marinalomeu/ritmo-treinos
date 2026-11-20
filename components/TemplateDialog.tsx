'use client';
import { useState } from 'react';
import { Check, Dumbbell, LoaderCircle, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Template, Exercise } from '../lib/templates';
import type { Mode } from '../lib/clientStore';
import { persistTemplate, removeTemplate } from '../lib/clientStore';
import { normalizeTemplate } from '../lib/templateEditor';
import ExerciseMultiSelect from './ExerciseMultiSelect';

const newExercise=():Exercise=>({
  key:`ex-${crypto.randomUUID()}`,name:'',sets:3,target:'10 repetições',defaultLoad:null,unit:'kg'
});
const newTemplate=():Template=>({
  id:'draft',name:'',description:'',days:'',category:'Personalizado',exercises:[newExercise()]
});
const copyTemplate=(t:Template):Template=>JSON.parse(JSON.stringify(t)) as Template;
const fmtLoad=(e:Exercise)=>e.unit==='none'?'Peso corporal':
  e.defaultLoad===null?'Carga livre':`${e.defaultLoad} ${e.unit==='assist_kg'?'kg de assistência':e.unit}`;

export default function TemplateDialog({template,mode,onClose,onChanged,onStart,availableTemplates,sessionOnly=false,onSessionCreated}:{
  template:Template|null; mode:Mode;onClose:()=>void;onChanged:()=>Promise<void>;
  onStart:(id:string)=>void;availableTemplates:Template[];sessionOnly?:boolean;onSessionCreated?:(template:Template)=>Promise<void>;
}){
  const [editing,setEditing]=useState(!template);
  const [draft,setDraft]=useState<Template>(()=>template?copyTemplate(template):newTemplate());
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const catalog=[...new Map(availableTemplates.flatMap(t=>t.exercises).map(e=>[e.key,e] as const)).values()];
  const [queuedKeys,setQueuedKeys]=useState<string[]>([]);
  const addSelected=()=>{const chosen=catalog.filter(e=>queuedKeys.includes(e.key)&&!draft.exercises.some(x=>x.key===e.key));setDraft(d=>({...d,exercises:[...d.exercises.filter(e=>e.name.trim()),...chosen.map(e=>({...e}))].slice(0,40)}));setQueuedKeys([]);};
  const updateExercise=(i:number,patch:Partial<Exercise>)=>{
    setDraft(d=>({...d,exercises:d.exercises.map((e,index)=>index===i?{...e,...patch}:e)}));
  };
  const save=async()=>{
    const normalized=normalizeTemplate(draft,template?.id||'draft');
    if(!normalized){setError('Informe o nome da ficha e preencha pelo menos um exercício. Confira séries, metas e cargas.');return;}
    setBusy(true);setError('');
    try{
      if(sessionOnly){if(!onSessionCreated)throw new Error('Não foi possível iniciar o treino avulso.');await onSessionCreated(normalized);}
      else {await persistTemplate(mode,normalized,!template);await onChanged();onClose();}
    }catch(err){setError(err instanceof Error?err.message:'Não foi possível salvar a ficha.');}
    finally{setBusy(false);}
  };
  const remove=async()=>{
    if(!template||!window.confirm('Excluir esta ficha da sua rotina? Os treinos já realizados e as cargas históricas serão preservados.'))return;
    setBusy(true);setError('');
    try{await removeTemplate(mode,template.id);await onChanged();onClose();}
    catch(err){setError(err instanceof Error?err.message:'Não foi possível excluir a ficha.');}
    finally{setBusy(false);}
  };
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}>
    <div className="modal template-dialog" role="dialog" aria-modal="true" aria-labelledby="template-dialog-title">
      <div className="modal-head">
        <div><p className="overline">{editing?(sessionOnly?'TREINO AVULSO':template?'EDITAR FICHA':'NOVA FICHA'):'CONSULTAR EXERCÍCIOS'}</p>
          <h2 id="template-dialog-title">{editing?(sessionOnly?'Montar treino avulso':template?'Editar ficha':'Criar ficha'):(template?.name||'Ficha')}</h2></div>
        <button className="close-btn" type="button" aria-label="Fechar" disabled={busy} onClick={onClose}>×</button>
      </div>
      {error&&<p className="template-alert" role="alert">{error}</p>}
      {!editing&&template?<>
        <p className="template-dialog-description">{template.description||'Consulte os exercícios antes de iniciar o treino.'}</p>
        {template.days&&<p className="template-dialog-days">{template.days}</p>}
        <div className="template-exercises-list">
          {template.exercises.map((e,i)=><div className="template-exercise-item" key={e.key}>
            <span className="template-exercise-count">{String(i+1).padStart(2,'0')}</span>
            <div className="template-exercise-info"><strong>{e.name}</strong><span>{e.sets} {e.sets===1?'série':'séries'} · {e.target} · {fmtLoad(e)}</span>{e.tip&&<small>{e.tip}</small>}</div>
          </div>)}
        </div>
        <p className="template-history-notice">Você pode alterar esta ficha sem apagar as cargas e os exercícios de treinos anteriores.</p>
        <div className="template-dialog-actions">
          <button type="button" className="btn btn-primary" onClick={()=>onStart(template.id)}><Dumbbell size={16}/> Iniciar treino</button>
          <button type="button" className="btn btn-outline-template" onClick={()=>{setDraft(copyTemplate(template));setEditing(true);setError('');}}><Pencil size={15}/> Editar</button>
          <button type="button" className="btn btn-danger-outline" disabled={busy} onClick={()=>void remove()}>{busy?<LoaderCircle className="spin" size={15}/>:<Trash2 size={15}/>} Excluir</button>
        </div>
      </>:<>
        <div className="template-editor-fields">
          <label>NOME DA FICHA<input maxLength={70} value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))} placeholder="Ex.: Treino de segunda"/></label>
          <label>DESCRIÇÃO<input maxLength={400} value={draft.description} onChange={e=>setDraft(d=>({...d,description:e.target.value}))} placeholder="Descrição opcional"/></label>
          <div className="template-input-grid">
            <label>DIAS<input maxLength={100} value={draft.days} onChange={e=>setDraft(d=>({...d,days:e.target.value}))} placeholder="Ex.: Segunda e sexta"/></label>
            <label>CATEGORIA<input maxLength={70} value={draft.category} onChange={e=>setDraft(d=>({...d,category:e.target.value}))} placeholder="Ex.: Força"/></label>
          </div>
        </div>
        <div className="template-editor-heading"><strong>Exercícios</strong><button type="button" className="text-btn" onClick={()=>setDraft(d=>({...d,exercises:[...d.exercises,newExercise()]}))} disabled={draft.exercises.length>=40||busy}><Plus size={15}/> Adicionar exercício</button></div>
        <div className="template-bulk-picker"><strong>Adicionar vários exercícios</strong><p>Selecione todos os exercícios primeiro. Configure séries, repetições e cargas nos cartões abaixo antes de salvar.</p><ExerciseMultiSelect options={catalog.filter(e=>!draft.exercises.some(x=>x.key===e.key))} selected={queuedKeys} onChange={setQueuedKeys} label="Escolher exercícios da biblioteca" max={Math.max(0,40-draft.exercises.length)}/><button type="button" className="btn btn-outline-template" disabled={!queuedKeys.length||busy} onClick={addSelected}><Plus size={15}/> Adicionar {queuedKeys.length||''} selecionados</button></div>
        <div className="template-edit-exercises">{draft.exercises.map((e,i)=><div className="template-edit-exercise" key={e.key}>
          <div className="template-edit-head"><strong>Exercício {i+1}</strong><button type="button" className="template-remove-exercise" disabled={draft.exercises.length<=1||busy} onClick={()=>setDraft(d=>({...d,exercises:d.exercises.filter(x=>x.key!==e.key)}))}><X size={14}/> Remover</button></div>
          <label>NOME<input maxLength={100} placeholder="Nome do exercício" value={e.name} onChange={v=>updateExercise(i,{name:v.target.value})}/></label>
          <div className="template-exercise-input-grid">
            <label>SÉRIES<input type="number" min="1" max="20" step="1" value={e.sets} onChange={v=>updateExercise(i,{sets:Number(v.target.value)})}/></label>
            <label>REPETIÇÕES / META<input maxLength={100} value={e.target} onChange={v=>updateExercise(i,{target:v.target.value})}/></label>
            <label>CARGA INICIAL<input type="number" inputMode="decimal" min="0" max="2000" step="0.5" value={e.defaultLoad??''} placeholder="—" onChange={v=>updateExercise(i,{defaultLoad:v.target.value===''?null:Number(v.target.value)})}/></label>
            <label>UNIDADE<select value={e.unit} onChange={v=>updateExercise(i,{unit:v.target.value as Exercise['unit']})}><option value="kg">kg</option><option value="assist_kg">kg de assistência</option><option value="km/h">km/h</option><option value="none">Peso corporal</option></select></label>
          </div>
        </div>)}</div>
        <p className="template-history-notice">{sessionOnly?'Este treino será registrado no histórico, sem criar uma ficha permanente.':'Editar ou retirar exercícios muda apenas esta ficha daqui para frente. Seu histórico continua disponível na aba Evolução.'}</p>
        <div className="template-dialog-actions">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={()=>void save()}>{busy?<LoaderCircle size={16} className="spin"/>:<Check size={16}/>} {sessionOnly?'Começar treino avulso':'Salvar ficha'}</button>
          <button type="button" className="btn btn-outline-template" disabled={busy} onClick={()=>{if(template){setEditing(false);setError('');}else onClose();}}>Cancelar</button>
        </div>
      </>}
    </div>
  </div>;
}
