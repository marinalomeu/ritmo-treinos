'use client';
import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, Dumbbell, LoaderCircle, Pencil, Plus, Trash2, X } from 'lucide-react';
import NumericField from './NumericField';
import { comparableLoadUnit, loadForDisplay, loadForStorage } from '../lib/weightUnits';
import { prescribedReps } from '../lib/templates';
import type { Template, Exercise } from '../lib/templates';
import type { Mode } from '../lib/clientStore';
import { createCustomExercise, persistTemplate, removeTemplate } from '../lib/clientStore';
import type { CatalogExercise } from '../lib/exerciseCatalog';
import type { Modality } from '../lib/personalRecords';
import ExercisePicker from './ExercisePicker';
import MultiExerciseSelect from './MultiExerciseSelect';
import { normalizeTemplate } from '../lib/templateEditor';

const newExercise=():Exercise=>({
  key:`ex-${crypto.randomUUID()}`,name:'',sets:3,target:'10 repetições',defaultLoad:null,unit:'kg'
});
const newTemplate=():Template=>({
  id:'draft',name:'',description:'',days:'',category:'Personalizado',gym_name:'',exercises:[newExercise()]
});
const copyTemplate=(t:Template):Template=>JSON.parse(JSON.stringify(t)) as Template;
const fmtLoad=(e:Exercise)=>e.unit==='none'?'Peso corporal':
  e.defaultLoad===null?'Carga livre':`${loadForDisplay(e.defaultLoad,e.unit)} ${e.unit==='assist_kg'?'kg de assistência':e.unit}`;

