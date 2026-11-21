export type BodyMetric={key:string;name:string;unit:string;group:'composition'|'measurements';side?:'right'|'left'|'none';custom?:boolean};
export type BodyEvaluation={id:string;measured_on:string;method:string;notes:string;values:Record<string,number>;created_at:string;updated_at:string;deleted_at?:string|null};
export type BodyGoal={id:string;metric_key:string;kind:'target'|'range';target?:number;min?:number;max?:number;start_value:number;started_on:string;deadline?:string;status:'active'|'paused'|'closed';version:number;replaced_by?:string;created_at:string;updated_at:string};
export type BodyAudit={id:string;record_type:'evaluation'|'goal'|'metric';record_id:string;action:string;occurred_at:string;before?:unknown;after?:unknown};
export type BodyData={evaluations:BodyEvaluation[];metrics:BodyMetric[];goals:BodyGoal[];audit:BodyAudit[]};
export const STANDARD_METRICS:BodyMetric[]=[
  {key:'weight_kg',name:'Peso',unit:'kg',group:'composition'},
  {key:'fat_percent',name:'Gordura corporal',unit:'%',group:'composition'},
  {key:'muscle_kg',name:'Massa muscular esquelética',unit:'kg',group:'composition'},
  {key:'fat_mass_kg',name:'Massa de gordura',unit:'kg',group:'composition'},
  {key:'lean_mass_kg',name:'Massa livre de gordura',unit:'kg',group:'composition'},
  {key:'water_percent',name:'Água corporal',unit:'%',group:'composition'},
  {key:'visceral_level',name:'Gordura visceral (índice)',unit:'índice',group:'composition'},
  {key:'basal_kcal',name:'Metabolismo basal estimado',unit:'kcal/dia',group:'composition'},
  {key:'waist_cm',name:'Cintura',unit:'cm',group:'measurements'},
  {key:'abdomen_cm',name:'Abdômen',unit:'cm',group:'measurements'},
  {key:'hips_cm',name:'Quadril',unit:'cm',group:'measurements'},
  {key:'chest_cm',name:'Tórax/busto',unit:'cm',group:'measurements'},
  {key:'neck_cm',name:'Pescoço',unit:'cm',group:'measurements'},
  ...(['arm','thigh','calf'] as const).flatMap(part=>(['right','left'] as const).map(side=>({key:part+'_'+side+'_cm',name:({arm:'Braço',thigh:'Coxa',calf:'Panturrilha'} as const)[part]+' '+(side==='right'?'direito':'esquerdo'),unit:'cm',group:'measurements' as const,side})))
];
export const validDate=(date:string)=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date+'T12:00:00Z'))&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date;
export const validMetric=(metric:BodyMetric)=>metric&&/^(?:[a-z][a-z0-9_]{1,70}|custom:[a-z0-9-]{1,90})$/.test(metric.key)&&typeof metric.name==='string'&&metric.name.trim().length>0&&metric.name.length<=90&&['kg','%','cm','kcal/dia','índice'].includes(metric.unit)&&['composition','measurements'].includes(metric.group);
export const validValue=(value:unknown,metric:BodyMetric)=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<= (metric.unit==='%'?100:metric.unit==='cm'?350:metric.unit==='kcal/dia'?10000:metric.unit==='índice'?100:700);
export const validateEvaluation=(evaluation:BodyEvaluation,metrics:BodyMetric[])=>{
  if(!evaluation||!validDate(evaluation.measured_on)||typeof evaluation.values!=='object'||!evaluation.values||Array.isArray(evaluation.values))return false;
  const keys=Object.keys(evaluation.values);
  if(keys.length<1||keys.length>60)return false;
  const lookup=new Map(metrics.map(m=>[m.key,m]));
  return keys.every(k=>lookup.has(k)&&validValue(evaluation.values[k],lookup.get(k)!))&&
    typeof evaluation.method==='string'&&evaluation.method.length<=120&&typeof evaluation.notes==='string'&&evaluation.notes.length<=1000;
};
export function firstAchievement(goal:BodyGoal,evaluations:BodyEvaluation[]):BodyEvaluation|undefined {
  return evaluations.filter(e=>!e.deleted_at&&e.measured_on>=goal.started_on&&e.values[goal.metric_key]!==undefined)
    .sort((a,b)=>a.measured_on.localeCompare(b.measured_on)||a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id))
    .find(e=>{const n=e.values[goal.metric_key];return goal.kind==='range'?n>=goal.min!&&n<=goal.max!:goal.target!>=goal.start_value?n>=goal.target!:n<=goal.target!;});
}
export function latestForMetric(data:BodyData,key:string):BodyEvaluation|undefined{
  return data.evaluations.filter(e=>!e.deleted_at&&e.values[key]!==undefined).sort((a,b)=>b.measured_on.localeCompare(a.measured_on)||b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id))[0];
}
const demoDates=['2026-06-08','2026-07-09','2026-08-10','2026-09-11','2026-10-12','2026-11-13'];
const d=[0,1,2,3,4,5];
const sample=(idx:number):BodyEvaluation=>({
  id:'demo-evaluation-'+(idx+1),measured_on:demoDates[idx],method:idx%2?'Balança de bioimpedância (fictícia)':'Avaliação corporal (fictícia)',notes:'Avaliação fictícia para demonstração.',
  values:{weight_kg:[73.2,72.8,72.1,71.7,71.3,70.4][idx],fat_percent:[37.3,36.8,36.4,35.6,35.9,34.7][idx],
    muscle_kg:[23.7,23.9,24.0,24.2,24.1,24.5][idx],waist_cm:[80.7,80.1,79.0,78.4,78.7,77.5][idx],
    abdomen_cm:[88,87.4,86.7,85.6,85.9,84.8][idx],hips_cm:[106.3,106,105.4,104.6,104.9,104.1][idx],
    thigh_right_cm:[61.3,61,60.7,60.6,60.8,60.4][idx],thigh_left_cm:[60.8,60.6,60.3,60.1,60.4,59.9][idx],
    arm_right_cm:[30.1,30.2,30.1,30.4,30.2,30.5][idx],arm_left_cm:[29.8,29.9,29.9,30.1,30,30.3][idx],
    'custom:glute-upper':[103.4,103.5,103.2,103.1,103.5,103.3][idx]},
  created_at:demoDates[idx]+'T12:00:00.000Z',updated_at:demoDates[idx]+'T12:00:00.000Z'
});
export function demoBodyData():BodyData{
  const now='2026-11-13T12:00:00.000Z';
  return {metrics:[...STANDARD_METRICS,{key:'custom:glute-upper',name:'Glúteo superior',unit:'cm',group:'measurements',custom:true}],
    evaluations:d.map(sample),audit:[],
    goals:[
      {id:'demo-goal-1',metric_key:'waist_cm',kind:'target',target:77.5,start_value:80.7,started_on:'2026-06-08',deadline:'2026-10-30',status:'active',version:1,created_at:now,updated_at:now},
      {id:'demo-goal-2',metric_key:'weight_kg',kind:'range',min:70,max:72,start_value:73.2,started_on:'2026-06-08',status:'active',version:1,created_at:now,updated_at:now}
    ]
  };
}
