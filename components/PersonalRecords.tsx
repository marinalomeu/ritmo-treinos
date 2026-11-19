'use client';
import { useMemo, useState } from 'react';
import { Check, Plus, Search, Save, Trash2, X } from 'lucide-react';
import { rankExerciseMatches } from './ExercisePicker';
import { normalizeExerciseName, type CatalogExercise } from '../lib/exerciseCatalog';
import type { Mode } from '../lib/clientStore';
import type { Unit } from '../lib/templates';
import { estimatedOneRM, intensityLabel, MODALITIES, parsePlannedReps, prBands, targetWeightForReps, type PersonalRecord, type ExerciseModality } from '../lib/personalRecords';

export type ExerciseOption={key:string;name:string;unit:Unit};
type PRReference={weight_kg:number;actual_reps:number|null;target_reps:string;source:'treino'|'ficha'};
type Props={mode:Mode;exercises:ExerciseOption[];catalog:CatalogExercise[];
  pinnedKeys:string[];fixedKeys:string[];references:Map<string,PRReference>;
  records:PersonalRecord[];modalities:ExerciseModality[];onChanged:()=>Promise<void>};
const fmt=(n:number)=>Number.isFinite(n)?n.toLocaleString('pt-BR',{maximumFractionDigits:1}):'—';
const range=(a:readonly[number,number])=>`${fmt(a[0])}–${fmt(a[1])} kg`;

