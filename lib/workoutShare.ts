import type { SessionDetail } from './templates';

export type ShareMetric='time'|'exerciseCount'|'sets'|'volume';
export type ShareOptions={
  showWorkoutName:boolean;
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
  showWorkoutName:true,showExercises:false,showExerciseTargets:false,
  metrics:{time:true,exerciseCount:true,sets:true,volume:false}
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
  if(options.metrics.volume&&summary.volumeKg!==null){
    entries.push({key:'volume',label:'VOLUME REGISTRADO',value:formatVolume(summary.volumeKg)});
  }
  return entries;
};
export function visibleShareExercises(summary:ShareSummary,format:'story'|'feed',metricsCount:number){
  // A lista mantém a ordem do treino; se longa, mostra quantos exercícios faltaram.
  const limit=format==='story'?(metricsCount>=4?6:8):(metricsCount>=4?2:3);
  return {entries:summary.exercises.slice(0,limit),extra:Math.max(0,summary.exercises.length-limit)};
}
