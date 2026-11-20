'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowLeft, ArrowRight, BarChart3, CalendarDays, Check, CheckCircle2, ChevronRight, Circle, Clock3, Cloud, Dumbbell, Footprints, History, LoaderCircle, LogOut, Plus, RefreshCw, Sparkles, Trash2, TrendingUp, WifiOff, Settings2, Trophy } from 'lucide-react';
import { TEMPLATES, type HistoryData, type SessionDetail, type StoredSet, type Template, type Unit } from '../lib/templates';
import { DEMO_TEMPLATES } from '../lib/demoTemplates';
import { createSession, deleteSession, finishSession, getSession, listData, saveSet, saveSessionGym, saveGoal, type Mode } from '../lib/clientStore';
import { DEFAULT_GOAL, SHOWCASE_GOAL, defaultMemberGoal, goalProgress, isValidGoal, type TrainingGoal } from '../lib/goal';
import TemplateDialog from './TemplateDialog';
import WodDialog from './WodDialog';
import ChallengesView from './ChallengesView';
import type { ChallengeDefinition } from '../lib/challengeTemplates';
import MultiExerciseSelect from './MultiExerciseSelect';
import PrUpdateDialog, { type PrSelection } from './PrUpdateDialog';
import TemplateLoadDialog, {type TemplateLoadSelection} from './TemplateLoadDialog';
import WorkoutShareCard from './WorkoutShareCard';
import PersonalRecords from './PersonalRecords';
import { MODALITIES } from '../lib/personalRecords';
import { BASE_EXERCISES, mergedExerciseCatalog, type CatalogExercise } from '../lib/exerciseCatalog';