export default function PersonalRecords({mode,exercises,catalog,pinnedKeys,fixedKeys,references,records,modalities,onChanged}:Props){
  const [search,setSearch]=useState('');
  const [addOpen,setAddOpen]=useState(false);
  const [addSearch,setAddSearch]=useState('');
  const [filter,setFilter]=useState('Todas');
  const [edits,setEdits]=useState<Record<string,{load:string;reps:string}>>({});
  const [selected,setSelected]=useState('');
  const [plannedReps,setPlannedReps]=useState('10');
  const [plannedLoad,setPlannedLoad]=useState('');
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const recordMap=useMemo(()=>new Map(records.map(r=>[r.exercise_key,r])),[records]);
  const pinnedSet=useMemo(()=>new Set(pinnedKeys),[pinnedKeys]);
  const fixedSet=useMemo(()=>new Set(fixedKeys),[fixedKeys]);
  const addMatches=useMemo(()=>rankExerciseMatches(catalog,addSearch),[catalog,addSearch]);
  const referenceRecord=(key:string)=>{
    const ref=references.get(key);
    const repetitions=ref?(ref.actual_reps??parsePlannedReps(ref.target_reps)):null;
    return ref&&repetitions?{weight_kg:ref.weight_kg,repetitions}:null;
  };
  const modalityMap=useMemo(()=>new Map(modalities.map(m=>[m.exercise_key,m.modality])),[modalities]);
  const visible=useMemo(()=>exercises.filter(e=>(
    e.name.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')) &&
    (filter==='Todas' || (modalityMap.get(e.key)||'Sem categoria')===filter)
  )).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')),[exercises,search,filter,modalityMap]);
  const chosen=exercises.find(e=>e.key===selected);
  const record=chosen?(recordMap.get(chosen.key)||referenceRecord(chosen.key)):undefined;
  const oneRM=record?estimatedOneRM(record.weight_kg,record.repetitions):NaN;
  const reps=Number(plannedReps);
  const suggested=record?targetWeightForReps(oneRM,reps):NaN;
  const actualLoad=plannedLoad.trim()===''?NaN:Number(plannedLoad);
  const loadPct=Number.isFinite(actualLoad)&&Number.isFinite(oneRM)&&oneRM>0?100*actualLoad/oneRM:NaN;
  const plannedOneRM=estimatedOneRM(actualLoad,reps);
  const epleyPct=Number.isFinite(plannedOneRM)&&Number.isFinite(oneRM)&&oneRM>0?100*plannedOneRM/oneRM:NaN;

  async function mutate(path:string,method:'PUT'|'DELETE',payload:Record<string,unknown>,key:string){
    if(mode!=='cloud')return;
    setBusy(key);setError('');setMessage('');
    try{
      const response=await fetch(path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'Não foi possível salvar.');
      await onChanged();setMessage('Alteração salva apenas na sua conta.');
    }catch(e){setError(e instanceof Error?e.message:'Falha ao salvar.');}
    finally{setBusy('');}
  }
  async function setPinned(key:string,method:'POST'|'DELETE'){
    if(mode!=='cloud')return;
    setBusy(key);setError('');setMessage('');
    try{
      const response=await fetch('/api/pr-exercises',{
        method,headers:{'Content-Type':'application/json'},
        body:JSON.stringify({exercise_key:key})
      });
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'Não foi possível atualizar a lista de PRs.');
      await onChanged();
      if(method==='POST'){setAddOpen(false);setAddSearch('');setMessage('Exercício adicionado à sua lista de PRs.');}
      else {setMessage('Exercício retirado da lista; histórico e recordes preservados.');setSelected('');}
    }catch(e){setError(e instanceof Error?e.message:'Falha ao atualizar a lista.');}
    finally{setBusy('');}
  }
  async function save(key:string){
    const existing=recordMap.get(key)||referenceRecord(key);
    const draft=edits[key]||{load:existing?String(existing.weight_kg):'',reps:existing?String(existing.repetitions):'1'};
    const weight=Number(draft.load.replace(',','.')),repetitions=Number(draft.reps);
    if(draft.load.trim()===''||!Number.isFinite(weight)||weight<=0||weight>2000||Math.abs(weight*100-Math.round(weight*100))>1e-6||
       !Number.isInteger(repetitions)||repetitions<1||repetitions>30){setError('PR: informe carga positiva e 1 a 30 repetições.');return;}
    await mutate('/api/prs','PUT',{exercise_key:key,weight_kg:weight,repetitions},key);
  }
  return <div className="prs-page">
    <div className="prs-intro">Insira a carga externa e as repetições do seu melhor resultado em cada exercício de força, inclusive os que atualmente usam peso corporal. O Ritmo estima o 1RM com Epley e recalcula as faixas sempre que você atualizar o PR. Corrida terá recordes próprios de distância, tempo e pace.</div>
    {mode!=='cloud'&&<p className="prs-tip">No modo demonstração, o cadastro de PRs está disponível somente para visualização.</p>}
    {error&&<p role="alert" className="template-alert">{error}</p>}
    {message&&<p role="status" className="prs-tip">{message}</p>}
    <div className="prs-tools">
      <label className="prs-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar exercício" aria-label="Pesquisar exercício"/></label>
      <label>Modalidade <select value={filter} onChange={e=>setFilter(e.target.value)}><option>Todas</option><option>Sem categoria</option>{MODALITIES.map(m=><option key={m}>{m}</option>)}</select></label>
      <button className="btn btn-primary prs-add-button" type="button" disabled={mode!=='cloud'||!!busy}
        onClick={()=>{setAddSearch('');setAddOpen(true);}}><Plus size={16}/> Adicionar</button>
    </div>
    <div className="prs-table-scroll">
      <table className="prs-table">
        <thead><tr><th>Exercício</th><th>Modalidade</th><th>PR (kg × reps)</th><th>1RM est.</th><th>Leve 40–60%</th><th>Moderada 70–85%</th><th>Pesada 85–100%</th><th>Ações</th></tr></thead>
        <tbody>{visible.map(e=>{
          const pr=recordMap.get(e.key);
          const ref=references.get(e.key);
          const fallback=referenceRecord(e.key);
          const current=pr||fallback;
          const estimated=current?estimatedOneRM(current.weight_kg,current.repetitions):NaN;
          const bands=prBands(estimated);
          const draft=edits[e.key]||{load:current?String(current.weight_kg):'',reps:current?String(current.repetitions):'1'};
          return <tr key={e.key}>
            <td><button type="button" className="prs-exercise-name" onClick={()=>{setSelected(e.key);setPlannedReps('10');setPlannedLoad('');}}>{e.name}</button><small>{pr?pr.source==='workout'?'PR registrado após treino':'PR registrado manualmente':fallback?ref?.source==='treino'?ref?.actual_reps!=null?'Referência: último treino (reps realizadas)':'Referência: último treino (reps planejadas)':'Referência: carga e reps previstas na ficha':e.unit==='assist_kg'?'Assistência — sem 1RM por Epley':e.unit==='km/h'?'Corrida · distância/tempo':e.unit==='none'?'Peso corporal · carga extra opcional':'PR ainda não medido'}</small></td>
            <td><select aria-label={`Modalidade de ${e.name}`} value={modalityMap.get(e.key)||''} disabled={mode!=='cloud'||!!busy} onChange={v=>void mutate('/api/exercise-modalities','PUT',{exercise_key:e.key,modality:v.target.value},e.key)}>
              <option value="">Sem categoria</option>{MODALITIES.map(m=><option key={m} value={m}>{m}</option>)}
            </select></td>
            <td>{e.unit!=='km/h'?<div className="prs-pr-edit"><input type="number" min="0.01" max="2000" step="0.5" inputMode="decimal" aria-label={`PR em kg de ${e.name}`} value={draft.load} disabled={mode!=='cloud'||!!busy} onChange={v=>setEdits(x=>({...x,[e.key]:{...draft,load:v.target.value}}))}/><span>×</span><input type="number" min="1" max="30" step="1" aria-label={`Repetições do PR de ${e.name}`} value={draft.reps} disabled={mode!=='cloud'||!!busy} onChange={v=>setEdits(x=>({...x,[e.key]:{...draft,reps:v.target.value}}))}/></div>:<span className="prs-na">Recorde aeróbico</span>}</td>
            <td className="prs-num">{current?`${fmt(estimated)} kg${pr?'':' (ref.)'}`:'—'}</td>
            <td>{current?range(bands.leve):'—'}</td><td>{current?range(bands.moderada):'—'}</td><td>{current?range(bands.pesada):'—'}</td>
            <td><div className="prs-actions">{e.unit!=='km/h'&&<button type="button" disabled={mode!=='cloud'||!!busy} onClick={()=>void save(e.key)} title="Salvar PR"><Save size={15}/> Salvar</button>}{pr&&<button type="button" disabled={mode!=='cloud'||!!busy} onClick={()=>{if(window.confirm('Excluir a medição manual do PR? O exercício continuará na lista se estiver na sua ficha ou tiver sido adicionado.'))void mutate('/api/prs','DELETE',{exercise_key:e.key},e.key);}} title="Excluir PR"><Trash2 size={15}/></button>}
            {pinnedSet.has(e.key)&&!fixedSet.has(e.key)&&<button type="button" disabled={mode!=='cloud'||!!busy} title="Retirar da lista de PRs"
              onClick={()=>{if(window.confirm('Retirar este exercício da lista de PRs? O recorde salvo não será apagado.'))void setPinned(e.key,'DELETE');}}><X size={15}/> Retirar</button>}</div></td>
          </tr>;
        })}</tbody>
      </table>
      {!visible.length&&<p className="prs-tip">Nenhum exercício corresponde aos filtros selecionados.</p>}
    </div>
    {addOpen&&<div className="modal-backdrop prs-add-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setAddOpen(false);}}>
      <div className="modal prs-add-dialog" role="dialog" aria-modal="true" aria-labelledby="prs-add-title">
        <div className="modal-head">
          <div><p className="overline">SEUS RECORDES PESSOAIS</p><h2 id="prs-add-title">Adicionar exercício</h2></div>
          <button className="close-btn" type="button" aria-label="Fechar" onClick={()=>setAddOpen(false)}>×</button>
        </div>
        <p className="prs-add-intro">Escolha um exercício para acompanhar seu PR, mesmo que não esteja em nenhuma ficha fixa. Ele será adicionado somente à sua lista.</p>
        <label className="prs-add-search"><Search size={17}/><input autoFocus
          value={addSearch} maxLength={100} placeholder="Buscar nome ou músculo (ex.: peito)"
          onChange={event=>setAddSearch(event.target.value)}/></label>
        {normalizeExerciseName(addSearch).length<2?<p className="prs-add-hint">Digite pelo menos duas letras para buscar no catálogo.</p>:
          addMatches.length===0?<p className="prs-add-hint">Nenhum exercício encontrado. Cadastre exercícios pessoais pelo editor de fichas.</p>:
          <div className="prs-add-results" role="list" aria-label="Exercícios disponíveis">
            {addMatches.map(item=>{
              const already=fixedSet.has(item.key)||pinnedSet.has(item.key);
              return <button type="button" key={item.key} className="prs-add-result" disabled={!!busy||already}
                onClick={()=>void setPinned(item.key,'POST')}>
                <span><strong>{item.name}</strong><small>{item.muscleGroup||item.modality} · {item.origin==='global'?'Catálogo geral':item.origin==='personal'?'Meu exercício':'Minhas fichas'}</small></span>
                {already?<span className="prs-add-tag"><Check size={13}/> Já listado</span>:<span className="prs-add-tag"><Plus size={13}/> Adicionar</span>}
              </button>;
            })}
          </div>}
      </div>
    </div>}
    {chosen&&<div className="prs-planner">
      <div><p className="overline">PLANEJADOR DE SÉRIE</p><h3>{chosen.name}</h3></div>
      {chosen.unit==='km/h'?<p>Corrida não usa estimativa de 1RM. Seus recordes serão comparados por distância, duração e pace.</p>:!record?<p>Salve primeiro um PR com carga externa e repetições para simular uma série. Se hoje você usa apenas peso corporal, pode deixar o PR em branco até acrescentar carga.</p>:<>
        <p>1RM estimado: <strong>{fmt(oneRM)} kg</strong>. Informe as repetições que pretende fazer e, se quiser, a carga planejada.</p>
        <div className="prs-plan-inputs">
          <label>Repetições planejadas <input type="number" min="1" max="30" step="1" value={plannedReps} onChange={e=>setPlannedReps(e.target.value)}/></label>
          <label>Carga planejada (kg) <input type="number" min="0" step="0.5" value={plannedLoad} placeholder="Opcional" onChange={e=>setPlannedLoad(e.target.value)}/></label>
        </div>
        <div className="prs-plan-results">
          <div><span>Carga teórica máxima para {Number.isInteger(reps)&&reps>=1&&reps<=30?reps:'—'} reps</span><strong>{Number.isFinite(suggested)?`${fmt(suggested)} kg`:'—'}</strong></div>
          <div><span>Intensidade da carga planejada</span><strong>{Number.isFinite(loadPct)?`${fmt(loadPct)}% · ${intensityLabel(actualLoad,oneRM)}`:'Preencha a carga'}</strong></div>
          <div><span>Exigência relativa estimada por Epley</span><strong>{Number.isFinite(epleyPct)?`${fmt(epleyPct)}% do seu PR`:'Preencha carga e reps'}</strong></div>
        </div>
        <p className="prs-disclaimer">Para exercícios feitos com peso corporal ou assistência, o cálculo considera somente a carga externa cadastrada, não o peso total do corpo nem os quilos de assistência. O valor teórico representa uma estimativa de carga máxima para a quantidade escolhida de repetições, não uma prescrição. A exigência relativa também é uma aproximação: para medir o esforço real, considere técnica, RIR e proximidade da falha. Epley não é adequado para exercícios de assistência, velocidade ou apenas peso corporal.</p>
      </>}
    </div>}
    <p className="prs-disclaimer">As faixas de 60–70% são intermediárias e ficam fora das três faixas de referência. A classificação indica intensidade relativa à força, não qualidade, segurança ou resultado do treino.</p>
  </div>;
}
