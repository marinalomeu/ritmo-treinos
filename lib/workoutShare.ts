import type { SessionDetail } from './templates';

export type ShareMetric='time'|'exerciseCount'|'sets'|'volume';
export type ShareOptions={
  showWorkoutName:boolean;
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
  showWorkoutName:false,showDate:false,showExercises:false,showExerciseTargets:false,
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
export type ShareVisual='dark'|'light';
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
  }
} as const;
export function visibleShareExercises(summary:ShareSummary,metricsCount:number){
  // Layout exclusivamente vertical (9:16), preserva a sequência do WOD.
  const limit=metricsCount>=4?6:8;
  return {entries:summary.exercises.slice(0,limit),extra:Math.max(0,summary.exercises.length-limit)};
}

/** Contagem de informações públicas independentes; meta é detalhe da lista, não conta à parte. */
export function shareSelectionCount(options:ShareOptions):number{
  return Number(options.showWorkoutName)+Number(options.showDate)+Number(options.showExercises)+
    Object.values(options.metrics).filter(Boolean).length;
}
/** Só os números das metas planejadas, preservando protocolos como 21-15-9 ou 3x10. */
export function numericShareTarget(value:string):string|null{
  const match=value.match(/\d+(?:[,.]\d+)?(?:\s*[-x×]\s*\d+(?:[,.]\d+)?)*/i);
  return match?match[0].replace(/\s*[x×]\s*/gi,'×').replace(/\s*-\s*/g,'-'):null;
}
