import type { SessionDetail } from './templates';

export type ShareMetric='time'|'exerciseCount'|'sets'|'volume';
export type ShareOptions={
  showWorkoutName:boolean;
  showGymName:boolean;
  showDate:boolean;
  showExercises:boolean;
  showExerciseTargets:boolean;
  metrics:Record<ShareMetric,boolean>;
};
export type ExerciseSummary={key:string;name:string;target:string;completedSets:number;totalSets:number};
export type ShareSummary={
  elapsed:string;
  exerciseCount:number;
  completedSets:number;
  volumeKg:number|null;
  volumePartial:boolean;
  exercises:ExerciseSummary[];
};
export const DEFAULT_SHARE_OPTIONS:ShareOptions={
  showWorkoutName:false,showGymName:false,showDate:false,showExercises:false,showExerciseTargets:false,
  metrics:{time:true,exerciseCount:false,sets:false,volume:true}
};
export const formatVolume=(value:number)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(value)+' kg';

export function workoutShareSummary(detail:SessionDetail):ShareSummary{
  const start=Date.parse(detail.session.started_at),finish=Date.parse(detail.session.finished_at||'');
  const elapsedSec=Number.isFinite(start)&&Number.isFinite(finish)?
    Math.max(0,Math.floor((finish-start)/1000)):0;
  const elapsed=`${String(Math.floor(elapsedSec/3600)).padStart(2,'0')}:${String(Math.floor(elapsedSec%3600/60)).padStart(2,'0')}`;
  const ordered=[...detail.sets].sort((a,b)=>a.sort_order-b.sort_order||a.set_number-b.set_number);
  const exercises=new Map<string,ExerciseSummary>();
  let volume=0,measured=0,missing=0;
  for(const set of ordered){
    const existing=exercises.get(set.exercise_key);
    if(existing){
      existing.totalSets++;
      if(set.completed)existing.completedSets++;
    }else{
      exercises.set(set.exercise_key,{
        key:set.exercise_key,name:set.exercise_name,target:set.target_reps,
        completedSets:set.completed?1:0,totalSets:1
      });
    }
    // Volume = carga externa (kg) x repetições EFETIVAMENTE realizadas.
    // Contabilizar série parcial anotada, sem exigir o checkbox de conclusão.
    // Excluir velocidade, assistência e cargas apenas planejadas na ficha.
    if(set.load_unit!=='kg'||typeof set.weight_kg!=='number'||
      !Number.isFinite(set.weight_kg)||set.weight_kg<=0)continue;
    const actual=set.actual_reps;
    if(typeof actual==='number'&&Number.isInteger(actual)&&actual>0){
      volume+=set.weight_kg*actual;
      measured++;
    }else if(set.completed)missing++;
  }
  return {
    elapsed,exerciseCount:exercises.size,completedSets:detail.sets.filter(s=>s.completed).length,
    volumeKg:measured?Math.round(volume*100)/100:null,
    volumePartial:missing>0,
    exercises:[...exercises.values()]
  };
}
export const shareMetricValues=(summary:ShareSummary,options:ShareOptions)=>{
  const entries:{key:ShareMetric;label:string;value:string}[]=[];
  if(options.metrics.time)entries.push({key:'time',label:'TEMPO',value:summary.elapsed});
  if(options.metrics.exerciseCount)entries.push({key:'exerciseCount',label:'EXERCÍCIOS',value:String(summary.exerciseCount)});
  if(options.metrics.sets)entries.push({key:'sets',label:'SÉRIES FEITAS',value:String(summary.completedSets)});
  if(options.metrics.volume){
    // Dados insuficientes não autorizam preencher volume manualmente ou inventá-lo.
    // Mostrar o campo sem valor mantém fiel a escolha de duas informações por padrão.
    entries.push({key:'volume',label:'VOLUME (KG)',value:summary.volumeKg===null?'—':formatVolume(summary.volumeKg)});
  }
  return entries;
};
export type ShareVisual='verde-escura'|'verde-clara'|'malva'|'clara'|'escura';
export type ShareLayout='treino'|'pr'|'semana'|'mes'|'todas';
export const SHARE_PALETTES=[
  {key:'verde-escura',label:'Verde escura'},
  {key:'verde-clara',label:'Verde clara'},
  {key:'malva',label:'Malva'},
  {key:'clara',label:'Clara'},
  {key:'escura',label:'Escura'}
] as const;
export const SHARE_LAYOUTS=[
  {key:'treino',label:'Só treino'},
  {key:'pr',label:'PR batido'},
  {key:'semana',label:'Semana no ritmo'},
  {key:'mes',label:'Mês no ritmo'},
  {key:'todas',label:'PR, semana e mês'}
] as const;
export const SHARE_THEMES={
  dark:{
    gradient:['#463047','#684b62','#93738a'],
    ring:'rgba(255,255,255,.09)',logo:'#f9eff5',subtitle:'#d9bfd0',
    kicker:'#efdae7',headline:'#fffafc',secondary:'#e5d1dd',
    metricsBackground:'rgba(255,250,252,.10)',metricLabel:'#f1dce7',
    metricValue:'#fffafc',exerciseHeading:'#e8d6e1',
    exerciseText:'#fffafc',extra:'#ebd5e2',footer:'#ead3e1'
  },
  light:{
    gradient:['#fffdfa','#f6f0f3','#eaddE6'],
    ring:'rgba(98,70,93,.12)',logo:'#4b3547',subtitle:'#76586f',
    kicker:'#74556d',headline:'#28242d',secondary:'#664a60',
    metricsBackground:'rgba(103,76,98,.09)',metricLabel:'#74566f',
    metricValue:'#302733',exerciseHeading:'#664a60',
    exerciseText:'#362b38',extra:'#75586d',footer:'#71586c'
  },
  'verde-escura':{
    gradient:["#1d4238","#356552","#62806c"],ring:'rgba(241,252,245,.13)',logo:'#f8f6ed',subtitle:'#d4e5da',
    kicker:'#d4e5da',headline:'#f8f6ed',secondary:'#d4e5da',metricsBackground:'rgba(250,255,249,.13)',
    metricLabel:'#d4e5da',metricValue:'#f8f6ed',exerciseHeading:'#d4e5da',
    exerciseText:'#f8f6ed',extra:'#d4e5da',footer:'#d4e5da'
  },
  'verde-clara':{
    gradient:["#edf5e9","#d4e5d5","#b9d3c1"],ring:'rgba(35,86,68,.13)',logo:'#244c3e',subtitle:'#487262',
    kicker:'#487262',headline:'#244c3e',secondary:'#487262',metricsBackground:'rgba(40,93,72,.10)',
    metricLabel:'#487262',metricValue:'#244c3e',exerciseHeading:'#487262',
    exerciseText:'#244c3e',extra:'#487262',footer:'#487262'
  },
  malva:{
    gradient:["#684c67","#866983","#a78a9e"],ring:'rgba(255,255,255,.13)',logo:'#fff6fb',subtitle:'#f0dce9',
    kicker:'#f0dce9',headline:'#fff6fb',secondary:'#f0dce9',metricsBackground:'rgba(255,255,255,.13)',
    metricLabel:'#f0dce9',metricValue:'#fff6fb',exerciseHeading:'#f0dce9',
    exerciseText:'#fff6fb',extra:'#f0dce9',footer:'#f0dce9'
  },
  clara:{
    gradient:["#fffdfa","#f1e9e3","#e8d8ce"],ring:'rgba(82,57,68,.13)',logo:'#4f3e45',subtitle:'#856775',
    kicker:'#856775',headline:'#4f3e45',secondary:'#856775',metricsBackground:'rgba(104,72,88,.10)',
    metricLabel:'#856775',metricValue:'#4f3e45',exerciseHeading:'#856775',
    exerciseText:'#4f3e45',extra:'#856775',footer:'#856775'
  },
  escura:{
    gradient:["#463047","#684b62","#93738a"],ring:'rgba(255,255,255,.11)',logo:'#fffafc',subtitle:'#e9d5e3',
    kicker:'#e9d5e3',headline:'#fffafc',secondary:'#e9d5e3',metricsBackground:'rgba(255,250,252,.10)',
    metricLabel:'#e9d5e3',metricValue:'#fffafc',exerciseHeading:'#e9d5e3',
    exerciseText:'#fffafc',extra:'#e9d5e3',footer:'#e9d5e3'
  }

} as const;
export function visibleShareExercises(summary:ShareSummary,metricsCount:number){
  // Layout exclusivamente vertical (9:16), preserva a sequência do WOD.
  const limit=metricsCount>=4?6:8;
  return {entries:summary.exercises.slice(0,limit),extra:Math.max(0,summary.exercises.length-limit)};
}

