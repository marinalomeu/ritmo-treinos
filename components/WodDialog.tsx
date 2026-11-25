'use client';
import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import NumericField from './NumericField';
import { comparableLoadUnit, loadForDisplay, loadForStorage } from '../lib/weightUnits';
import type { Exercise, Template } from '../lib/templates';
import type { CatalogExercise } from '../lib/exerciseCatalog';
import { normalizeTemplate } from '../lib/templateEditor';
import { createCustomExercise, createLocalWod, type Mode } from '../lib/clientStore';
import type { Modality } from '../lib/personalRecords';
import ExercisePicker from './ExercisePicker';
import MultiExerciseSelect from './MultiExerciseSelect';
import { normalizeWodPlan, WOD_FORMATS, wodTarget, type WodBlock, type WodFormat } from '../lib/wodBlocks';

const blank=():Exercise=>({
  key:`ex-${crypto.randomUUID()}`,name:'',sets:3,target:'10 repetições',defaultLoad:null,unit:'kg'
});

const newBlock=(format:WodFormat):WodBlock=>({
  format,rounds:format==='rounds'||format==='for_time'?5:null,
  durationSeconds:format==='amrap'||format==='emom'?600:null,restSeconds:0,exercises:[blank()]
});
const metricSuffix={reps:'',m:' m',s:' s'} as const;
const metricOf=(target:string)=>wodTarget(target)?.metric??(target.endsWith(' m')?'m':target.endsWith(' s')?'s':'reps');

