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
    Math.max(0,Math.floor((finish-start-(detail.session.paused_ms??0))/1000)):0;
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
export type ShareVisual='dark-green'|'light-green'|'mauve'|'light'|'dark';
export type ShareComposition='training'|'pr'|'week'|'month'|'all';
export type ShareEligibility={pr:boolean;prCount:number;week:boolean;month:boolean;weekCount:number;weekTarget:number;monthCount:number;monthTarget:number;challengeFirst?:boolean;challengeBest?:boolean;challengeId?:string|null};
export const SHARE_PALETTES:{value:ShareVisual;label:string}[]=[{value:'dark-green',label:'Verde escura'},{value:'light-green',label:'Verde clara'},{value:'mauve',label:'Malva'},{value:'light',label:'Clara'},{value:'dark',label:'Escura'}];
export const SHARE_COMPOSITIONS:{value:ShareComposition;label:string;requires:(keyof ShareEligibility)[]}[]=[{value:'training',label:'Só treino',requires:[]},{value:'pr',label:'PR batido',requires:['pr']},{value:'week',label:'Semana no ritmo',requires:['week']},{value:'month',label:'Mês no ritmo',requires:['month']},{value:'all',label:'PR + Semana + Mês',requires:['pr','week','month']}];
export function shareAwardLabels(composition:ShareComposition,eligibility:ShareEligibility|null):string[]{
  if(!eligibility)return [];
  const badges:string[]=[];
  if((composition==='pr'||composition==='all')&&eligibility.pr)badges.push('PR BATIDO');
  if((composition==='week'||composition==='all')&&eligibility.week)badges.push('SEMANA NO RITMO · '+eligibility.weekCount+'/'+eligibility.weekTarget);
  if((composition==='month'||composition==='all')&&eligibility.month)badges.push('MÊS NO RITMO · '+eligibility.monthCount+'/'+eligibility.monthTarget);
  return badges;
}

export const SHARE_THEMES={
  'dark-green':{
    gradient:['#063524','#06432e','#063b2a'],ring:'rgba(242,250,241,.12)',logo:'#fafcf7',subtitle:'#d9e9dc',kicker:'#d9ecda',headline:'#fffdf7',secondary:'#e6f2e7',metricsBackground:'rgba(255,255,248,.14)',metricLabel:'#daecdf',metricValue:'#fffdf7',exerciseHeading:'#d4eadc',exerciseText:'#f8fff9',extra:'#deecdf',footer:'#ddf0e1'
  },
  'light-green':{
    gradient:['#e4f8e3','#e1f4e0','#dcf2dc'],ring:'rgba(68,105,85,.15)',logo:'#315245',subtitle:'#648271',kicker:'#507764',headline:'#2d5442',secondary:'#476958',metricsBackground:'rgba(85,130,96,.10)',metricLabel:'#57785b',metricValue:'#315244',exerciseHeading:'#406e52',exerciseText:'#284934',extra:'#52785c',footer:'#587661'
  },
  mauve:{
    gradient:['#775269','#785169','#745066'],ring:'rgba(255,237,247,.14)',logo:'#fff8fd',subtitle:'#f5e5f0',kicker:'#f4e0ee',headline:'#fff9fd',secondary:'#f9e8f5',metricsBackground:'rgba(255,240,250,.13)',metricLabel:'#f9eaf4',metricValue:'#fff9fd',exerciseHeading:'#f3e6ee',exerciseText:'#fff8fd',extra:'#f5d5e8',footer:'#f7e8f2'
  },
  dark:{
    gradient:['#42273c','#46283f','#462a40'],
    ring:'rgba(255,255,255,.09)',logo:'#f9eff5',subtitle:'#d9bfd0',
    kicker:'#efdae7',headline:'#fffafc',secondary:'#e5d1dd',
    metricsBackground:'rgba(255,250,252,.10)',metricLabel:'#f1dce7',
    metricValue:'#fffafc',exerciseHeading:'#e8d6e1',
    exerciseText:'#fffafc',extra:'#ebd5e2',footer:'#ead3e1'
  },
  light:{
    gradient:['#f9eeee','#f8eded','#f8eeee'],
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
  return Number(options.showWorkoutName)+Number(options.showGymName)+Number(options.showDate)+Number(options.showExercises)+
    Object.values(options.metrics).filter(Boolean).length;
}
/** Só os números das metas planejadas, preservando protocolos como 21-15-9 ou 3x10. */
export function numericShareTarget(value:string):string|null{
  const match=value.match(/\d+(?:[,.]\d+)?(?:\s*[-x×]\s*\d+(?:[,.]\d+)?)*/i);
  return match?match[0].replace(/\s*[x×]\s*/gi,'×').replace(/\s*-\s*/g,'-'):null;
}