/** Contagem de informações públicas independentes; meta é detalhe da lista, não conta à parte. */
export function shareSelectionCount(options:ShareOptions):number{
  return Number(options.showWorkoutName)+Number(options.showGymName)+Number(options.showDate)+Number(options.showExercises)+
    Object.values(options.metrics).filter(Boolean).length;
}
/** Só os números das metas planejadas, preservando protocolos como 21-15-9 ou 3x10. */
export function numericShareTarget(value:string):string|null{
  const match=value.match(/\d+(?:[,.]\d+)?(?:\s*[-x×]\s*\d+(?:[,.]\d+)?)*/i);
  return match?match[0].replace(/\s*[x×]\s*/gi,'×').replace(/\s*-\s*/g,'-'):null;
}

export type ShareAchievement={label:string;value:string};
export type ShareAchievements={pr:ShareAchievement|null;semana:ShareAchievement|null;mes:ShareAchievement|null};
/** Só os registros privados do usuário, já filtrados pelo servidor, contam para conquistas. */
export function workoutShareAchievements(detail:SessionDetail,history:import('./templates').HistoryData,weeklyGoal:number):ShareAchievements{
  const day=detail.session.performed_on;
  const [year,month,date]=day.split('-').map(Number);
  const at=Date.UTC(year,month-1,date);
  const weekday=new Date(at).getUTCDay();
  const monday=new Date(at-((weekday+6)%7)*86400000).toISOString().slice(0,10);
  const weekEnd=new Date(at+(6-(weekday+6)%7)*86400000).toISOString().slice(0,10);
  const finished=new Map((history.sessions||[]).filter(s=>s.status==='finished'&&s.performed_on<=day).map(s=>[s.id,s]));
  if(detail.session.status==='finished')finished.set(detail.session.id,detail.session);
  const week=[...finished.values()].filter(s=>s.performed_on>=monday&&s.performed_on<=weekEnd).length;
  const monthCount=[...finished.values()].filter(s=>s.performed_on.slice(0,7)===day.slice(0,7)).length;
  const frequency=Number.isInteger(weeklyGoal)&&weeklyGoal>=1&&weeklyGoal<=7?weeklyGoal:0;
  const prior=new Set((history.sessions||[]).filter(s=>Date.parse(s.started_at)<Date.parse(detail.session.started_at)).map(s=>s.id));
  let personalRecord:ShareAchievement|null=null;
  for(const set of detail.sets){
    if(!set.completed||set.actual_reps===null||set.actual_reps<=0||
       !['kg','assist_kg'].includes(set.load_unit)||set.weight_kg===null||set.weight_kg<=0)continue;
    const previous=(history.progress||[]).filter(p=>p.exercise_key===set.exercise_key&&
      p.load_unit===set.load_unit&&prior.has(p.session_id));
    if(!previous.length)continue;
    const best=set.load_unit==='assist_kg'?Math.min(...previous.map(p=>p.weight_kg)):
      Math.max(...previous.map(p=>p.weight_kg));
    if((set.load_unit==='assist_kg'&&set.weight_kg<best)||
      (set.load_unit==='kg'&&set.weight_kg>best)){
      personalRecord={label:'PR BATIDO',value:set.exercise_name+' · '+set.weight_kg.toLocaleString('pt-BR')+' kg'};
      break;
    }
  }
  return {
    pr:personalRecord,
    semana:frequency&&week>=frequency?{label:'SEMANA NO RITMO',value:week+' treinos na semana'}:null,
    mes:frequency&&monthCount>=frequency*4?{label:'MÊS NO RITMO',value:monthCount+' treinos no mês'}:null
  };
}
export function layoutAchievements(layout:ShareLayout,values:ShareAchievements):ShareAchievement[]{
  const keys:('pr'|'semana'|'mes')[]=layout==='treino'?[]:
    layout==='todas'?['pr','semana','mes']:[layout];
  return keys.flatMap(key=>values[key]?[values[key]]:[]);
}
export function availableShareLayout(layout:ShareLayout,values:ShareAchievements):boolean{
  if(layout==='treino')return true;
  if(layout==='todas')return Boolean(values.pr&&values.semana&&values.mes);
  return Boolean(values[layout]);
}