export default function WodDialog({mode,catalog,onChanged,onClose,onStarted,initialDate}:{
  mode:Mode;catalog:CatalogExercise[];onChanged:()=>Promise<void>;onClose:()=>void;
  onStarted:(id:string)=>Promise<void>;initialDate:string;
}){
  const [name,setName]=useState('Treino do dia / WOD');
  const [date,setDate]=useState(initialDate);
  const [gymName,setGymName]=useState('');
  const [blocks,setBlocks]=useState<WodBlock[]>(()=>[newBlock('linear')]);
  const [selectedBlock,setSelectedBlock]=useState(0);
  const block=blocks[selectedBlock];
  const exercises=block.exercises;
  const patchBlock=(patch:Partial<WodBlock>)=>setBlocks(list=>list.map((item,i)=>i===selectedBlock?{...item,...patch}:item));
  const setExercises=(change:(old:Exercise[])=>Exercise[])=>setBlocks(list=>
    list.map((item,i)=>i===selectedBlock?{...item,exercises:change(item.exercises)}:item));
  const addBlock=(format:WodFormat)=>{
    const replaceBlank=blocks.length===1&&!exercises.some(exercise=>exercise.name.trim());
    setBlocks(list=>replaceBlank?[newBlock(format)]:[...list,newBlock(format)]);
    setSelectedBlock(replaceBlank?0:blocks.length);
  };
  const moveBlock=(to:number)=>{
    if(to<0||to>=blocks.length)return;
    setBlocks(list=>{
      const next=[...list];
      [next[selectedBlock],next[to]]=[next[to],next[selectedBlock]];
      return next;
    });
    setSelectedBlock(to);
  };
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
    const structured=blocks.length>1||block.format!=='linear'||exercises.some(e=>wodTarget(e.target)?.metric==='s');
    const plan=structured?normalizeWodPlan(blocks):null;
    if(!name.trim()||(!structured&&!template)||(structured&&!plan)||!/^\d{4}-\d{2}-\d{2}$/.test(date)){
      setError('Confira nome, data, exercícios, metas e configuração de cada bloco.');return;
    }
    if(!structured&&template!.exercises.reduce((total,e)=>total+e.sets,0)>160){
      setError('O treino do dia deve ter no máximo 160 séries.');return;
    }
    setBusy(true);setError('');
    try{
      if(mode==='showcase'){await onStarted(await createLocalWod(mode,template??{id:'wod',name:name.trim(),category:'CrossFit',days:'',description:'',exercises:[]},date,gymName.trim(),plan??undefined));return;}
      const response=await fetch('/api/wod',{method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({
          name:name.trim(),performed_on:date,gym_name:gymName.trim(), ...(plan?{blocks:plan}:{exercises:template!.exercises})
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
      <section className="wod-plan-editor" aria-label="Blocos do treino">
        <div className="wod-block-selector">
          {blocks.map((item,index)=><button key={index} type="button" className="btn btn-outline-template"
            aria-pressed={selectedBlock===index} disabled={busy} onClick={()=>setSelectedBlock(index)}>
            {index+1}. {WOD_FORMATS[item.format]}
          </button>)}
        </div>
        <div className="wod-block-options">
          <button type="button" className="btn btn-outline-template" disabled={busy||blocks.length>=12}
            onClick={()=>addBlock('rounds')}><Plus size={15}/> Adicionar bloco</button>
          {blocks.length>1&&<div className="wod-order-actions">
            <button type="button" aria-label="Subir bloco" disabled={busy||selectedBlock===0} onClick={()=>moveBlock(selectedBlock-1)}><ArrowUp size={16}/></button>
            <button type="button" aria-label="Descer bloco" disabled={busy||selectedBlock===blocks.length-1} onClick={()=>moveBlock(selectedBlock+1)}><ArrowDown size={16}/></button>
            <button type="button" aria-label="Remover bloco" disabled={busy} onClick={()=>{
              setBlocks(list=>list.filter((_,i)=>i!==selectedBlock));
              setSelectedBlock(Math.max(0,selectedBlock-1));
            }}><Trash2 size={16}/></button>
          </div>}
        </div>
        <div className="template-exercise-input-grid" key={selectedBlock+'-'+block.format}>
          <label>FORMATO<select value={block.format} disabled={busy} onChange={event=>{
            const next=newBlock(event.target.value as WodFormat);
            patchBlock({...next,exercises});
          }}>{Object.entries(WOD_FORMATS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          {(block.format==='rounds'||block.format==='for_time')&&<label>VOLTAS
            <NumericField value={block.rounds} maxLength={3} onValue={rounds=>patchBlock({rounds})}/></label>}
          {(block.format==='amrap'||block.format==='emom'||block.format==='for_time')&&<label>
            {block.format==='for_time'?'LIMITE EM MINUTOS (OPCIONAL)':'DURAÇÃO EM MINUTOS'}
            <NumericField value={block.durationSeconds===null?null:block.durationSeconds/60} maxLength={3}
              onValue={value=>patchBlock({durationSeconds:value===null?null:value*60})}/>
          </label>}
          {block.format==='rounds'&&<label>DESCANSO ENTRE VOLTAS (S)
            <NumericField value={block.restSeconds||null} maxLength={4} placeholder="0" onValue={value=>patchBlock({restSeconds:value??0})}/>
          </label>}
        </div>
        {block.format==='emom'&&<p className="multi-builder-hint">Uma tarefa por minuto. Se adicionar mais de um exercício, as tarefas alternam na ordem da lista.</p>}
      </section>
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
      <div className="template-edit-exercises" key={selectedBlock}>
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
            {block.format==='linear'&&<label>SÉRIES<NumericField value={e.sets||null} maxLength={2} onValue={value=>update(index,{sets:value??0})}/></label>}
            <label>MEDIR EM<select value={metricOf(e.target)} onChange={event=>{
              const metric=event.target.value as keyof typeof metricSuffix;
              update(index,{target:(metric===metricOf(e.target)?wodTarget(e.target)?.value??'':'')+metricSuffix[metric]});
            }}><option value="reps">Repetições</option><option value="m">Metros</option><option value="s">Segundos</option></select></label>
            <label>META<NumericField key={metricOf(e.target)} decimal={metricOf(e.target)==='m'} value={wodTarget(e.target)?.value??null}
              maxLength={10} onValue={value=>update(index,{target:(value??'')+metricSuffix[metricOf(e.target)]})}/></label>
            <label>CARGA PREVISTA<NumericField decimal value={loadForDisplay(e.defaultLoad,e.unit)} maxLength={7} placeholder="—" onValue={value=>update(index,{defaultLoad:loadForStorage(value,e.unit)})}/></label>
            {block.format==='linear'&&<label>DESCANSO (SEGUNDOS)<NumericField value={e.restSeconds??null} maxLength={4} placeholder="0" onValue={value=>update(index,{restSeconds:value})}/></label>}
            <label>UNIDADE<select value={e.unit} onChange={ev=>{
              const unit=ev.target.value as Exercise['unit'];
              update(index,{unit,defaultLoad:comparableLoadUnit(unit)===comparableLoadUnit(e.unit)?e.defaultLoad:null});
            }}>
              <option value="kg">kg</option><option value="lb">lb (libras)</option><option value="assist_kg">kg assistência</option>
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
