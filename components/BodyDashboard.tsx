'use client';
import {useEffect,useMemo,useState} from 'react';
import {Activity,ArrowLeft,CheckCircle2,ChevronDown,ClipboardList,History,Plus,RotateCcw,Ruler,Target,Trash2,TrendingUp,X} from 'lucide-react';
import {STANDARD_METRICS,demoBodyData,firstAchievement,latestForMetric,validDate,validMetric,validateEvaluation,type BodyData,type BodyEvaluation,type BodyGoal,type BodyMetric} from '../lib/bodyMetrics';
import {loadForDisplay,loadForStorage} from '../lib/weightUnits';
import NumericField from './NumericField';
import type {Mode} from '../lib/clientStore';
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const asNumber=(s:string)=>Number(s.trim().replace(',','.'));
const fmt=(n:number,unit='')=>n.toLocaleString('pt-BR',{maximumFractionDigits:2})+(unit?' '+unit:'');
const dateBR=(s:string)=>s.slice(0,10).split('-').reverse().join('/');
const emptyBody=():BodyData=>({evaluations:[],metrics:[...STANDARD_METRICS],goals:[],audit:[]});
type Draft={id?:string;measured_on:string;method:string;notes:string;weight_unit?:'kg'|'lb';values:Record<string,string>};
const blank=():Draft=>({measured_on:today(),method:'',notes:'',values:{}});
const toDraft=(e:BodyEvaluation):Draft=>({...e,values:Object.fromEntries(Object.entries(e.values).map(([k,v])=>[k,String(v)]))});
export default function BodyDashboard({mode}:{mode:Mode}){
  const [data,setData]=useState<BodyData>(()=>mode==='showcase'?demoBodyData():emptyBody());
  const [loading,setLoading]=useState(mode==='cloud');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [group,setGroup]=useState<'composition'|'measurements'>('composition');
  const [selected,setSelected]=useState('weight_kg');
  const [period,setPeriod]=useState('all');
  const [editor,setEditor]=useState<Draft|null>(null);
  const [formTab,setFormTab]=useState<'composition'|'measurements'|'details'>('composition');
  const [showDeleted,setShowDeleted]=useState(false);
  const [customName,setCustomName]=useState('');
  const [customSide,setCustomSide]=useState<'none'|'right'|'left'>('none');
  const [goalMetric,setGoalMetric]=useState('weight_kg');
  const [goalKind,setGoalKind]=useState<'target'|'range'>('target');
  const [goalTarget,setGoalTarget]=useState('');
  const [goalMin,setGoalMin]=useState('');
  const [goalMax,setGoalMax]=useState('');
  const [goalDeadline,setGoalDeadline]=useState('');
  const [showGoal,setShowGoal]=useState(false);
  const [revising,setRevising]=useState<string|undefined>();
  useEffect(()=>{if(mode!=='cloud')return;let mounted=true;fetch('/api/body',{cache:'no-store'}).then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error||'Não foi possível carregar as avaliações.');if(mounted)setData(j);}).catch(e=>{if(mounted)setError(e.message);}).finally(()=>{if(mounted)setLoading(false);});return()=>{mounted=false;};},[mode]);
  const mutate=async(action:string,payload:Record<string,unknown>)=>{
    setBusy(true);setError('');
    try{
      if(mode==='cloud'){
        const r=await fetch('/api/body',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...payload})});
        const json=await r.json();if(!r.ok)throw Error(json.error||'Não foi possível salvar.');setData(json as BodyData);
      }else{
        const next:BodyData=JSON.parse(JSON.stringify(data));
        const now=new Date().toISOString(),id=String(payload.id??crypto.randomUUID());
        if(action==='evaluation.save'){
          const e=payload.evaluation as BodyEvaluation;const old=next.evaluations.find(x=>x.id===e.id);
          const saved={...e,id:old?.id??crypto.randomUUID(),created_at:old?.created_at??now,updated_at:now,deleted_at:null};
          next.evaluations=old?next.evaluations.map(x=>x.id===old.id?saved:x):[...next.evaluations,saved];
        }else if(action==='evaluation.delete'||action==='evaluation.restore'){
          next.evaluations=next.evaluations.map(e=>e.id===id?{...e,deleted_at:action==='evaluation.delete'?now:null,updated_at:now}:e);
        }else if(action==='metric.create'){
          next.metrics.push({key:'custom:'+crypto.randomUUID(),name:String(payload.name),unit:'cm',group:'measurements',side:payload.side as 'none'|'left'|'right',custom:true});
        }else if(action==='goal.save'){
          const incoming=payload.goal as BodyGoal,old=next.goals.find(g=>g.id===payload.revise_id);
          if(old){old.status='closed';old.replaced_by=id;}
          next.goals.push({...incoming,id,version:old?old.version+1:1,status:'active',created_at:now,updated_at:now});
        }else if(action.startsWith('goal.')){
          next.goals=next.goals.map(g=>g.id===id?{...g,status:(action==='goal.pause'?'paused':action==='goal.resume'?'active':'closed') as BodyGoal['status'],updated_at:now}:g);
        }
        setData(next);
      }
    }catch(e){setError(e instanceof Error?e.message:'Erro ao salvar.');throw e;}finally{setBusy(false);}
  };
  const metrics=data.metrics.filter(m=>m.group===group);
  const key=metrics.some(m=>m.key===selected)?selected:metrics[0]?.key||'weight_kg';
  const metric=data.metrics.find(m=>m.key===key);
  const activeEvaluations=data.evaluations.filter(e=>!e.deleted_at).sort((a,b)=>a.measured_on.localeCompare(b.measured_on)||a.created_at.localeCompare(b.created_at));
  const chartEntries=activeEvaluations.filter(e=>e.values[key]!==undefined).filter(e=>period==='all'||e.measured_on>=new Date(new Date().setMonth(new Date().getMonth()-Number(period))).toISOString().slice(0,10));
  const chartValues=chartEntries.map(e=>e.values[key]);
  const ymin=Math.min(...chartValues,0),ymax=Math.max(...chartValues,1);
  const range=chartValues.length?Math.max(1,ymax-Math.min(...chartValues)):1;
  const minValue=chartValues.length?Math.min(...chartValues)-range*.18:0;
  const maxValue=chartValues.length?Math.max(...chartValues)+range*.18:1;
  const points=chartEntries.map((e,i)=>({x:chartEntries.length===1?260:42+i*440/(chartEntries.length-1),y:200-(e.values[key]-minValue)/(maxValue-minValue)*160,value:e.values[key],date:e.measured_on}));
  const summaries=['weight_kg','fat_percent','waist_cm','muscle_kg'].map(k=>({metric:data.metrics.find(m=>m.key===k),evaluation:latestForMetric(data,k)}));
  const activeGoals=data.goals.filter(g=>!g.replaced_by&&g.status!=='closed');
  const saveEvaluation=async()=>{
    if(!editor)return;
    const values:Record<string,number>={};
    for(const [k,s] of Object.entries(editor.values)){if(!s.trim())continue;const n=asNumber(s);if(!Number.isFinite(n)){setError('Digite apenas medidas numéricas válidas.');return;}values[k]=n;}
    const item:BodyEvaluation={id:editor.id??crypto.randomUUID(),measured_on:editor.measured_on,method:editor.method,notes:editor.notes,weight_unit:editor.weight_unit??'kg',values,
      created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
    if(!validateEvaluation(item,data.metrics)){setError('Informe uma data válida e pelo menos uma medida. Confira os valores e unidades.');return;}
    try{await mutate('evaluation.save',{evaluation:item});setEditor(null);}catch{}
  };
  const addMetric=async()=>{
    const metric:BodyMetric={key:'custom:'+crypto.randomUUID(),name:customName.trim(),unit:'cm',group:'measurements',side:customSide,custom:true};
    if(!validMetric(metric)||data.metrics.some(m=>m.name.toLowerCase()===metric.name.toLowerCase()&&(m.side??'none')===metric.side)){setError('Informe um nome único para a medida.');return;}
    try{await mutate('metric.create',{name:metric.name,side:metric.side});setCustomName('');}catch{}
  };
  const saveGoal=async()=>{
    const latest=latestForMetric(data,goalMetric),metricObj=data.metrics.find(m=>m.key===goalMetric);
    if(!latest||!metricObj){setError('Registre uma avaliação desse indicador antes de definir uma meta.');return;}
    const payload={id:crypto.randomUUID(),metric_key:goalMetric,kind:goalKind,start_value:latest.values[goalMetric],started_on:latest.measured_on,deadline:goalDeadline||undefined,
      ...(goalKind==='target'?{target:asNumber(goalTarget)}:{min:asNumber(goalMin),max:asNumber(goalMax)})};
    const value=goalKind==='target'?Number.isFinite(asNumber(goalTarget))&&goalTarget.trim()!=='' : Number.isFinite(asNumber(goalMin))&&Number.isFinite(asNumber(goalMax))&&goalMin.trim()!==''&&goalMax.trim()!==''&&asNumber(goalMin)<=asNumber(goalMax);
    if(!value){setError('Confira os valores da meta.');return;}
    try{await mutate('goal.save',{goal:payload,revise_id:revising});setShowGoal(false);setRevising(undefined);setGoalTarget('');setGoalMin('');setGoalMax('');}catch{}
  };
  const updateGoal=async(id:string,action:'pause'|'resume'|'close')=>{try{await mutate('goal.'+action,{id});}catch{}};
  if(loading)return <div className="body-loading">Carregando suas avaliações corporais…</div>;
  return <section className="body-page">
    <header className="body-head"><div><p className="overline">ACOMPANHAMENTO CORPORAL</p><h1>Bioimpedância e medidas</h1><p>Seu histórico corporal, com ou sem metas. Acompanhe tendências ao longo do tempo.</p></div>
      <button className="btn btn-primary" onClick={()=>{setEditor(blank());setFormTab('composition');}}><Plus size={17}/> Nova avaliação</button></header>
    {mode==='showcase'&&<div className="demo-banner"><Activity size={17}/> Histórico corporal fictício de seis meses. Tudo o que você alterar nesta demonstração será descartado ao recarregar.</div>}
    {error&&<div className="message-error" role="alert">{error}<button onClick={()=>setError('')}>Fechar</button></div>}
    <div className="body-summary">{summaries.map(({metric:m,evaluation:e},i)=><div className="body-summary-card" key={i}>
      <span>{m?.name??'Indicador'}</span><strong>{e&&m?fmt(e.values[m.key],m.unit):'—'}</strong><small>{e?'Avaliado em '+dateBR(e.measured_on):'Ainda sem avaliação'}</small></div>)}</div>
    <div className="body-panel"><div className="body-panel-head"><div><p className="overline">SEUS OBJETIVOS</p><h2>Metas corporais <small>(opcionais)</small></h2></div><button className="btn btn-outline-template" onClick={()=>{setShowGoal(true);setRevising(undefined);}}><Plus size={16}/> Criar meta</button></div>
      {!activeGoals.length?<p className="body-muted">Você pode acompanhar todas as medidas sem metas. Se quiser, crie um objetivo a qualquer momento.</p>:
      <div className="body-goal-grid">{activeGoals.map(g=>{const m=data.metrics.find(x=>x.key===g.metric_key),last=latestForMetric(data,g.metric_key),achievement=firstAchievement(g,data.evaluations);
        const current=last?.values[g.metric_key];const inside=current!==undefined&&(g.kind==='range'?current>=g.min!&&current<=g.max!:g.target!>=g.start_value?current>=g.target!:current<=g.target!);
        const percent=g.kind==='target'&&current!==undefined&&g.target!==g.start_value?Math.max(0,Math.min(100,(current-g.start_value)/(g.target!-g.start_value)*100)):inside?100:0;
        return <article key={g.id} className="body-goal-card"><div className="body-goal-title"><strong>{m?.name??g.metric_key}</strong><span>{g.status==='paused'?'Pausada':'Acompanhando'}</span></div>
          <p>{g.kind==='target'?'Alvo: '+fmt(g.target!,m?.unit):'Faixa: '+fmt(g.min!,m?.unit)+' a '+fmt(g.max!,m?.unit)}</p>
          <div className="body-progress-track"><div style={{width:percent+'%'}}/></div>
          <small>{last?'Atual: '+fmt(current!,m?.unit)+' · '+dateBR(last.measured_on):'Sem medida recente'}</small>
          {achievement&&<p className="body-achievement"><CheckCircle2 size={15}/> Conquista histórica: {dateBR(achievement.measured_on)}</p>}
          {last&&<small>Situação atual: {inside?'dentro do objetivo':'fora do objetivo'}</small>}
          {g.deadline&&<small>Prazo informativo: {dateBR(g.deadline)}</small>}
          <div className="body-actions"><button onClick={()=>{setGoalMetric(g.metric_key);setGoalKind(g.kind);setGoalTarget(String(g.target??''));setGoalMin(String(g.min??''));setGoalMax(String(g.max??''));setGoalDeadline(g.deadline??'');setRevising(g.id);setShowGoal(true);}}>Revisar</button>
          <button onClick={()=>void updateGoal(g.id,g.status==='paused'?'resume':'pause')}>{g.status==='paused'?'Retomar':'Pausar'}</button><button onClick={()=>{if(confirm('Encerrar esta meta? O histórico será preservado.'))void updateGoal(g.id,'close');}}>Encerrar</button></div></article>;})}</div>}
      {data.goals.some(g=>g.status==='closed')&&<details className="body-archive"><summary>Histórico de metas encerradas e versões anteriores</summary>{data.goals.filter(g=>g.status==='closed').map(g=><p key={g.id}>{data.metrics.find(m=>m.key===g.metric_key)?.name??g.metric_key} · Versão {g.version} · Encerrada</p>)}</details>}
    </div>
    <div className="body-panel"><div className="body-panel-head"><div><p className="overline">GRÁFICOS</p><h2>Evolução de medidas</h2></div><TrendingUp size={20}/></div>
      <div className="body-chart-controls">
        <div className="body-segments"><button className={group==='composition'?'active':''} onClick={()=>setGroup('composition')}>Composição corporal</button><button className={group==='measurements'?'active':''} onClick={()=>setGroup('measurements')}>Medidas corporais</button></div>
        <label>Indicador<select value={key} onChange={e=>setSelected(e.target.value)}>{metrics.map(m=><option key={m.key} value={m.key}>{m.name}</option>)}</select></label>
        <label>Período<select value={period} onChange={e=>setPeriod(e.target.value)}><option value="all">Todo o histórico</option><option value="3">Últimos 3 meses</option><option value="6">Últimos 6 meses</option><option value="12">Últimos 12 meses</option></select></label>
      </div>
      {!points.length?<p className="body-chart-empty">Nenhuma avaliação desse indicador no período selecionado.</p>:<div className="body-chart-scroll">
        <svg className="body-chart-svg" viewBox="0 0 530 245" role="img" aria-label={'Evolução de '+(metric?.name??'indicador')}>
          {[40,90,140,190].map(y=><line key={y} x1="35" x2="500" y1={y} y2={y} stroke="#ebe4e9" strokeDasharray="4 5"/>)}
          <polyline points={points.map(p=>p.x+','+p.y).join(' ')} fill="none" stroke="#74546d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          {points.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r="5" fill="#74546d" stroke="#fff" strokeWidth="2"/><text x={p.x} y={p.y-13} fontSize="11" textAnchor="middle" fill="#4b3748">{fmt(p.value)}</text>
            <text x={p.x} y="227" fontSize="10" textAnchor="middle" fill="#8b7f87">{dateBR(p.date).slice(0,5)}</text></g>)}
        </svg></div>}
      <p className="body-muted">Medições podem variar conforme hidratação, método e equipamento. Tendências não substituem avaliação profissional.</p>
    </div>
    <div className="body-panel"><div className="body-panel-head"><div><p className="overline">HISTÓRICO</p><h2>Avaliações registradas</h2></div><label className="body-check"><input type="checkbox" checked={showDeleted} onChange={e=>setShowDeleted(e.target.checked)}/> Mostrar excluídas</label></div>
      <div className="body-table-wrap"><table className="body-table"><thead><tr><th>Data</th><th>Indicadores</th><th>Origem</th><th>Ações</th></tr></thead><tbody>
        {data.evaluations.filter(e=>showDeleted||!e.deleted_at).sort((a,b)=>b.measured_on.localeCompare(a.measured_on)).map(e=><tr key={e.id} className={e.deleted_at?'deleted':''}><td>{dateBR(e.measured_on)}</td><td>{Object.keys(e.values).length} medidas</td><td>{e.method||'Manual'}</td><td><div className="body-actions">{e.deleted_at?<button disabled={busy} onClick={()=>void mutate('evaluation.restore',{id:e.id})}><RotateCcw size={14}/> Restaurar</button>:<><button onClick={()=>{setEditor(toDraft(e));setFormTab('composition');}}>Editar</button><button disabled={busy} onClick={()=>{if(confirm('Excluir esta avaliação? Você poderá restaurá-la depois.'))void mutate('evaluation.delete',{id:e.id});}}><Trash2 size={14}/> Excluir</button></>}</div></td></tr>)}
      </tbody></table></div>
      {!data.evaluations.length&&<p className="body-muted">Ainda não há avaliações. Registre sua primeira medição para visualizar o histórico.</p>}
      {!!data.audit.length&&<details className="body-archive"><summary>Histórico de alterações</summary>{data.audit.slice(0,30).map(a=><p key={a.id}>{dateBR(a.occurred_at)} · {a.action} · {a.record_type}</p>)}</details>}
    </div>
    {editor&&<div className="body-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setEditor(null);}}><div className="body-modal" role="dialog" aria-modal="true" aria-label="Nova avaliação corporal">
      <header><div><p className="overline">REGISTRO CORPORAL</p><h2>{editor.id?'Editar avaliação':'Nova avaliação'}</h2></div><button aria-label="Fechar" onClick={()=>setEditor(null)}><X size={21}/></button></header>
      <div className="body-form-tabs"><button className={formTab==='composition'?'active':''} onClick={()=>setFormTab('composition')}>Composição</button><button className={formTab==='measurements'?'active':''} onClick={()=>setFormTab('measurements')}>Medidas</button><button className={formTab==='details'?'active':''} onClick={()=>setFormTab('details')}>Detalhes</button></div>
      {formTab==='details'?<div className="body-form-grid body-details-fields"><label>Data da avaliação *<input type="date" value={editor.measured_on} onChange={e=>setEditor({...editor,measured_on:e.target.value})}/></label>
        <label>Método ou equipamento<input maxLength={120} value={editor.method} onChange={e=>setEditor({...editor,method:e.target.value})} placeholder="Ex.: Balança de bioimpedância / fita métrica"/></label>
        <label className="wide">Observações<textarea maxLength={1000} value={editor.notes} onChange={e=>setEditor({...editor,notes:e.target.value})} rows={3}/></label></div>:
        <><p className="body-muted">Preencha apenas as medidas realizadas. Campos em branco não são salvos como zero.</p>
        <div className="body-form-grid">{data.metrics.filter(m=>m.group===formTab).map(m=>m.key==='weight_kg'?<div className="body-weight-fields" key={m.key}>
          <label>Peso<NumericField decimal placeholder="—" maxLength={7}
            value={loadForDisplay(editor.values[m.key]?asNumber(editor.values[m.key]):null,editor.weight_unit??'kg')}
            onValue={value=>setEditor(old=>old?{...old,values:{...old.values,[m.key]:String(loadForStorage(value,old.weight_unit??'kg')??'')}}:old)}/></label>
          <label>Unidade<select value={editor.weight_unit??'kg'} onChange={e=>setEditor({...editor,weight_unit:e.target.value==='lb'?'lb':'kg'})}>
            <option value="kg">kg</option><option value="lb">lb (libras)</option>
          </select></label>
        </div>:<label key={m.key}>{m.name} ({m.unit})<input inputMode="decimal" placeholder="—" value={editor.values[m.key]??''} onChange={e=>setEditor(old=>old?{...old,values:{...old.values,[m.key]:e.target.value}}:old)}/></label>)}</div>
        {formTab==='measurements'&&<div className="body-custom"><h3>Nova medida personalizada</h3><div className="body-custom-fields"><input value={customName} onChange={e=>setCustomName(e.target.value)} placeholder="Nome da medida" maxLength={90}/>
          <select value={customSide} onChange={e=>setCustomSide(e.target.value as 'none'|'right'|'left')}><option value="none">Sem lado</option><option value="right">Direito</option><option value="left">Esquerdo</option></select>
          <button type="button" className="btn btn-outline-template" disabled={!customName.trim()||busy} onClick={()=>void addMetric()}><Plus size={14}/> Adicionar</button></div></div>}</>}
      <footer><button className="btn btn-outline-template" onClick={()=>setEditor(null)}>Cancelar</button><button className="btn btn-primary" disabled={busy} onClick={()=>void saveEvaluation()}>{busy?'Salvando…':'Salvar avaliação'}</button></footer>
    </div></div>}
    {showGoal&&<div className="body-modal-backdrop" role="presentation"><div className="body-modal body-modal-small" role="dialog" aria-modal="true" aria-label="Meta corporal">
      <header><h2>{revising?'Revisar meta':'Criar meta opcional'}</h2><button onClick={()=>setShowGoal(false)} aria-label="Fechar"><X size={20}/></button></header>
      <div className="body-form-grid"><label className="wide">Indicador<select value={goalMetric} disabled={!!revising} onChange={e=>setGoalMetric(e.target.value)}>{data.metrics.map(m=><option key={m.key} value={m.key}>{m.name}</option>)}</select></label>
        <label className="wide">Tipo<select value={goalKind} onChange={e=>setGoalKind(e.target.value as 'target'|'range')}><option value="target">Valor-alvo</option><option value="range">Faixa de manutenção</option></select></label>
        {goalKind==='target'?<label className="wide">Valor-alvo<input inputMode="decimal" value={goalTarget} onChange={e=>setGoalTarget(e.target.value)}/></label>:<><label>Limite inferior<input inputMode="decimal" value={goalMin} onChange={e=>setGoalMin(e.target.value)}/></label><label>Limite superior<input inputMode="decimal" value={goalMax} onChange={e=>setGoalMax(e.target.value)}/></label></>}
        <label className="wide">Prazo informativo (opcional)<input type="date" value={goalDeadline} onChange={e=>setGoalDeadline(e.target.value)}/></label></div>
      <p className="body-muted">O valor inicial será obtido da última avaliação válida desse indicador. Revisões mantêm as metas anteriores arquivadas.</p>
      <footer><button className="btn btn-outline-template" onClick={()=>setShowGoal(false)}>Cancelar</button><button className="btn btn-primary" disabled={busy} onClick={()=>void saveGoal()}>{busy?'Salvando…':'Salvar meta'}</button></footer>
    </div></div>}
  </section>;
}
