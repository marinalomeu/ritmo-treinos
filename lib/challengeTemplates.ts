import type { Template, Exercise, Unit } from './templates';
import raw from '../data/challenges.json';

type Loads=Record<string,number>;
export type ChallengeStep={
  name:string; amount:number; unit:string; round?:number;block?:number;station?:number;zone?:number;
  loadKg?:Loads;loadKgPerHand?:Loads;rxLoadKg?:Loads;targetHeightM?:Loads;
  resistance?:Record<string,{xebex:number;torque:number}>;scoreUnit?:string;
};
export type ChallengeDefinition={
  id:string;name:string;modality:string;format:string;steps:ChallengeStep[];
  rounds?:number;timeCapSeconds?:number;divisions?:string[];notes?:string;
  commonBarbellLoadKg?:Loads;optionalVestKg?:Loads;ruckKg?:Loads;
};
export const CHALLENGES=raw.challenges as ChallengeDefinition[];
export const DIVISIONS=[
  {id:'women_open',label:'Feminino Open'},{id:'men_open',label:'Masculino Open'},
  {id:'women_pro',label:'Feminino Pro'},{id:'men_pro',label:'Masculino Pro'},
  {id:'women',label:'Feminino RX'},{id:'men',label:'Masculino RX'}
];
const unitFor=(step:ChallengeStep):Unit=>step.loadKg||step.loadKgPerHand||step.rxLoadKg?'kg':'none';
const findLoad=(values:Loads|undefined,division:string)=>{
  const sex=division.startsWith('women')?'women':'men';
  return values?.[division]??values?.[sex]??null;
};
const targetFor=(s:ChallengeStep)=>`${s.amount.toLocaleString('pt-BR',{maximumFractionDigits:2})} ${s.unit==='reps'?'repetições':s.unit==='sec'?'segundos':s.unit}`;
/** Always generate a standalone snapshot. Never insert a challenge into the user's reusable workout templates. */
export function challengeToTemplate(challenge:ChallengeDefinition,division:string):Template{
  const sourceSteps=challenge.rounds?Array.from({length:challenge.rounds},()=>challenge.steps).flat():challenge.steps;
  const exercises:Exercise[]=sourceSteps.map((s,i)=>{
    const loadPerHand=findLoad(s.loadKgPerHand,division);
    const load=findLoad(s.loadKg,division)??findLoad(s.rxLoadKg,division)??loadPerHand??
      findLoad(challenge.commonBarbellLoadKg,division);
    const unit:Unit=load!==null?'kg':unitFor(s);
    const round=challenge.rounds?Math.floor(i/challenge.steps.length)+1:s.round;
    const tags=[round?`Round ${round}`:null,s.block?`Bloco ${s.block}`:null,s.station?`Estação ${s.station}`:null,s.zone?`Zona ${s.zone}`:null].filter(Boolean);
    const hint=[loadPerHand!==null?'Carga por mão (kg)':null,s.targetHeightM?`Alvo: ${findLoad(s.targetHeightM,division)} m`:null,challenge.format==='amrap'?'Repetir pelo máximo de rounds no tempo previsto':null].filter(Boolean).join(' · ');
    return {key:`ch-${challenge.id}-${String(i+1).padStart(2,'0')}`,name:s.name,sets:1,target:targetFor(s),
      defaultLoad:load,unit,tip:[...tags,hint].filter(Boolean).join(' · ').slice(0,300),
      ...(s.block?{block:s.block}:{}),category:challenge.modality==='CrossFit'?'CrossFit':challenge.modality==='Fitness híbrido'?'HYROX':undefined};
  });
  const detail=[challenge.format==='amrap'?`AMRAP ${(challenge.timeCapSeconds||0)/60} minutos`:challenge.format==='for_time'?'For Time':challenge.format==='total_reps'?'Máximo de repetições/calorias':'Sequencial',challenge.notes].filter(Boolean).join(' · ').slice(0,400);
  return {id:'avulso',name:`Desafio: ${challenge.name}`.slice(0,70),description:detail,days:'Em Outro Ritmo',category:'Desafio',exercises};
}
