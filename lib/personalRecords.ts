export const MODALITIES=['Academia','CrossFit','Funcional','Calistenia','Corrida','Pilates','Alongamentos','Outros'] as const;
export type Modality=(typeof MODALITIES)[number];
export type PersonalRecord={exercise_key:string;weight_kg:number;repetitions:number;updated_at:string};
export type ExerciseModality={exercise_key:string;modality:Modality};

export const estimatedOneRM=(load:number,reps:number):number=>{
  if(!Number.isFinite(load)||load<=0||!Number.isInteger(reps)||reps<1||reps>30)return NaN;
  // Uma repeticao valida e uma medicao direta, nao uma estimativa de 1,033 x carga.
  return reps===1?load:load*(1+reps/30);
};
export const targetWeightForReps=(oneRM:number,reps:number):number=>{
  if(!Number.isFinite(oneRM)||oneRM<=0||!Number.isInteger(reps)||reps<1||reps>30)return NaN;
  return reps===1?oneRM:oneRM/(1+reps/30);
};
export const prBands=(oneRM:number)=>({
  leve:[oneRM*.40,oneRM*.60] as const,
  moderada:[oneRM*.70,oneRM*.85] as const,
  pesada:[oneRM*.85,oneRM] as const
});
export const intensityLabel=(load:number,oneRM:number):string=>{
  if(!Number.isFinite(load)||load<0||!Number.isFinite(oneRM)||oneRM<=0)return 'Indefinida';
  const pct=load/oneRM*100;
  return pct<40?'Muito leve':pct<=60?'Leve':pct<70?'Intermediária (60–70%)':pct<85?'Moderada':pct<=100?'Pesada':'Acima do 1RM estimado';
};
