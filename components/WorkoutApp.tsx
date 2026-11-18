'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowLeft, ArrowRight, BarChart3, CalendarDays, Check, CheckCircle2, ChevronRight, Circle, Clock3, Cloud, Dumbbell, Footprints, History, LoaderCircle, LogOut, Plus, RefreshCw, Sparkles, Trash2, TrendingUp, WifiOff } from 'lucide-react';
import { TEMPLATES, getTemplate, type HistoryData, type SessionDetail, type StoredSet, type Template, type Unit } from '../lib/templates';
import { createSession, deleteSession, finishSession, getSession, listData, saveSet, type Mode } from '../lib/clientStore';

type View = 'home' | 'history' | 'progress' | 'workout';
const todayLocal = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const humanDate = (value:string) => {const [y,m,d]=value.slice(0,10).split('-');return `${d}/${m}/${y}`;};
const formatLong = (s:string) => new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long'}).format(new Date(s+'T12:00:00'));
const fmt = (n:number) => Number.isInteger(n) ? String(n) : n.toLocaleString('pt-BR',{maximumFractionDigits:2});
const unitName = (u:Unit) => u==='assist_kg'?'kg de assistência':u==='km/h'?'km/h':u==='kg'?'kg':'peso corporal';
const titleFor = (id:string) => getTemplate(id)?.name || 'Treino';
const summary = (sessions:HistoryData['sessions']) => ({total:sessions.filter(s=>s.status==='finished').length,sets:sessions.reduce((a,s)=>a+s.completed_sets,0),last:sessions[0]});