type View = 'home' | 'history' | 'progress' | 'prs' | 'challenges' | 'workout';
const todayLocal = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const humanDate = (value:string) => {const [y,m,d]=value.slice(0,10).split('-');return `${d}/${m}/${y}`;};
const formatLong = (s:string) => new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long'}).format(new Date(s+'T12:00:00'));
const fmt = (n:number) => Number.isInteger(n) ? String(n) : n.toLocaleString('pt-BR',{maximumFractionDigits:2});
const unitName = (u:Unit) => u==='assist_kg'?'kg de assistência':u==='km/h'?'km/h':u==='kg'?'kg':'peso corporal';
const sessionDuration=(startedAt:string,finishedAt:string|null,now:number)=>{
  const start=Date.parse(startedAt),end=finishedAt?Date.parse(finishedAt):now;
  if(!Number.isFinite(start)||!Number.isFinite(end))return '00:00:00';
  const seconds=Math.max(0,Math.floor((end-start)/1000));
  return `${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor((seconds%3600)/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
};
export default function WorkoutApp({mode,isOwner=false}:{mode:Mode;isOwner?:boolean}) {
  const [view,setView]=useState<View>('home');const [data,setData]=useState<HistoryData>({sessions:[],progress:[]});
  const [clockNow,setClockNow]=useState(()=>Date.now());
  const [detail,setDetail]=useState<SessionDetail|null>(null);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [date,setDate]=useState(todayLocal());const [currentDate,setCurrentDate]=useState(todayLocal());const [activeTemplate,setActiveTemplate]=useState('A');const [showNew,setShowNew]=useState(false);
  const [selectedExercises,setSelectedExercises]=useState<string[]>(mode==='showcase'?['a1']:[]);
  const [modalityFilter,setModalityFilter]=useState('Todas');const [saving,setSaving]=useState<string[]>([]);
  const visibleTemplates=data.templates??(mode==='showcase'?DEMO_TEMPLATES:TEMPLATES);
  const [inspectedTemplateId,setInspectedTemplateId]=useState<string|null>(null);
  const [creatingTemplate,setCreatingTemplate]=useState(false);
  const [showWod,setShowWod]=useState(false);
  const [applyTarget,setApplyTarget]=useState('');
  const [applyNotice,setApplyNotice]=useState('');
  const [prUpdateMode,setPrUpdateMode]=useState<'prs'|'both'|null>(null);
  const [templateUpdateMode,setTemplateUpdateMode]=useState<'template'|'both'|null>(null);
  const [pendingTemplateLoads,setPendingTemplateLoads]=useState<TemplateLoadSelection[]>([]);
  const [showShare,setShowShare]=useState(false);
  const [sessionGymDraft,setSessionGymDraft]=useState('');
  const [gymSaving,setGymSaving]=useState(false);
  const [sessionGymOverride,setSessionGymOverride]=useState('');
  const inspectedTemplate=visibleTemplates.find(t=>t.id===inspectedTemplateId)||null;
  const openStartFor=(id:string)=>{
    setActiveTemplate(id);setSessionGymOverride(visibleTemplates.find(t=>t.id===id)?.gym_name??'');setInspectedTemplateId(null);setShowNew(true);
  };
  const ensureStart=()=>{
    if(!visibleTemplates.length){setCreatingTemplate(true);return;}
    if(!visibleTemplates.some(t=>t.id===activeTemplate))setActiveTemplate(visibleTemplates[0].id);
    setSessionGymOverride(visibleTemplates.find(t=>t.id===activeTemplate)?.gym_name??'');setShowNew(true);
  };
  const findVisibleTemplate = (id:string) => visibleTemplates.find(t=>t.id===id);
  // Convidados sem meta salva começam até 31/12, sete dias por semana.
  const freshGoal = useMemo<TrainingGoal>(() => defaultMemberGoal(todayLocal()),[]);
  const goal = mode==='showcase'?SHOWCASE_GOAL:(data.goal || (mode==='cloud'?freshGoal:DEFAULT_GOAL));
  const [showGoalEditor,setShowGoalEditor]=useState(false);
  const [goalDraft,setGoalDraft]=useState<TrainingGoal>(DEFAULT_GOAL);
  const openGoalEditor=()=>{setGoalDraft({...goal});setError('');setShowGoalEditor(true);};
  const submitGoal=async()=>{
    if(!isValidGoal(goalDraft)){setError('Confira o nome, o período (até 5 anos) e a frequência (1 a 7 dias por semana).');return;}
    setBusy(true);setError('');
    try{const saved=await saveGoal(mode,goalDraft);setData(prev=>({...prev,goal:saved}));setShowGoalEditor(false);}
    catch(e){alertError(e);}finally{setBusy(false);}
  };
  const refresh=useCallback(async()=>{const response=await listData(mode);setData(response);},[mode]);
  useEffect(()=>{let alive=true;listData(mode).then(r=>{if(alive)setData(r);}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[mode]);
  useEffect(()=>{
    const syncDate=()=>setCurrentDate(todayLocal());
    syncDate();
    const interval=window.setInterval(syncDate,60000);
    window.addEventListener('focus',syncDate);
    return ()=>{window.clearInterval(interval);window.removeEventListener('focus',syncDate);};
  },[]);
  // Sessão usa o timestamp persistido no servidor, não uma contagem local perdida no refresh.
  useEffect(()=>{
    if(view!=='workout'||!detail||detail.session.status!=='active')return;
    setClockNow(Date.now());
    const interval=window.setInterval(()=>setClockNow(Date.now()),1000);
    return ()=>window.clearInterval(interval);
  },[view,detail?.session.id,detail?.session.status]);
  const alertError=(e:unknown)=>setError(e instanceof Error?e.message:'Ocorreu um erro.');
  const openWorkout=async(id:string)=>{setBusy(true);setError('');setApplyNotice('');setApplyTarget('');setPrUpdateMode(null);setTemplateUpdateMode(null);setPendingTemplateLoads([]);setShowShare(false);try{const r=await getSession(mode,id);setDetail(r);setSessionGymDraft(r.session.gym_name??'');setView('workout');setShowNew(false);}catch(e){alertError(e);}finally{setBusy(false);}};
  const startWorkout=async()=>{setBusy(true);setError('');try{const id=await createSession(mode,activeTemplate,date,sessionGymOverride);await openWorkout(id);await refresh();}catch(e){alertError(e);}finally{setBusy(false);}};
  const patchSet=async(id:string,changes:Partial<StoredSet>)=>{
    if(!detail)return;const before=detail.sets.find(s=>s.id===id);if(!before)return;
    const next={...before,...changes};const finalWeight=next.weight_kg;
    if(next.actual_reps!=null&&(!Number.isInteger(next.actual_reps)||next.actual_reps<0||next.actual_reps>10000)){setError('Confira as repetições realizadas.');return;}
    if(finalWeight!==null&&(!Number.isFinite(finalWeight)||finalWeight<0||finalWeight>2000)){setError('Confira a carga ou a velocidade informada.');return;}
    setDetail(d=>d?{...d,sets:d.sets.map(s=>s.id===id?next:s)}:d);setSaving(s=>[...s,id]);setError('');
    try{await saveSet(mode,id,next.completed,finalWeight,next.actual_reps??null);await refresh();}
    catch(e){setDetail(d=>d?{...d,sets:d.sets.map(s=>s.id===id?before:s)}:d);alertError(e);}
    finally{setSaving(s=>s.filter(x=>x!==id));}
  };
  const updateLocalWeight=(id:string,value:string)=>setDetail(d=>d?{...d,sets:d.sets.map(s=>s.id===id?{...s,weight_kg:value===''?null:Number(value)}:s)}:d);
  const saveEditedWeight=(id:string)=>{const s=detail?.sets.find(s=>s.id===id);if(s)void patchSet(id,{weight_kg:s.weight_kg});};
  const updateLocalReps=(id:string,value:string)=>setDetail(d=>d?{...d,sets:d.sets.map(s=>s.id===id?{...s,actual_reps:value===''?null:Number(value)}:s)}:d);
  const saveEditedReps=(id:string)=>{const s=detail?.sets.find(s=>s.id===id);if(s)void patchSet(id,{actual_reps:s.actual_reps});};
  const saveGym=async()=>{
    if(!detail)return;
    setGymSaving(true);setError('');
    try{
      const gym=await saveSessionGym(mode,detail.session.id,sessionGymDraft);
      setDetail(d=>d?{...d,session:{...d.session,gym_name:gym}}:d);
      await refresh();
    }catch(e){alertError(e);}finally{setGymSaving(false);}
  };
  const finish=async()=>{
    if(!detail)return;
    const incomplete=detail.sets.filter(s=>!s.completed).length;
    if(incomplete&&!window.confirm(`Ainda faltam ${incomplete} séries. Deseja finalizar mesmo assim?`))return;
    setBusy(true);try{
      await saveSessionGym(mode,detail.session.id,sessionGymDraft);
      await finishSession(mode,detail.session.id);
      const completed=await getSession(mode,detail.session.id);
      setDetail(completed);
      setSessionGymDraft(completed.session.gym_name??'');
      setView('workout');
      setShowShare(true);
      await refresh();
    }catch(e){alertError(e);}finally{setBusy(false);}
  };
  const applyWorkoutResults=async(updatePRs:boolean,updateTemplate:boolean,choices:PrSelection[]=[],loads:TemplateLoadSelection[]=[])=>{
    if(mode!=='cloud'||!detail||detail.session.status!=='finished')return;
    if(updatePRs&&!choices.length){setError('Selecione os exercícios antes de atualizar os PRs.');return;}
    if(updateTemplate&&!loads.length){setError('Selecione os exercícios antes de atualizar a ficha.');return;}
    const target=detail.session.template_id==='wod'?applyTarget:detail.session.template_id;
    if(updateTemplate&&!visibleTemplates.some(t=>t.id===target)){
      setError('Escolha uma ficha fixa de destino para aplicar as cargas.');return;
    }
    setBusy(true);setError('');setApplyNotice('');
    try{
      const response=await fetch(`/api/sessions/${detail.session.id}/apply`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({update_prs:updatePRs,update_template:updateTemplate,
          ...(updatePRs?{pr_selections:choices}:{}),
          ...(updateTemplate?{target_template_id:target,template_selections:loads}:{})})
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'Não foi possível aplicar o treino.');
      await refresh();
      const pieces=[];
      if(updatePRs)pieces.push(`${result.prs_updated} PR(s) novos ou melhorados dentre ${choices.length} selecionados`);
      if(updateTemplate)pieces.push(`${result.template_loads_changed} carga(s) de ficha atualizada(s)`);
      setApplyNotice(pieces.join(' · ')+'. Nenhuma série histórica foi alterada.');
      setPrUpdateMode(null);setTemplateUpdateMode(null);setPendingTemplateLoads([]);
    }catch(error){alertError(error);}finally{setBusy(false);}
  };
  const remove=async(id:string)=>{if(!window.confirm('Excluir esta sessão e todas as séries registradas? Esta ação não pode ser desfeita.'))return;setBusy(true);try{await deleteSession(mode,id);if(detail?.session.id===id){setDetail(null);setView('history');}await refresh();}catch(e){alertError(e);}finally{setBusy(false);}};
  const selectView=(next:View)=>{setView(next);setError('');setShowNew(false);setShowShare(false);setPrUpdateMode(null);setTemplateUpdateMode(null);setPendingTemplateLoads([]);if(next!=='workout')setDetail(null);};
  const progress=mode==='showcase'?{daysLeft:48,checkins:5,planned:40}:goalProgress(goal,data.sessions,currentDate);

  const startChallenge=async(challenge:ChallengeDefinition,division:string)=>{
    if(mode!=='cloud')throw new Error('Desafios estão disponíveis somente para contas conectadas.');
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/challenges/start',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({challenge_id:challenge.id,division,performed_on:todayLocal()})});
      const payload=await response.json().catch(()=>({})) as {id?:string;error?:string};
      if(!response.ok||!payload.id)throw new Error(payload.error||'Não foi possível iniciar o desafio.');
      await openWorkout(payload.id);await refresh();
    }catch(e){alertError(e);throw e;}finally{setBusy(false);}
  };
  const nav=[{id:'home' as View,label:'Visão geral',Icon:Activity},{id:'history' as View,label:'Histórico',Icon:History},{id:'progress' as View,label:'Evolução',Icon:BarChart3},{id:'prs' as View,label:'PRs',Icon:Trophy},{id:'challenges' as View,label:'Em Outro Ritmo',Icon:Footprints}];
  const allProgress=useMemo(()=>{
    const keys=new Map<string,{key:string;name:string;unit:Unit}>();
    visibleTemplates.forEach(t=>t.exercises.filter(e=>e.unit!=='none').forEach(e=>{if(!keys.has(e.key))keys.set(e.key,{key:e.key,name:e.name,unit:e.unit});}));
    (data.historicalExercises||data.progress.map(p=>({key:p.exercise_key,name:p.exercise_name,unit:p.load_unit}))).forEach(e=>{
      if(!keys.has(e.key))keys.set(e.key,{key:e.key,name:e.name+' (histórico)',unit:e.unit});
    });
    return [...keys.values()];
  },[visibleTemplates,data.historicalExercises,data.progress]);
  const catalogExercises=useMemo(()=>{
    const existing=new Map<string,CatalogExercise>();
    visibleTemplates.forEach(t=>t.exercises.forEach(e=>{if(!existing.has(e.key))existing.set(e.key,{key:e.key,name:e.name,unit:e.unit,modality:'Outros',origin:'existing'});}));
    (data.historicalExercises||[]).forEach(e=>{if(!existing.has(e.key))existing.set(e.key,{key:e.key,name:e.name,unit:e.unit,modality:'Outros',origin:'existing'});});
    return mergedExerciseCatalog([...existing.values()],data.customExercises||[],BASE_EXERCISES);
  },[visibleTemplates,data.historicalExercises,data.customExercises]);
  // Apenas fichas fixas e exercícios adicionados explicitamente aos PRs.
  // Treinos avulsos e exercícios antigos não entram automaticamente nesta página.
  const fixedPrKeys=useMemo(()=>new Set(visibleTemplates.flatMap(t=>t.exercises.map(e=>e.key))),[visibleTemplates]);
  const prExercises=useMemo(()=>{
    const keys=new Map<string,{key:string;name:string;unit:Unit}>();
    visibleTemplates.forEach(t=>t.exercises.forEach(e=>{
      if(!keys.has(e.key))keys.set(e.key,{key:e.key,name:e.name,unit:e.unit});
    }));
    (data.prPinned||[]).forEach(key=>{
      const item=catalogExercises.find(e=>e.key===key);
      if(item&&!keys.has(key))keys.set(key,{key:item.key,name:item.name,unit:item.unit});
    });
    return [...keys.values()];
  },[visibleTemplates,data.prPinned,catalogExercises]);
  const prReferences=useMemo(()=>{
    const map=new Map<string,{weight_kg:number;actual_reps:number|null;target_reps:string;source:'treino'|'ficha'}>();
    for(const s of data.prReferences||[]){
      if(s.weight_kg>0)map.set(s.exercise_key,{weight_kg:s.weight_kg,actual_reps:s.actual_reps,target_reps:s.target_reps,source:'treino'});
    }
    for(const t of visibleTemplates)for(const e of t.exercises){
      if(!map.has(e.key)&&e.defaultLoad!==null&&e.defaultLoad>0
        &&e.unit!=='km/h'&&e.unit!=='assist_kg'){
        map.set(e.key,{weight_kg:e.defaultLoad,actual_reps:null,target_reps:e.target,source:'ficha'});
      }
    }
    return map;
  },[data.prReferences,visibleTemplates]);
  const exerciseCategories=useMemo(()=>new Map((data.exerciseModalities||[]).map(m=>[m.exercise_key,m.modality])),[data.exerciseModalities]);
  const filteredProgress=useMemo(()=>allProgress.filter(e=>modalityFilter==='Todas'||(exerciseCategories.get(e.key)||'Sem categoria')===modalityFilter),[allProgress,modalityFilter,exerciseCategories]);
  const effectiveSelected=selectedExercises.filter(key=>allProgress.some(e=>e.key===key));
  const comparisonSeries=useMemo(()=>effectiveSelected.map(key=>{
    const exercise=allProgress.find(e=>e.key===key)!;
    return {key,name:exercise.name,unit:exercise.unit,
      points:data.progress.filter(p=>p.exercise_key===key).slice().reverse()};
  }),[effectiveSelected.join('|'),allProgress,data.progress]);
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-icon"><Dumbbell size={20}/></span><span className="logo-word">ritmo<span>.</span></span></div>
      <p className="sidebar-caption">SEU DIÁRIO DE TREINOS</p>
      <div className="nav-label">SEU ESPAÇO</div>
      <nav className="side-links" aria-label="Navegação principal">{nav.map(n=><button key={n.id} className={`nav-item ${view===n.id?'active':''}`} onClick={()=>selectView(n.id)}><n.Icon size={18}/>{n.label}{view===n.id&&<ChevronRight size={15} className="chev"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="side-daily"><Sparkles size={18}/><div><strong>{goal.name}</strong><span>Constância, um treino por vez.</span></div></div><div className="mode-tag">{mode==='cloud'?<Cloud size={14}/>:<WifiOff size={14}/>} {mode==='cloud'?'Salvando no Neon':mode==='showcase'?'Dados fictícios e isolados':'Modo demonstração'}</div>{mode==='cloud'&&isOwner&&<a className="logout-link" href="/admin/convites">Gerenciar convites</a>}{mode==='cloud'&&<button className="logout-link" onClick={async()=>{await fetch('/api/logout',{method:'POST'});window.location.reload();}}><LogOut size={15}/> Sair</button>}</div>
    </aside>
    <main className="main-area"><header className="topbar"><div className="breadcrumbs"><span>Meu espaço</span><ChevronRight size={13}/><strong>{view==='home'?'Visão geral':view==='history'?'Histórico':view==='progress'?'Evolução':view==='prs'?'Recordes pessoais':view==='challenges'?'Em Outro Ritmo':'Treino em andamento'}</strong></div><div className="header-date"><CalendarDays size={15}/>{humanDate(todayLocal())}</div></header>
      <div className="page-content">
      {mode==='showcase'&&<div className="demo-banner"><WifiOff size={17}/><span><strong>Perfil de demonstração:</strong> cinco treinos fictícios. Alterações feitas aqui ficam apenas neste navegador, sem acesso ao banco real.</span></div>}
      {mode==='demo'&&<div className="demo-banner"><WifiOff size={17}/><span><strong>Modo demonstração:</strong> os registros ficam neste navegador. Para sincronizar com o Neon, configure o banco e as variáveis de ambiente.</span></div>}
      {error&&<div className="message-error" role="alert"><span>{error}</span><button onClick={()=>setError('')}>Fechar</button></div>}
      {loading?<div className="loading"><LoaderCircle className="spin" size={26}/> Carregando seus treinos…</div>:<>
      {view==='home'&&<>
        <div className="hero"><div className="hero-body"><div className="eyebrow"><span className="dot"/> {goal.name.toLocaleUpperCase('pt-BR')}</div><h1>Um treino de cada vez.<br/><em>Uma evolução de cada vez.</em></h1><p>Registre cada série, acompanhe suas cargas e veja o quanto você já conquistou.</p><div className="hero-actions"><button className="btn btn-light" onClick={ensureStart}><Plus size={17}/> Começar treino</button>
            {mode==='cloud'&&<button className="btn btn-wod" onClick={()=>setShowWod(true)}><Dumbbell size={17}/> Treino do dia / WOD</button>}</div></div><div className="hero-abstract" aria-hidden="true"><div className="circle one"/><div className="circle two"/><div className="circle three"/></div></div>
        <div className="goal-area"><div className="carnival-counters" aria-label="Contagem e check-ins da meta"><div className="carnival-counter"><strong>{progress.daysLeft} {progress.daysLeft===1?'dia':'dias'}</strong></div><div className="carnival-counter"><strong>{progress.checkins}/{progress.planned} treinos</strong></div></div>{mode==='cloud'&&<button type="button" className="goal-edit-btn" onClick={openGoalEditor} aria-label="Editar sua meta"><Settings2 size={16}/> Editar meta</button>}</div>
        <div className="section-heading space-top"><div><p className="overline">SUA ROTINA</p><h2>Suas fichas</h2></div><div className="template-toolbar"><span className="small-muted">{visibleTemplates.length} {visibleTemplates.length===1?'ficha':'fichas'}</span><button type="button" className="btn btn-primary template-add-btn" onClick={()=>setCreatingTemplate(true)}><Plus size={15}/> Nova ficha</button></div></div>
        <div className="templates-grid">{visibleTemplates.map((t)=><TemplateCard key={t.id} t={t} onClick={()=>setInspectedTemplateId(t.id)}/>)}</div>
        {!visibleTemplates.length&&<EmptyState title="Nenhuma ficha cadastrada" text="Crie sua primeira ficha para registrar os treinos."/>}
        <div className="section-heading space-top"><div><p className="overline">CONTINUIDADE</p><h2>Últimos treinos</h2></div><button className="text-btn" onClick={()=>selectView('history')}>Ver histórico <ArrowRight size={15}/></button></div>
        <div className="recent-list">{data.sessions.length?data.sessions.slice(0,4).map(s=><SessionRow key={s.id} s={s} showcase={mode==='showcase'} onClick={()=>openWorkout(s.id)}/>):<EmptyState title="Seu histórico começa aqui" text="Escolha uma ficha e registre seu primeiro treino."/>}</div>
      </>}
      {view==='history'&&<><PageHeading label="SEU REGISTRO" title="Histórico de treinos" description="Cada sessão fica salva com data, séries realizadas e cargas utilizadas."/><div className="history-toolbar"><span>{data.sessions.length} {data.sessions.length===1?'sessão registrada':'sessões registradas'}</span><div className="history-actions"><button className="btn btn-primary" onClick={ensureStart}><Plus size={16}/> Novo treino</button>{mode==='cloud'&&<button className="btn btn-outline-template" onClick={()=>setShowWod(true)}>Treino do dia / WOD</button>}</div></div><div className="recent-list">{data.sessions.length?data.sessions.map(s=><SessionRow key={s.id} s={s} showcase={mode==='showcase'} onClick={()=>openWorkout(s.id)}/>):<EmptyState title="Nenhum treino registrado" text="Quando você concluir suas séries, elas aparecerão aqui."/>}</div></>}
      {view==='challenges'&&<ChallengesView onStart={startChallenge} disabled={busy||mode!=='cloud'}/>}
      {view==='progress'&&<><PageHeading label="EVOLUÇÃO DE CARGAS" title="Sua força, em perspectiva" description="Selecione vários exercícios para comparar sua evolução no mesmo gráfico."/><div className="progress-card"><div className="progress-filters"><label className="input-label" htmlFor="exercise-modality">MODALIDADE<select id="exercise-modality" className="select-input" value={modalityFilter} onChange={e=>setModalityFilter(e.target.value)}><option>Todas</option><option>Sem categoria</option>{MODALITIES.map(m=><option key={m}>{m}</option>)}</select></label><MultiExerciseSelect label="EXERCÍCIOS PARA COMPARAR" options={filteredProgress} selectedKeys={effectiveSelected}
 onToggle={key=>setSelectedExercises(old=>old.includes(key)?old.filter(x=>x!==key):[...old,key])}
 max={Math.max(1,filteredProgress.length)} placeholder="Pesquisar exercícios para o gráfico"/></div><ProgressComparisonGraph series={comparisonSeries}/></div><div className="progress-note"><TrendingUp size={18}/><span>O gráfico composto compara a variação percentual desde a primeira carga registrada de cada exercício. Somente séries concluídas aparecem; cargas de assistência menores indicam evolução.</span></div></>}
      {view==='prs'&&<><PageHeading label="RECORDES PESSOAIS" title="Seus PRs" description="Registre sua melhor série, consulte o 1RM estimado e planeje a carga conforme as repetições. Classifique os exercícios e filtre por modalidade."/><PersonalRecords mode={mode} exercises={prExercises} catalog={catalogExercises} pinnedKeys={data.prPinned||[]} fixedKeys={[...fixedPrKeys]} references={prReferences} records={data.personalRecords||[]} modalities={data.exerciseModalities||[]} onChanged={refresh}/></>}
      {view==='workout'&&detail&&<>
        <button className="back-link" onClick={()=>{setDetail(null);setView('history');void refresh();}}><ArrowLeft size={17}/> Voltar ao histórico</button>
        <div className="workout-heading"><div><p className="overline">{detail.session.template_id==='wod'?'TREINO DO DIA · WOD':/^[A-Z]$/.test(detail.session.template_id)?`FICHA ${detail.session.template_id}`:'FICHA PERSONALIZADA'} · {detail.session.status==='finished'?'TREINO FINALIZADO':'TREINO EM ANDAMENTO'}</p><h1>{detail.session.template_name}</h1><p>{findVisibleTemplate(detail.session.template_id)?.description}</p></div><div className="workout-head-right">
          <div className="workout-timer" aria-label="Duração transcorrida do treino">
            <Clock3 size={17} aria-hidden="true"/>
            <span><small>{detail.session.status==='active'?'TEMPO DE TREINO':'DURAÇÃO DO TREINO'}</small>
              <strong>{sessionDuration(detail.session.started_at,detail.session.finished_at,clockNow)}</strong>
            </span>
          </div>
          <label className="date-label">DATA<input type="date" value={detail.session.performed_on} disabled /></label>
        </div></div>
        <div className="workout-gym-field"><label htmlFor="workout-gym">ACADEMIA / LOCAL DO TREINO (OPCIONAL)</label>
          <div><input id="workout-gym" maxLength={100} value={sessionGymDraft} onChange={e=>setSessionGymDraft(e.target.value)} placeholder="Onde você treinou?"/>
            <button type="button" className="btn btn-outline-template" disabled={gymSaving||busy||sessionGymDraft.trim()===(detail.session.gym_name??'')}
              onClick={()=>void saveGym()}>{gymSaving?'Salvando…':'Salvar local'}</button></div>
          <small>Local registrado somente nesta sessão. Você escolhe se aparece no card.</small>
        </div>
        <div className="completion-card"><div><strong>{detail.sets.filter(s=>s.completed).length} de {detail.sets.length} séries</strong><span>concluídas nesta sessão</span></div><span className="completion-pct">{Math.round(100*detail.sets.filter(s=>s.completed).length/Math.max(detail.sets.length,1))}%</span><div className="progress-track"><div style={{width:`${100*detail.sets.filter(s=>s.completed).length/Math.max(detail.sets.length,1)}%`}}/></div></div>
        {mode!=='showcase'&&detail.session.template_name==='HYROX adaptado'&&detail.sets.some(s=>s.load_unit==='km/h')&&<div className="hyrox-info"><Footprints size={18}/><div><strong>6 blocos de 500 m</strong><span>Velocidade-alvo de 10 km/h, com pausas conforme necessário. Faça cada estação após sua corrida.</span></div></div>}
        <WorkoutSets detail={detail} template={findVisibleTemplate(detail.session.template_id)} saving={saving} patchSet={patchSet} updateLocalWeight={updateLocalWeight} saveEditedWeight={saveEditedWeight} updateLocalReps={updateLocalReps} saveEditedReps={saveEditedReps}/>

        {detail.session.status==='finished'&&<div className="post-workout-share-invite">
          <div><p className="overline">COMPARTILHE SUA CONQUISTA</p>
            <h3>Mais um treino no seu ritmo.</h3>
            <p>Crie uma arte para Stories. Nada é publicado sem você escolher.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={()=>setShowShare(true)}>Criar card do treino</button>
        </div>}
        {detail.session.status==='finished'&&mode==='cloud'&&<div className="post-workout-panel">
          <div><p className="overline">APÓS O TREINO</p><h3>Aplicar seus resultados</h3></div>
          <p>Escolha quais exercícios terão seus PRs atualizados, inclusive resultados de séries parciais. Uma marca inferior não substitui seu melhor PR. Atualizar ficha altera apenas as cargas futuras, sem reescrever o histórico.</p>
          {detail.session.template_id==='wod'&&visibleTemplates.length>0&&
            <label>FICHA DE DESTINO PARA CARGAS
              <select value={applyTarget} onChange={event=>setApplyTarget(event.target.value)}>
                <option value="">Escolha uma ficha fixa</option>
                {visibleTemplates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>}
          {detail.session.template_id==='wod'&&visibleTemplates.length===0&&
            <p>Você ainda não possui uma ficha fixa para atualizar. Pode atualizar os PRs deste WOD normalmente.</p>}
          <div className="post-workout-buttons">
            <button type="button" className="btn btn-outline-template" disabled={busy}
              onClick={()=>setPrUpdateMode('prs')}>Atualizar PRs</button>
            <button type="button" className="btn btn-outline-template" disabled={busy||!visibleTemplates.some(t=>t.id===(detail.session.template_id==='wod'?applyTarget:detail.session.template_id))}
              onClick={()=>setTemplateUpdateMode('template')}>Atualizar ficha</button>
            <button type="button" className="btn btn-primary" disabled={busy||!visibleTemplates.some(t=>t.id===(detail.session.template_id==='wod'?applyTarget:detail.session.template_id))}
              onClick={()=>setTemplateUpdateMode('both')}>Atualizar ficha e PRs</button>
          </div>
          {applyNotice&&<p className="post-workout-confirmation" role="status"><CheckCircle2 size={16}/>{applyNotice}</p>}
        </div>}
        <div className="workout-footer"><button className="btn btn-danger-outline" disabled={busy} onClick={()=>void remove(detail.session.id)}><Trash2 size={16}/> Excluir registro</button>{detail.session.status==='active'?<button className="btn btn-primary" disabled={busy||saving.length>0} onClick={()=>void finish()}><CheckCircle2 size={17}/> Finalizar treino</button>:<span className="finished-chip"><CheckCircle2 size={17}/> Treino finalizado</span>}</div>
      </>}
      </>}
      </div>
    </main>
    <div className="mobile-nav">{nav.map(n=><button key={n.id} className={view===n.id?'active':''} onClick={()=>selectView(n.id)}><n.Icon size={19}/><span>{n.label}</span></button>)}<button className={view==='workout'?'active':''} onClick={()=>{if(detail){setView('workout');}else{ensureStart();}}}><Plus size={19}/><span>Treinar</span></button></div>
    {showGoalEditor&&mode==='cloud'&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowGoalEditor(false);}}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="goal-modal-title"><div className="modal-head"><div><p className="overline">SEU OBJETIVO</p><h2 id="goal-modal-title">Definir minha meta</h2></div><button type="button" className="close-btn" onClick={()=>setShowGoalEditor(false)} aria-label="Fechar">×</button></div>
      <div className="goal-form"><label htmlFor="goal-name">NOME DA META<input id="goal-name" maxLength={60} value={goalDraft.name} onChange={e=>setGoalDraft(g=>({...g,name:e.target.value}))} placeholder="Ex.: Projeto 2027"/></label>
      <div className="goal-date-grid"><label htmlFor="goal-start">DATA INICIAL<input id="goal-start" type="date" value={goalDraft.starts_on} onChange={e=>setGoalDraft(g=>({...g,starts_on:e.target.value}))}/></label><label htmlFor="goal-end">DATA FINAL<input id="goal-end" type="date" value={goalDraft.ends_on} onChange={e=>setGoalDraft(g=>({...g,ends_on:e.target.value}))}/></label></div>
      <label htmlFor="goal-weekly">TREINOS POR SEMANA<select id="goal-weekly" value={goalDraft.workouts_per_week} onChange={e=>setGoalDraft(g=>({...g,workouts_per_week:Number(e.target.value)}))}>{[1,2,3,4,5,6,7].map(n=><option key={n} value={n}>{n} {n===1?'treino':'treinos'} por semana</option>)}</select></label>
      <p>O total considera segunda a domingo e semanas parciais. O histórico de treinos não é apagado quando você muda de meta.</p>
      <button className="btn btn-primary full" type="button" disabled={busy} onClick={()=>void submitGoal()}>{busy?<LoaderCircle size={17} className="spin"/>:<Check size={17}/>} Salvar meta</button></div></div></div>}
    {showShare&&detail&&detail.session.status==='finished'&&
      <WorkoutShareCard detail={detail} onClose={()=>setShowShare(false)}/>}
    {templateUpdateMode&&detail&&mode==='cloud'&&visibleTemplates.some(t=>t.id===(detail.session.template_id==='wod'?applyTarget:detail.session.template_id))&&
      <TemplateLoadDialog key={detail.session.id+templateUpdateMode} detail={detail}
        template={visibleTemplates.find(t=>t.id===(detail.session.template_id==='wod'?applyTarget:detail.session.template_id))!}
        busy={busy} combined={templateUpdateMode==='both'} onClose={()=>setTemplateUpdateMode(null)}
        onConfirm={async loads=>{
          if(templateUpdateMode==='both'){
            setPendingTemplateLoads(loads);setTemplateUpdateMode(null);setPrUpdateMode('both');
          }else await applyWorkoutResults(false,true,[],loads);
        }}/>}
    {prUpdateMode&&detail&&mode==='cloud'&&<PrUpdateDialog key={detail.session.id+prUpdateMode}
      detail={detail} includeTemplate={prUpdateMode==='both'} busy={busy}
      onClose={()=>setPrUpdateMode(null)}
      onConfirm={async choices=>applyWorkoutResults(true,prUpdateMode==='both',choices,pendingTemplateLoads)}/>}
    {showWod&&mode==='cloud'&&<WodDialog mode={mode} catalog={catalogExercises} initialDate={todayLocal()} onChanged={refresh}
      onClose={()=>setShowWod(false)} onStarted={async id=>{setShowWod(false);await openWorkout(id);await refresh();}}/>}
    {(creatingTemplate||inspectedTemplate)&&<TemplateDialog key={creatingTemplate?'new-template':inspectedTemplate!.id} template={creatingTemplate?null:inspectedTemplate} mode={mode}
      onClose={()=>{setCreatingTemplate(false);setInspectedTemplateId(null);}}
      onChanged={refresh} onStart={openStartFor} catalog={catalogExercises}/>}
    {showNew&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowNew(false);}}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><div><p className="overline">NOVA SESSÃO</p><h2 id="modal-title">Qual treino vamos fazer?</h2></div><button className="close-btn" onClick={()=>setShowNew(false)} aria-label="Fechar">×</button></div><div className="modal-templates">{visibleTemplates.map(t=><button key={t.id} className={`modal-option ${activeTemplate===t.id?'selected':''}`} onClick={()=>{setActiveTemplate(t.id);setSessionGymOverride(t.gym_name??'');}}><span className="template-letter">{/^[A-Z]$/.test(t.id)?t.id:t.name.slice(0,1).toUpperCase()}</span><span><strong>{t.name}</strong><small>{t.days}</small></span>{activeTemplate===t.id?<CheckCircle2 size={20}/>:<Circle size={20}/>}</button>)}</div><label className="input-label" htmlFor="new-date">DATA DO TREINO</label><input className="date-input" id="new-date" type="date" value={date} onChange={e=>setDate(e.target.value)}/><label className="input-label" htmlFor="new-gym">ACADEMIA / LOCAL (OPCIONAL)</label><input className="date-input" id="new-gym" maxLength={100} value={sessionGymOverride} placeholder="Ex.: Minha academia" onChange={e=>setSessionGymOverride(e.target.value)}/><button className="btn btn-primary full" disabled={busy||!date||visibleTemplates.length===0} onClick={()=>void startWorkout()}>{busy?<LoaderCircle className="spin" size={17}/>:<ArrowRight size={17}/>} Começar treino</button></div></div>}
  </div>;
}
function TemplateCard({t,onClick}:{t:Template;onClick:()=>void}){return <button className="template-card" onClick={onClick}><div className="template-top"><span className={`template-letter ${t.id==='D'?'lilac':''}`}>{/^[A-Z]$/.test(t.id)?t.id:t.name.slice(0,1).toUpperCase()}</span><span className="template-type">{t.category}</span></div><h3>{t.name}</h3><p>{t.days}</p><div className="template-footer"><span>{t.exercises.length} exercícios · Ver ficha</span><ArrowRight size={17}/></div></button>;}
function SessionRow({s,onClick,showcase}:{s:HistoryData['sessions'][number];onClick:()=>void;showcase:boolean}){
  // Nunca expor identificadores internos como custom-UUID no histórico visível.
  const label=s.template_id==='wod'?'Treino avulso · WOD':
    /^[A-Z]$/.test(s.template_id)?`Ficha ${s.template_id}`:'Ficha personalizada';
  return <button className="session-row" onClick={onClick}>
    <div className="session-icon">{s.template_id==='D'&&!showcase?<Footprints size={19}/>:<Dumbbell size={19}/>}</div>
    <div className="session-text"><strong>{s.template_name}</strong>
      <span>{humanDate(s.performed_on)} <span className="session-meta-dot" aria-hidden="true">·</span> {label}</span></div>
    <div className="session-summary"><span className={`status ${s.status}`}>{s.status==='finished'?'Finalizado':'Em andamento'}</span>
      <small>{s.completed_sets}/{s.total_sets} séries</small></div>
    <ChevronRight size={18} className="row-arrow"/>
  </button>;
}
function EmptyState({title,text}:{title:string;text:string}){return <div className="empty-state"><div><Clock3 size={22}/></div><strong>{title}</strong><p>{text}</p></div>;}
function PageHeading({label,title,description}:{label:string;title:string;description:string}){return <div className="page-heading"><p className="overline">{label}</p><h1>{title}</h1><p>{description}</p></div>;}
function WorkoutSets({detail,template,saving,patchSet,updateLocalWeight,saveEditedWeight,updateLocalReps,saveEditedReps}:{detail:SessionDetail;template:Template|undefined;saving:string[];patchSet:(id:string,c:Partial<StoredSet>)=>Promise<void>;updateLocalWeight:(id:string,v:string)=>void;saveEditedWeight:(id:string)=>void;updateLocalReps:(id:string,v:string)=>void;saveEditedReps:(id:string)=>void}){
  const group=detail.sets.reduce<{key:string;name:string;block:number|null;sets:StoredSet[]}[]>((acc,s)=>{let g=acc.find(x=>x.key===s.exercise_key);if(!g){g={key:s.exercise_key,name:s.exercise_name,block:s.block_number,sets:[]};acc.push(g);}g.sets.push(s);return acc;},[]);
  return <div className="exercise-list">{group.map((g,i)=>{
    const first=g.sets[0];const isRun=first.load_unit==='km/h';const allDone=g.sets.every(s=>s.completed);
    const hint=template?.exercises.find(e=>e.key===g.key)?.tip;
    return <div className={`exercise-card ${allDone?'is-complete':''}`} key={g.key}>
      <div className="exercise-head"><div className="exercise-numeral">{String(i+1).padStart(2,'0')}</div><div><div className="exercise-tags">{g.block&&<span>BLOCO {g.block}</span>}{isRun&&<span>CORRIDA</span>}</div><h3>{g.name}</h3><p>{g.sets.length} {g.sets.length===1?'série':'séries'} · {first.target_reps}</p></div>{allDone&&<CheckCircle2 size={21} className="exercise-done"/>}</div>
      {hint&&<p className="exercise-tip">{hint}</p>}
      <div className="set-grid">{g.sets.map(s=><div className={`set-line ${s.completed?'checked':''}`} key={s.id}>
        <button className={`check-square ${s.completed?'checked':''}`} aria-label={`Marcar série ${s.set_number} de ${s.exercise_name}`} aria-pressed={s.completed} disabled={saving.includes(s.id)} onClick={()=>void patchSet(s.id,{completed:!s.completed})}>{saving.includes(s.id)?<LoaderCircle size={15} className="spin"/>:s.completed?<Check size={17}/>:null}</button>
        <span className="set-number">Série {s.set_number}</span>
        <span className="set-target">{s.target_reps}</span>
        <label className="reps-field"><input type="number" min="0" max="10000" step="1" inputMode="numeric" aria-label={`Repetições realizadas da série ${s.set_number} de ${s.exercise_name}`} value={s.actual_reps??''} placeholder="—" onChange={e=>updateLocalReps(s.id,e.target.value)} onBlur={()=>saveEditedReps(s.id)} /><span>reps feitas</span></label>
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

// Comparação multi-exercício: evolução percentual por exercício, sem misturar kg e km/h na mesma escala.
function ProgressComparisonGraph({series}:{series:{key:string;name:string;unit:Unit;points:HistoryData['progress']}[]}){
  const active=series.filter(s=>s.points.length>0);
  if(!series.length)return <div className="chart-empty"><BarChart3 size={29}/><strong>Escolha exercícios para comparar</strong><p>Abra o seletor acima e marque até oito exercícios.</p></div>;
  if(!active.length)return <div className="chart-empty"><BarChart3 size={29}/><strong>Sem cargas registradas</strong><p>Escolha exercícios com séries concluídas para visualizar a progressão.</p></div>;
  const colors=['#78506f','#4a7885','#b08252','#778a64','#a45b7e','#5f659f','#bc806e','#567d75'];
  const times=active.flatMap(s=>s.points.map(p=>Date.parse(p.performed_on+'T12:00:00Z'))).filter(Number.isFinite);
  const minTime=Math.min(...times),maxTime=Math.max(...times);
  const withBase=active.map(s=>{
    const baseline=s.points.find(p=>p.weight_kg>0)?.weight_kg||null;
    return {...s,baseline,values:s.points.map(p=>({
      ...p,change:baseline?(p.weight_kg/baseline-1)*100:0,
      time:Date.parse(p.performed_on+'T12:00:00Z')
    }))};
  });
  const vals=withBase.flatMap(s=>s.values.map(v=>v.change));
  const low=Math.min(0,...vals),high=Math.max(0,...vals);
  const range=Math.max(high-low,10),lo=low-range*.12,hi=high+range*.12;
  const W=720,H=265,L=64,R=25,T=22,B=42;
  const sx=(t:number)=>L+(maxTime===minTime?(W-L-R)/2:(t-minTime)/(maxTime-minTime)*(W-L-R));
  const sy=(v:number)=>T+(hi-v)/(hi-lo)*(H-T-B);
  const formatDate=(t:number)=>new Date(t).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',timeZone:'UTC'});
  return <div className="comparison-chart">
    <div className="comparison-legend">
      {series.map((s,i)=><div key={s.key} className="comparison-legend-item">
        <span style={{background:colors[i%colors.length]}}/>
        <strong>{s.name}</strong><small>{s.unit==='assist_kg'?'assistência (kg)':s.unit} · {s.points.length} registros</small>
      </div>)}
    </div>
    <div className="svg-scroll"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Comparação da evolução percentual de cargas por exercício" className="progress-svg">
      {[0,1,2,3,4].map(i=>{const y=T+i*(H-T-B)/4,value=hi-i*(hi-lo)/4;return <g key={i}>
        <line x1={L} x2={W-R} y1={y} y2={y} stroke="#e8dfe5" strokeDasharray="4 5"/>
        <text x={L-10} y={y+4} fontSize="12" textAnchor="end" fill="#8b808b">{fmt(value)}%</text>
      </g>})}
      {withBase.map((s,i)=><g key={s.key}>
        {s.values.length>1&&<polyline fill="none" stroke={colors[i%colors.length]} strokeWidth="3" strokeLinejoin="round"
          points={s.values.map(p=>`${sx(p.time)},${sy(p.change)}`).join(' ')}/>}
        {s.values.map(p=><circle key={p.session_id} cx={sx(p.time)} cy={sy(p.change)} r="5" stroke="#fffdfa" strokeWidth="2" fill={colors[i%colors.length]}>
          <title>{s.name}: {humanDate(p.performed_on)} · {fmt(p.weight_kg)} {unitName(s.unit)} · {p.change>=0?'+':''}{fmt(p.change)}%</title>
        </circle>)}
      </g>)}
      <text x={L} y={H-10} fontSize="12" fill="#827681">{formatDate(minTime)}</text>
      <text x={W-R} y={H-10} textAnchor="end" fontSize="12" fill="#827681">{formatDate(maxTime)}</text>
    </svg></div>
    <p className="comparison-footnote">Cada linha começa em 0% na primeira carga válida. O gráfico não soma cargas de exercícios diferentes.</p>
  </div>;
}
