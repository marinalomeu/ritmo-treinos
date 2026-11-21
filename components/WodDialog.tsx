'use client';
import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import type { Exercise, Template } from '../lib/templates';
import type { CatalogExercise } from '../lib/exerciseCatalog';
import { normalizeTemplate } from '../lib/templateEditor';
import { createCustomExercise, createLocalWod, type Mode } from '../lib/clientStore';
import type { Modality } from '../lib/personalRecords';
import ExercisePicker from './ExercisePicker';
import MultiExerciseSelect from './MultiExerciseSelect';

const blank=():Exercise=>({
  key:`ex-${crypto.randomUUID()}`,name:'',sets:3,target:'10 repetições',defaultLoad:null,unit:'kg'
});

export default function WodDialog({mode,catalog,onChanged,onClose,onStarted,initialDate}:{
  mode:Mode;catalog:CatalogExercise[];onChanged:()=>Promise<void>;onClose:()=>void;
  onStarted:(id:string)=>Promise<void>;initialDate:string;
}){
  const [name,setName]=useState('Treino do dia / WOD');
  const [date,setDate]=useState(initialDate);
  const [gymName,setGymName]=useState('');
  const [exercises,setExercises]=useState<Exercise[]>(()=>[blank()]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const update=(index:number,changes:Partial<Exercise>)=>
    setExercises(list=>list.map((e,i)=>i===index?{...e,...changes}:e));
  const move=(from:number,to:number)=>{
    setExercises(list=>{if(to<0||to>=list.length)return list;const next=list.slice();const [item]=next.splice(from,1);next.splice(to,0,item);return next;});
  };
  const submit=async()=>{
    const template=normalizeTemplate({id:'wod',name,description:'',days:'',
      category:'CrossFit',exercises},'wod');
    if(!template||!/^\d{4}-\d{2}-\d{2}$/.test(date)){
      setError('Confira nome, data, exercícios selecionados e séries.');return;
    }
    if(template.exercises.reduce((total,e)=>total+e.sets,0)>160){
      setError('O treino do dia deve ter no máximo 160 séries.');return;
    }
    setBusy(true);setError('');
    try{
      if(mode==='showcase'){
        const id=await createLocalWod(mode,template,date,gymName);
        await onStarted(id);
        return;
      }
      const response=await fetch('/api/wod',{method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({
          name:template.name,performed_on:date,gym_name:gymName.trim(),exercises:template.exercises
        })});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'Falha ao criar treino do dia.');
      await onStarted(body.id);
    }catch(error){setError(error instanceof Error?error.message:'Erro ao iniciar treino.');}
    finally{setBusy(false);}
  };
  return <div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)onClose();}}>
    <div className="modal template-dialog wod-dialog" role="dialog" aria-modal="true" aria-labelledby="wod-title">
      <div className="modal-head"><div><p className="overline">TREINO AVULSO</p>
        <h2 id="wod-title">Treino do dia / WOD</h2></div>
        <button type="button" className="close-btn" disabled={busy} aria-label="Fechar" onClick={onClose}>×</button>
      </div>
      <p className="wod-intro">Monte a sequência recebida do coach. Este treino será salvo no seu histórico, mas não criará uma ficha fixa nem adicionará PRs automaticamente.</p>
      {error&&<p className="template-alert" role="alert">{error}</p>}
      <div className="template-editor-fields">
        <label>NOME DO TREINO<input value={name} maxLength={70} onChange={event=>setName(event.target.value)}/></label>
        <label>DATA<input type="date" value={date} onChange={event=>setDate(event.target.value)}/></label>
        <label>ACADEMIA / LOCAL (OPCIONAL)<input maxLength={100} value={gymName} onChange={event=>setGymName(event.target.value)} placeholder="Onde você vai treinar?"/></label>
      </div>
      <MultiExerciseSelect label="SELECIONAR VÁRIOS EXERCÍCIOS" options={catalog}
        selectedKeys={exercises.filter(e=>catalog.some(c=>c.key===e.key&&c.name===e.name)).map(e=>e.key)}
        max={40} disabled={busy} placeholder="Pesquise e marque os exercícios do WOD"
        onToggle={key=>setExercises(old=>{
          if(old.some(e=>e.key===key))return old.filter(e=>e.key!==key);
          const item=catalog.find(e=>e.key===key);
          if(!item||old.length>=40)return old;
          return [...old.filter(e=>e.name.trim()),{key:item.key,name:item.name,unit:item.unit,sets:3,target:'10 repetições',defaultLoad:null}];
        })}/>
      <p className="multi-builder-hint">Selecione vários exercícios de uma vez, depois configure os detalhes de cada um e reorganize a sequência.</p>
      <div className="template-editor-heading"><strong>Sequência de exercícios</strong>
        <button className="text-btn" type="button" disabled={busy||exercises.length>=40}
          onClick={()=>setExercises(x=>[...x,blank()])}><Plus size={15}/> Adicionar exercício</button>
      </div>
      <div className="template-edit-exercises">
        {exercises.map((e,index)=><div className="template-edit-exercise" key={e.key}>
          <div className="template-edit-head">
            <strong>{String(index+1).padStart(2,'0')} · Exercício</strong>
            <div className="wod-order-actions">
              <button type="button" aria-label="Subir exercício" disabled={busy||index===0} onClick={()=>move(index,index-1)}><ArrowUp size={15}/></button>
              <button type="button" aria-label="Descer exercício" disabled={busy||index===exercises.length-1} onClick={()=>move(index,index+1)}><ArrowDown size={15}/></button>
              <button type="button" aria-label="Remover exercício" disabled={busy||exercises.length===1}
                onClick={()=>setExercises(x=>x.filter((_,i)=>i!==index))}><Trash2 size={15}/></button>
            </div>
          </div>
          <ExercisePicker value={e.name} selectedKey={e.key} items={catalog}
            usedKeys={exercises.filter((_,i)=>i!==index).map(x=>x.key)}
            busy={busy}
            onType={value=>update(index,{name:value})}
            onSelect={item=>update(index,{key:item.key,name:item.name,unit:item.unit,defaultLoad:item.unit==='none'?null:e.defaultLoad})}
            onCreate={async(value:string,modality:Modality)=>{
              const unit:Exercise['unit']=modality==='Corrida'?'km/h':
                (['Funcional','Calistenia','Alongamentos','Pilates'].includes(modality)?'none':'kg');
              const created=await createCustomExercise(mode,value,unit,modality);
              update(index,{key:created.key,name:created.name,unit:created.unit,defaultLoad:null});
              await onChanged();
            }}
          />
          <div className="template-exercise-input-grid">
            <label>SÉRIES<input type="number" min="1" max="20" step="1" value={e.sets} onChange={ev=>update(index,{sets:Number(ev.target.value)})}/></label>
            <label>REPETIÇÕES / META<input maxLength={100} value={e.target} onChange={ev=>update(index,{target:ev.target.value})}/></label>
            <label>CARGA PREVISTA<input type="number" min="0" max="2000" step="0.5" placeholder="—" value={e.defaultLoad??''}
              onChange={ev=>update(index,{defaultLoad:ev.target.value===''?null:Number(ev.target.value)})}/></label>
            <label>UNIDADE<select value={e.unit} onChange={ev=>update(index,{unit:ev.target.value as Exercise['unit']})}>
              <option value="kg">kg</option><option value="assist_kg">kg assistência</option>
              <option value="km/h">km/h</option><option value="none">Peso corporal</option>
            </select></label>
          </div>
        </div>)}
      </div>
      <div className="template-dialog-actions">
        <button type="button" className="btn btn-primary" disabled={busy}
          onClick={()=>void submit()}>{busy?<LoaderCircle size={16} className="spin"/>:<Check size={16}/>} Iniciar treino do dia</button>
        <button type="button" className="btn btn-outline-template" disabled={busy} onClick={onClose}>Cancelar</button>
      </div>
    </div>
  </div>;
}