export default function WorkoutApp({mode}:{mode:Mode}) {
  const [view,setView]=useState<View>('home');const [data,setData]=useState<HistoryData>({sessions:[],progress:[]});
  const [detail,setDetail]=useState<SessionDetail|null>(null);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [date,setDate]=useState(todayLocal());const [activeTemplate,setActiveTemplate]=useState('A');const [showNew,setShowNew]=useState(false);
  const [selectedExercise,setSelectedExercise]=useState('elevacao-pelvica');const [saving,setSaving]=useState<string[]>([]);
  const refresh=useCallback(async()=>{const response=await listData(mode);setData(response);},[mode]);
  useEffect(()=>{let alive=true;listData(mode).then(r=>{if(alive)setData(r);}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[mode]);
  const alertError=(e:unknown)=>setError(e instanceof Error?e.message:'Ocorreu um erro.');
  const openWorkout=async(id:string)=>{setBusy(true);setError('');try{const r=await getSession(mode,id);setDetail(r);setView('workout');setShowNew(false);}catch(e){alertError(e);}finally{setBusy(false);}};
  const startWorkout=async()=>{setBusy(true);setError('');try{const id=await createSession(mode,activeTemplate,date);await openWorkout(id);await refresh();}catch(e){alertError(e);}finally{setBusy(false);}};
  const patchSet=async(id:string,changes:Partial<StoredSet>)=>{
    if(!detail)return;const before=detail.sets.find(s=>s.id===id);if(!before)return;
    const next={...before,...changes};const finalWeight=next.weight_kg;
    if(finalWeight!==null&&(!Number.isFinite(finalWeight)||finalWeight<0||finalWeight>2000)){setError('Confira a carga ou a velocidade informada.');return;}
    setDetail(d=>d?{...d,sets:d.sets.map(s=>s.id===id?next:s)}:d);setSaving(s=>[...s,id]);setError('');
    try{await saveSet(mode,id,next.completed,finalWeight);await refresh();}
    catch(e){setDetail(d=>d?{...d,sets:d.sets.map(s=>s.id===id?before:s)}:d);alertError(e);}
    finally{setSaving(s=>s.filter(x=>x!==id));}
  };
  const updateLocalWeight=(id:string,value:string)=>setDetail(d=>d?{...d,sets:d.sets.map(s=>s.id===id?{...s,weight_kg:value===''?null:Number(value)}:s)}:d);
  const saveEditedWeight=(id:string)=>{const s=detail?.sets.find(s=>s.id===id);if(s?.completed)void patchSet(id,{weight_kg:s.weight_kg});};
  const finish=async()=>{
    if(!detail)return;
    const incomplete=detail.sets.filter(s=>!s.completed).length;
    if(incomplete&&!window.confirm(`Ainda faltam ${incomplete} séries. Deseja finalizar mesmo assim?`))return;
    setBusy(true);try{await finishSession(mode,detail.session.id);setDetail(null);setView('home');await refresh();}catch(e){alertError(e);}finally{setBusy(false);}
  };
  const remove=async(id:string)=>{if(!window.confirm('Excluir esta sessão e todas as séries registradas? Esta ação não pode ser desfeita.'))return;setBusy(true);try{await deleteSession(mode,id);if(detail?.session.id===id){setDetail(null);setView('history');}await refresh();}catch(e){alertError(e);}finally{setBusy(false);}};
  const selectView=(next:View)=>{setView(next);setError('');setShowNew(false);if(next!=='workout')setDetail(null);};
  const stats=summary(data.sessions);
  const nav=[{id:'home' as View,label:'Visão geral',Icon:Activity},{id:'history' as View,label:'Histórico',Icon:History},{id:'progress' as View,label:'Evolução',Icon:BarChart3}];
  const allProgress=useMemo(()=>{
    const keys=new Map<string,{key:string,name:string,unit:Unit}>();
    TEMPLATES.forEach(t=>t.exercises.filter(e=>e.unit!=='none').forEach(e=>{if(!keys.has(e.key))keys.set(e.key,{key:e.key,name:e.name,unit:e.unit});}));return [...keys.values()];
  },[]);
  const points=useMemo(()=>data.progress.filter(x=>x.exercise_key===selectedExercise).slice().reverse(),[data.progress,selectedExercise]);
  const chosen=allProgress.find(x=>x.key===selectedExercise);
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-icon"><Dumbbell size={20}/></span><span className="logo-word">ritmo<span>.</span></span></div>
      <p className="sidebar-caption">SEU DIÁRIO DE TREINOS</p>
      <div className="nav-label">SEU ESPAÇO</div>
      <nav className="side-links" aria-label="Navegação principal">{nav.map(n=><button key={n.id} className={`nav-item ${view===n.id?'active':''}`} onClick={()=>selectView(n.id)}><n.Icon size={18}/>{n.label}{view===n.id&&<ChevronRight size={15} className="chev"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="side-daily"><Sparkles size={18}/><div><strong>Projeto Carnaval</strong><span>Constância, um treino por vez.</span></div></div><div className="mode-tag">{mode==='cloud'?<Cloud size={14}/>:<WifiOff size={14}/>} {mode==='cloud'?'Salvando no Neon':'Modo demonstração'}</div>{mode==='cloud'&&<button className="logout-link" onClick={async()=>{await fetch('/api/logout',{method:'POST'});window.location.reload();}}><LogOut size={15}/> Sair</button>}</div>
    </aside>
    <main className="main-area"><header className="topbar"><div className="breadcrumbs"><span>Meu espaço</span><ChevronRight size={13}/><strong>{view==='home'?'Visão geral':view==='history'?'Histórico':view==='progress'?'Evolução':'Treino em andamento'}</strong></div><div className="header-date"><CalendarDays size={15}/>{humanDate(todayLocal())}</div></header>
      <div className="page-content">
      {mode==='demo'&&<div className="demo-banner"><WifiOff size={17}/><span><strong>Modo demonstração:</strong> os registros ficam neste navegador. Para sincronizar com o Neon, configure o banco e as variáveis de ambiente.</span></div>}
      {error&&<div className="message-error" role="alert"><span>{error}</span><button onClick={()=>setError('')}>Fechar</button></div>}
      {loading?<div className="loading"><LoaderCircle className="spin" size={26}/> Carregando seus treinos…</div>:<>
      {view==='home'&&<>
        <div className="hero"><div className="hero-body"><div className="eyebrow"><span className="dot"/> PROJETO CARNAVAL · 12 SEMANAS</div><h1>Um treino de cada vez.<br/><em>Uma evolução de cada vez.</em></h1><p>Registre cada série, acompanhe suas cargas e veja o quanto você já conquistou.</p><button className="btn btn-light" onClick={()=>setShowNew(true)}><Plus size={17}/> Começar treino</button></div><div className="hero-abstract" aria-hidden="true"><div className="circle one"/><div className="circle two"/><div className="circle three"/></div></div>
        <div className="section-heading"><div><p className="overline">SEU DESEMPENHO</p><h2>Seu progresso em números</h2></div></div>
        <div className="stats-grid"><div className="metric-card"><div className="metric-icon"><CheckCircle2 size={20}/></div><strong>{stats.total}</strong><span>Treinos finalizados</span></div><div className="metric-card"><div className="metric-icon"><Dumbbell size={20}/></div><strong>{stats.sets}</strong><span>Séries concluídas</span></div><div className="metric-card"><div className="metric-icon"><CalendarDays size={20}/></div><strong>{stats.last?humanDate(stats.last.performed_on):'—'}</strong><span>Último registro</span></div></div>
        <div className="section-heading space-top"><div><p className="overline">SUA ROTINA</p><h2>Escolha sua ficha</h2></div><span className="small-muted">4 fichas fixas</span></div>
        <div className="templates-grid">{TEMPLATES.map((t)=><TemplateCard key={t.id} t={t} onClick={()=>{setActiveTemplate(t.id);setShowNew(true);}}/>)}</div>
        <div className="section-heading space-top"><div><p className="overline">CONTINUIDADE</p><h2>Últimos treinos</h2></div><button className="text-btn" onClick={()=>selectView('history')}>Ver histórico <ArrowRight size={15}/></button></div>
        <div className="recent-list">{data.sessions.length?data.sessions.slice(0,4).map(s=><SessionRow key={s.id} s={s} onClick={()=>openWorkout(s.id)}/>):<EmptyState title="Seu histórico começa aqui" text="Escolha uma ficha e registre seu primeiro treino."/>}</div>
      </>}
      {view==='history'&&<><PageHeading label="SEU REGISTRO" title="Histórico de treinos" description="Cada sessão fica salva com data, séries realizadas e cargas utilizadas."/><div className="history-toolbar"><span>{data.sessions.length} {data.sessions.length===1?'sessão registrada':'sessões registradas'}</span><button className="btn btn-primary" onClick={()=>setShowNew(true)}><Plus size={16}/> Novo treino</button></div><div className="recent-list">{data.sessions.length?data.sessions.map(s=><SessionRow key={s.id} s={s} onClick={()=>openWorkout(s.id)}/>):<EmptyState title="Nenhum treino registrado" text="Quando você concluir suas séries, elas aparecerão aqui."/>}</div></>}
      {view==='progress'&&<><PageHeading label="EVOLUÇÃO DE CARGAS" title="Sua força, em perspectiva" description="Selecione um exercício para comparar as cargas registradas nas sessões anteriores."/><div className="progress-card"><label className="input-label" htmlFor="exercise-choice">EXERCÍCIO</label><select id="exercise-choice" className="select-input" value={selectedExercise} onChange={e=>setSelectedExercise(e.target.value)}>{allProgress.map(e=><option key={e.key} value={e.key}>{e.name}</option>)}</select><ProgressGraph points={points} unit={chosen?.unit||'kg'}/></div><div className="progress-note"><TrendingUp size={18}/><span>{chosen?.unit==='assist_kg'?'Na barra assistida, menos quilos de assistência significam mais trabalho realizado por você.':'Os valores mostram a maior carga concluída em cada sessão. Só séries marcadas como feitas entram no gráfico.'}</span></div></>}
      {view==='workout'&&detail&&<>
        <button className="back-link" onClick={()=>{setDetail(null);setView('history');void refresh();}}><ArrowLeft size={17}/> Voltar ao histórico</button>
        <div className="workout-heading"><div><p className="overline">FICHA {detail.session.template_id} · {detail.session.status==='finished'?'TREINO FINALIZADO':'TREINO EM ANDAMENTO'}</p><h1>{detail.session.template_name}</h1><p>{getTemplate(detail.session.template_id)?.description}</p></div><div className="workout-head-right"><label className="date-label">DATA<input type="date" value={detail.session.performed_on} disabled /></label></div></div>
        <div className="completion-card"><div><strong>{detail.sets.filter(s=>s.completed).length} de {detail.sets.length} séries</strong><span>concluídas nesta sessão</span></div><span className="completion-pct">{Math.round(100*detail.sets.filter(s=>s.completed).length/Math.max(detail.sets.length,1))}%</span><div className="progress-track"><div style={{width:`${100*detail.sets.filter(s=>s.completed).length/Math.max(detail.sets.length,1)}%`}}/></div></div>
        {detail.session.template_id==='D'&&<div className="hyrox-info"><Footprints size={18}/><div><strong>6 blocos de 500 m</strong><span>Velocidade-alvo de 10 km/h, com pausas conforme necessário. Faça cada estação após sua corrida.</span></div></div>}
        <WorkoutSets detail={detail} saving={saving} patchSet={patchSet} updateLocalWeight={updateLocalWeight} saveEditedWeight={saveEditedWeight}/>
        <div className="workout-footer"><button className="btn btn-danger-outline" disabled={busy} onClick={()=>void remove(detail.session.id)}><Trash2 size={16}/> Excluir registro</button>{detail.session.status==='active'?<button className="btn btn-primary" disabled={busy||saving.length>0} onClick={()=>void finish()}><CheckCircle2 size={17}/> Finalizar treino</button>:<span className="finished-chip"><CheckCircle2 size={17}/> Treino finalizado</span>}</div>
      </>}
      </>}
      </div>
    </main>
    <div className="mobile-nav">{nav.map(n=><button key={n.id} className={view===n.id?'active':''} onClick={()=>selectView(n.id)}><n.Icon size={19}/><span>{n.label}</span></button>)}<button className={view==='workout'?'active':''} onClick={()=>{if(detail){setView('workout');}else{setShowNew(true);}}}><Plus size={19}/><span>Treinar</span></button></div>
    {showNew&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowNew(false);}}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><div><p className="overline">NOVA SESSÃO</p><h2 id="modal-title">Qual treino vamos fazer?</h2></div><button className="close-btn" onClick={()=>setShowNew(false)} aria-label="Fechar">×</button></div><div className="modal-templates">{TEMPLATES.map(t=><button key={t.id} className={`modal-option ${activeTemplate===t.id?'selected':''}`} onClick={()=>setActiveTemplate(t.id)}><span className="template-letter">{t.id}</span><span><strong>{t.name}</strong><small>{t.days}</small></span>{activeTemplate===t.id?<CheckCircle2 size={20}/>:<Circle size={20}/>}</button>)}</div><label className="input-label" htmlFor="new-date">DATA DO TREINO</label><input className="date-input" id="new-date" type="date" value={date} onChange={e=>setDate(e.target.value)}/><button className="btn btn-primary full" disabled={busy||!date} onClick={()=>void startWorkout()}>{busy?<LoaderCircle className="spin" size={17}/>:<ArrowRight size={17}/>} Começar ficha {activeTemplate}</button></div></div>}
  </div>;
}
function TemplateCard({t,onClick}:{t:Template;onClick:()=>void}){return <button className="template-card" onClick={onClick}><div className="template-top"><span className={`template-letter ${t.id==='D'?'lilac':''}`}>{t.id}</span><span className="template-type">{t.category}</span></div><h3>{t.name}</h3><p>{t.days}</p><div className="template-footer"><span>{t.exercises.length} exercícios</span><ArrowRight size={17}/></div></button>;}
function SessionRow({s,onClick}:{s:HistoryData['sessions'][number];onClick:()=>void}){return <button className="session-row" onClick={onClick}><div className="session-icon">{s.template_id==='D'?<Footprints size={19}/>:<Dumbbell size={19}/>}</div><div className="session-text"><strong>{titleFor(s.template_id)}</strong><span>{humanDate(s.performed_on)} · Ficha {s.template_id}</span></div><div className="session-summary"><span className={`status ${s.status}`}>{s.status==='finished'?'Finalizado':'Em andamento'}</span><small>{s.completed_sets}/{s.total_sets} séries</small></div><ChevronRight size={18} className="row-arrow"/></button>;}
function EmptyState({title,text}:{title:string;text:string}){return <div className="empty-state"><div><Clock3 size={22}/></div><strong>{title}</strong><p>{text}</p></div>;}
function PageHeading({label,title,description}:{label:string;title:string;description:string}){return <div className="page-heading"><p className="overline">{label}</p><h1>{title}</h1><p>{description}</p></div>;}
function WorkoutSets({detail,saving,patchSet,updateLocalWeight,saveEditedWeight}:{detail:SessionDetail;saving:string[];patchSet:(id:string,c:Partial<StoredSet>)=>Promise<void>;updateLocalWeight:(id:string,v:string)=>void;saveEditedWeight:(id:string)=>void}){
  const group=detail.sets.reduce<{key:string;name:string;block:number|null;sets:StoredSet[]}[]>((acc,s)=>{let g=acc.find(x=>x.key===s.exercise_key);if(!g){g={key:s.exercise_key,name:s.exercise_name,block:s.block_number,sets:[]};acc.push(g);}g.sets.push(s);return acc;},[]);
  return <div className="exercise-list">{group.map((g,i)=>{
    const first=g.sets[0];const isRun=first.load_unit==='km/h';const allDone=g.sets.every(s=>s.completed);
    const hint= getTemplate(detail.session.template_id)?.exercises.find(e=>e.key===g.key)?.tip;
    return <div className={`exercise-card ${allDone?'is-complete':''}`} key={g.key}>
      <div className="exercise-head"><div className="exercise-numeral">{String(i+1).padStart(2,'0')}</div><div><div className="exercise-tags">{g.block&&<span>BLOCO {g.block}</span>}{isRun&&<span>CORRIDA</span>}</div><h3>{g.name}</h3><p>{g.sets.length} {g.sets.length===1?'série':'séries'} · {first.target_reps}</p></div>{allDone&&<CheckCircle2 size={21} className="exercise-done"/>}</div>
      {hint&&<p className="exercise-tip">{hint}</p>}
      <div className="set-grid">{g.sets.map(s=><div className={`set-line ${s.completed?'checked':''}`} key={s.id}>
        <button className={`check-square ${s.completed?'checked':''}`} aria-label={`Marcar série ${s.set_number} de ${s.exercise_name}`} aria-pressed={s.completed} disabled={saving.includes(s.id)} onClick={()=>void patchSet(s.id,{completed:!s.completed})}>{saving.includes(s.id)?<LoaderCircle size={15} className="spin"/>:s.completed?<Check size={17}/>:null}</button>
        <span className="set-number">Série {s.set_number}</span>
        <span className="set-target">{s.target_reps}</span>
        {s.load_unit==='none'?<span className="bodyweight-label">Peso corporal</span>:<label className="load-field"><input type="number" min="0" max="2000" step="0.5" inputMode="decimal" aria-label={`${s.load_unit==='km/h'?'Velocidade':'Carga'} da série ${s.set_number} de ${s.exercise_name}`} value={s.weight_kg??''} placeholder="—" onChange={e=>updateLocalWeight(s.id,e.target.value)} onBlur={()=>saveEditedWeight(s.id)} /><span>{s.load_unit==='assist_kg'?'kg assist.':s.load_unit}</span></label>}
      </div>)}</div>
    </div>;
  })}</div>;
}
function ProgressGraph({points,unit}:{points:HistoryData['progress'];unit:Unit}){
  if(!points.length)return <div className="chart-empty"><BarChart3 size={29}/><strong>Sem registros para este exercício</strong><p>Marque séries concluídas com carga para visualizar sua evolução.</p></div>;
  const values=points.map(p=>p.weight_kg);const min=Math.min(...values),max=Math.max(...values);const padding=Math.max((max-min)*.2,max*.07,1);const lo=Math.max(0,min-padding),hi=max+padding;
  const W=700,H=235,L=46,R=20,T=25,B=43;const scaleX=(i:number)=>L+(points.length===1?(W-L-R)/2:i*(W-L-R)/(points.length-1));const scaleY=(v:number)=>T+(hi-v)/(hi-lo)*(H-T-B);
  const poly=points.map((p,i)=>`${scaleX(i)},${scaleY(p.weight_kg)}`).join(' ');
  const last=points[points.length-1],first=points[0];const delta=last.weight_kg-first.weight_kg;
  return <><div className="chart-stats"><div><span>Última carga</span><strong>{fmt(last.weight_kg)} <small>{unit==='assist_kg'?'kg':unit}</small></strong></div><div><span>Variação registrada</span><strong>{delta>0?'+':''}{fmt(delta)} <small>{unit==='assist_kg'?'kg':unit}</small></strong></div><div><span>Sessões com registro</span><strong>{points.length}</strong></div></div><div className="svg-scroll"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico de evolução de cargas registradas" className="progress-svg">
    {[0,1,2,3].map(i=><g key={i}><line x1={L} x2={W-R} y1={T+i*(H-T-B)/3} y2={T+i*(H-T-B)/3} stroke="#e8e0e4" strokeDasharray="4 5"/><text x={L-9} y={T+i*(H-T-B)/3+4} textAnchor="end" fill="#8e818c" fontSize="12">{fmt(Math.round((hi-i*(hi-lo)/3)*10)/10)}</text></g>)}
    {points.length>1&&<polyline points={poly} fill="none" stroke="#815f79" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>}
    {points.map((p,i)=><g key={p.session_id}><circle cx={scaleX(i)} cy={scaleY(p.weight_kg)} r="5" fill="#815f79" stroke="#fffdfa" strokeWidth="3"><title>{humanDate(p.performed_on)}: {fmt(p.weight_kg)} {unitName(unit)}</title></circle>{(points.length<=6||i===0||i===points.length-1||i%Math.ceil(points.length/6)===0)&&<text x={scaleX(i)} y={H-13} fontSize="12" textAnchor="middle" fill="#807681">{p.performed_on.slice(5).split('-').reverse().join('/')}</text>}</g>)}
  </svg></div></>;
}
