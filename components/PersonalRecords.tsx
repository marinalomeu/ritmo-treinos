'use client';
import { useMemo, useState } from 'react';
import { Search, Save, Trash2 } from 'lucide-react';
import type { Mode } from '../lib/clientStore';
import type { Unit } from '../lib/templates';
import { estimatedOneRM, intensityLabel, MODALITIES, prBands, targetWeightForReps, type PersonalRecord, type ExerciseModality } from '../lib/personalRecords';

export type ExerciseOption={key:string;name:string;unit:Unit};
type Props={mode:Mode;exercises:ExerciseOption[];records:PersonalRecord[];modalities:ExerciseModality[];onChanged:()=>Promise<void>};
const fmt=(n:number)=>Number.isFinite(n)?n.toLocaleString('pt-BR',{maximumFractionDigits:1}):'—';
const range=(a:readonly[number,number])=>`${fmt(a[0])}–${fmt(a[1])} kg`;

export default function PersonalRecords({mode,exercises,records,modalities,onChanged}:Props){
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('Todas');
  const [edits,setEdits]=useState<Record<string,{load:string;reps:string}>>({});
  const [selected,setSelected]=useState('');
  const [plannedReps,setPlannedReps]=useState('10');
  const [plannedLoad,setPlannedLoad]=useState('');
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const recordMap=useMemo(()=>new Map(records.map(r=>[r.exercise_key,r])),[records]);
  const modalityMap=useMemo(()=>new Map(modalities.map(m=>[m.exercise_key,m.modality])),[modalities]);
  const visible=useMemo(()=>exercises.filter(e=>(
    e.name.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')) &&
    (filter==='Todas' || (modalityMap.get(e.key)||'Sem categoria')===filter)
  )).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')),[exercises,search,filter,modalityMap]);
  const chosen=exercises.find(e=>e.key===selected);
  const record=chosen?recordMap.get(chosen.key):undefined;
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
  async function save(key:string){
    const existing=recordMap.get(key);
    const draft=edits[key]||{load:existing?String(existing.weight_kg):'',reps:existing?String(existing.repetitions):'1'};
    const weight=Number(draft.load.replace(',','.')),repetitions=Number(draft.reps);
    if(draft.load.trim()===''||!Number.isFinite(weight)||weight<=0||weight>2000||Math.abs(weight*100-Math.round(weight*100))>1e-6||
       !Number.isInteger(repetitions)||repetitions<1||repetitions>30){setError('PR: informe carga positiva e 1 a 30 repetições.');return;}
    await mutate('/api/prs','PUT',{exercise_key:key,weight_kg:weight,repetitions},key);
  }
  return <div className="prs-page">
    <div className="prs-intro">Insira a carga e as repetições do seu melhor resultado em cada exercício. O Ritmo estima o 1RM com Epley e recalcula as faixas sempre que você atualizar o PR.</div>
    {mode!=='cloud'&&<p className="prs-tip">No modo demonstração, o cadastro de PRs está disponível somente para visualização.</p>}
    {error&&<p role="alert" className="template-alert">{error}</p>}
    {message&&<p role="status" className="prs-tip">{message}</p>}
    <div className="prs-tools">
      <label className="prs-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar exercício" aria-label="Pesquisar exercício"/></label>
      <label>Modalidade <select value={filter} onChange={e=>setFilter(e.target.value)}><option>Todas</option><option>Sem categoria</option>{MODALITIES.map(m=><option key={m}>{m}</option>)}</select></label>
    </div>
    <div className="prs-table-scroll">
      <table className="prs-table">
        <thead><tr><th>Exercício</th><th>Modalidade</th><th>PR (kg × reps)</th><th>1RM est.</th><th>Leve 40–60%</th><th>Moderada 70–85%</th><th>Pesada 85–100%</th><th>Ações</th></tr></thead>
        <tbody>{visible.map(e=>{
          const pr=recordMap.get(e.key),estimated=pr?estimatedOneRM(pr.weight_kg,pr.repetitions):NaN;
          const bands=prBands(estimated);
          const draft=edits[e.key]||{load:pr?String(pr.weight_kg):'',reps:pr?String(pr.repetitions):'1'};
          return <tr key={e.key}>
            <td><button type="button" className="prs-exercise-name" onClick={()=>{setSelected(e.key);setPlannedReps('10');setPlannedLoad('');}}>{e.name}</button><small>{e.unit==='assist_kg'?'Carga de assistência':e.unit==='km/h'?'Velocidade':e.unit==='none'?'Peso corporal':'Carga em kg'}</small></td>
            <td><select aria-label={`Modalidade de ${e.name}`} value={modalityMap.get(e.key)||''} disabled={mode!=='cloud'||!!busy} onChange={v=>void mutate('/api/exercise-modalities','PUT',{exercise_key:e.key,modality:v.target.value},e.key)}>
              <option value="">Sem categoria</option>{MODALITIES.map(m=><option key={m} value={m}>{m}</option>)}
            </select></td>
            <td>{e.unit==='kg'?<div className="prs-pr-edit"><input type="number" min="0.01" max="2000" step="0.5" inputMode="decimal" aria-label={`PR em kg de ${e.name}`} value={draft.load} disabled={mode!=='cloud'||!!busy} onChange={v=>setEdits(x=>({...x,[e.key]:{...draft,load:v.target.value}}))}/><span>×</span><input type="number" min="1" max="30" step="1" aria-label={`Repetições do PR de ${e.name}`} value={draft.reps} disabled={mode!=='cloud'||!!busy} onChange={v=>setEdits(x=>({...x,[e.key]:{...draft,reps:v.target.value}}))}/></div>:<span className="prs-na">Não aplicável</span>}</td>
            <td className="prs-num">{pr?`${fmt(estimated)} kg`:'—'}</td>
            <td>{pr?range(bands.leve):'—'}</td><td>{pr?range(bands.moderada):'—'}</td><td>{pr?range(bands.pesada):'—'}</td>
            <td><div className="prs-actions">{e.unit==='kg'&&<button type="button" disabled={mode!=='cloud'||!!busy} onClick={()=>void save(e.key)} title="Salvar PR"><Save size={15}/> Salvar</button>}{pr&&<button type="button" disabled={mode!=='cloud'||!!busy} onClick={()=>{if(window.confirm('Excluir o PR deste exercício?'))void mutate('/api/prs','DELETE',{exercise_key:e.key},e.key);}} title="Excluir PR"><Trash2 size={15}/></button>}</div></td>
          </tr>;
        })}</tbody>
      </table>
      {!visible.length&&<p className="prs-tip">Nenhum exercício corresponde aos filtros selecionados.</p>}
    </div>
    {chosen&&<div className="prs-planner">
      <div><p className="overline">PLANEJADOR DE SÉRIE</p><h3>{chosen.name}</h3></div>
      {!record?<p>Salve primeiro o PR desse exercício para simular uma série.</p>:<>
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
        <p className="prs-disclaimer">O valor teórico representa uma estimativa de carga máxima para a quantidade escolhida de repetições, não uma prescrição. A exigência relativa também é uma aproximação: para medir o esforço real, considere técnica, RIR e proximidade da falha. Epley não é adequado para exercícios de assistência, velocidade ou apenas peso corporal.</p>
      </>}
    </div>}
    <p className="prs-disclaimer">As faixas de 60–70% são intermediárias e ficam fora das três faixas de referência. A classificação indica intensidade relativa à força, não qualidade, segurança ou resultado do treino.</p>
  </div>;
}