export default function TemplateDialog({template,mode,onClose,onChanged,onStart,catalog}:{
  template:Template|null; mode:Mode;onClose:()=>void;onChanged:()=>Promise<void>;
  catalog:CatalogExercise[];
  onStart:(id:string)=>void;
}){
  const [editing,setEditing]=useState(!template);
  const [draft,setDraft]=useState<Template>(()=>template?copyTemplate(template):newTemplate());
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const updateExercise=(i:number,patch:Partial<Exercise>)=>{
    setDraft(d=>({...d,exercises:d.exercises.map((e,index)=>index===i?{...e,...patch}:e)}));
  };
  const moveExercise=(from:number,to:number)=>setDraft(current=>{
    if(to<0||to>=current.exercises.length)return current;
    const exercises=[...current.exercises];
    [exercises[from],exercises[to]]=[exercises[to],exercises[from]];
    return {...current,exercises};
  });
  const save=async()=>{
    // Nenhum nome novo deve gerar ID aleatorio sem passar pela biblioteca.
    const unlinked=draft.exercises.find(e=>
      !catalog.some(item=>item.key===e.key&&item.name===e.name)&&
      !template?.exercises.some(old=>old.key===e.key&&old.name===e.name)
    );
    if(unlinked){setError('Selecione um exercício da lista ou use Salvar só para mim antes de salvar a ficha.');return;}
    const normalized=normalizeTemplate(draft,template?.id||'draft');
    if(!normalized){setError('Informe o nome da ficha e preencha pelo menos um exercício. Confira séries, metas e cargas.');return;}
    setBusy(true);setError('');
    try{
      await persistTemplate(mode,normalized,!template);
      await onChanged();
      onClose();
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
        <div><p className="overline">{editing?(template?'EDITAR FICHA':'NOVA FICHA'):'CONSULTAR EXERCÍCIOS'}</p>
          <h2 id="template-dialog-title">{editing?(template?'Editar ficha':'Criar ficha'):(template?.name||'Ficha')}</h2></div>
        <button className="close-btn" type="button" aria-label="Fechar" disabled={busy} onClick={onClose}>×</button>
      </div>
      {error&&<p className="template-alert" role="alert">{error}</p>}
      {!editing&&template?<>
        <p className="template-dialog-description">{template.description||'Consulte os exercícios antes de iniciar o treino.'}</p>
        {template.days&&<p className="template-dialog-days">{template.days}</p>}
        {template.gym_name&&<p className="template-dialog-days">Academia/local padrão: {template.gym_name}</p>}
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
          <label>ACADEMIA / LOCAL PADRÃO (OPCIONAL)<input maxLength={100} value={draft.gym_name??''} onChange={e=>setDraft(d=>({...d,gym_name:e.target.value}))} placeholder="Ex.: Academia do bairro"/></label>
          <div className="template-input-grid">
            <label>DIAS<input maxLength={100} value={draft.days} onChange={e=>setDraft(d=>({...d,days:e.target.value}))} placeholder="Ex.: Segunda e sexta"/></label>
            <label>CATEGORIA<input maxLength={70} value={draft.category} onChange={e=>setDraft(d=>({...d,category:e.target.value}))} placeholder="Ex.: Força"/></label>
          </div>
        </div>
        <MultiExerciseSelect label="SELECIONAR VÁRIOS EXERCÍCIOS" options={catalog}
          selectedKeys={draft.exercises.filter(e=>catalog.some(c=>c.key===e.key&&c.name===e.name)).map(e=>e.key)}
          disabled={busy} max={40} placeholder="Pesquise e marque os exercícios da ficha"
          onToggle={key=>setDraft(d=>{
            if(d.exercises.some(e=>e.key===key))return {...d,exercises:d.exercises.filter(e=>e.key!==key)};
            const item=catalog.find(e=>e.key===key);
            if(!item||d.exercises.length>=40)return d;
            const next:Exercise={key:item.key,name:item.name,unit:item.unit,sets:3,target:'10 repetições',defaultLoad:null};
            // Substituir linha inicial vazia, preservando a sequência escolhida.
            return {...d,exercises:[...d.exercises.filter(e=>e.name.trim()),next]};
          })}/>
        <p className="multi-builder-hint">Primeiro marque os exercícios. Depois ajuste as séries, repetições, cargas e a ordem abaixo, antes de salvar.</p>
        <div className="template-editor-heading"><strong>Exercícios</strong><button type="button" className="text-btn" onClick={()=>setDraft(d=>({...d,exercises:[...d.exercises,newExercise()]}))} disabled={draft.exercises.length>=40||busy}><Plus size={15}/> Adicionar exercício</button></div>
        <div className="template-edit-exercises">{draft.exercises.map((e,i)=><div className="template-edit-exercise" key={e.key}>
          <div className="template-edit-head"><strong>Exercício {i+1}</strong><div className="wod-order-actions">
            <button type="button" aria-label={`Subir ${e.name||'exercício '+(i+1)}`} disabled={busy||i===0} onClick={()=>moveExercise(i,i-1)}><ArrowUp size={15}/></button>
            <button type="button" aria-label={`Descer ${e.name||'exercício '+(i+1)}`} disabled={busy||i===draft.exercises.length-1} onClick={()=>moveExercise(i,i+1)}><ArrowDown size={15}/></button>
            <button type="button" aria-label="Remover exercício" disabled={draft.exercises.length<=1||busy} onClick={()=>setDraft(d=>({...d,exercises:d.exercises.filter(x=>x.key!==e.key)}))}><X size={14}/></button></div></div>
          <ExercisePicker
            value={e.name}
            selectedKey={e.key}
            items={catalog}
            usedKeys={draft.exercises.filter((_,j)=>j!==i).map(item=>item.key)}
            busy={busy}
            onType={name=>updateExercise(i,{name})}
            onSelect={item=>{setError('');updateExercise(i,{key:item.key,name:item.name,unit:item.unit,defaultLoad:item.unit==='none'?null:e.defaultLoad});}}
            onCreate={async(name:string,modality:Modality)=>{
              const unit:Exercise['unit']=modality==='Corrida'?'km/h':(['Funcional','Calistenia','Alongamentos','Pilates'].includes(modality)?'none':'kg');
              setError('');
              try{
                const created=await createCustomExercise(mode,name,unit,modality);
                updateExercise(i,{key:created.key,name:created.name,unit:created.unit,defaultLoad:null});
                await onChanged();
              }catch(err){setError(err instanceof Error?err.message:'Falha ao cadastrar exercício pessoal.');}
            }}
          />
          <div className="template-exercise-input-grid">
            <label>SÉRIES<NumericField value={e.sets||null} maxLength={2} onValue={value=>updateExercise(i,{sets:value??0})}/></label>
            <label>REPETIÇÕES<NumericField value={prescribedReps(e.target)} maxLength={5} onValue={value=>updateExercise(i,{target:value===null?'':String(value)})}/>
              {e.target&&prescribedReps(e.target)===null&&<small>Meta atual: {e.target}</small>}
            </label>
            <label>CARGA INICIAL<NumericField decimal value={loadForDisplay(e.defaultLoad,e.unit)} maxLength={7} placeholder="—" onValue={value=>updateExercise(i,{defaultLoad:loadForStorage(value,e.unit)})}/></label>
            <label>DESCANSO (SEGUNDOS)<NumericField value={e.restSeconds??null} maxLength={4} placeholder="0" onValue={value=>updateExercise(i,{restSeconds:value})}/></label>
            <label>UNIDADE<select value={e.unit} onChange={v=>{
              const unit=v.target.value as Exercise['unit'];
              updateExercise(i,{unit,defaultLoad:comparableLoadUnit(unit)===comparableLoadUnit(e.unit)?e.defaultLoad:null});
            }}><option value="kg">kg</option><option value="lb">lb (libras)</option><option value="assist_kg">kg de assistência</option><option value="km/h">km/h</option><option value="none">Peso corporal</option></select></label>
          </div>
        </div>)}</div>
        <p className="template-history-notice">Editar ou retirar exercícios muda apenas esta ficha daqui para frente. Seu histórico continua disponível na aba Evolução.</p>
        <div className="template-dialog-actions">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={()=>void save()}>{busy?<LoaderCircle size={16} className="spin"/>:<Check size={16}/>} Salvar ficha</button>
          <button type="button" className="btn btn-outline-template" disabled={busy} onClick={()=>{if(template){setEditing(false);setError('');}else onClose();}}>Cancelar</button>
        </div>
      </>}
    </div>
  </div>;
}
