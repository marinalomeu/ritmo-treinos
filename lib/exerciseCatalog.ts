import type { Exercise, Unit } from './templates';

export type ExerciseCategory='Academia'|'CrossFit'|'HYROX'|'Funcional';
export type MuscleGroup='Peitoral'|'Costas'|'Quadríceps'|'Posteriores'|'Glúteos'|'Panturrilhas'|'Ombros'|'Bíceps'|'Tríceps'|'Antebraço'|'Abdômen/Core'|'Corpo inteiro'|'Cardiorrespiratório';
export type EquipmentType='Máquinas'|'Livres/Polias'|'Monoestrutural'|'Ginástico'|'Levantamento de peso'|'Estações'|'Funcional';
export type CatalogExercise=Pick<Exercise,'key'|'name'|'unit'> & {category:ExerciseCategory;muscleGroup:MuscleGroup;equipmentType:EquipmentType};
const item=(key:string,name:string,category:ExerciseCategory,muscleGroup:MuscleGroup,equipmentType:EquipmentType,unit:Unit='kg'):CatalogExercise=>({key,name,category,muscleGroup,equipmentType,unit});

/** Lista central das entradas recuperadas das classificações enviadas. As variações mantêm chaves próprias. */
export const EXERCISE_CATALOG:CatalogExercise[]=[
  item('supino-reto-maquina','Supino reto na máquina','Academia','Peitoral','Máquinas'),
  item('supino-reto','Supino reto','Academia','Peitoral','Livres/Polias'),
  item('remada-frontal-baixa','Remada frontal baixa','Academia','Costas','Máquinas'),
  item('remada-baixa','Remada baixa','Academia','Costas','Máquinas'),
  item('barra-fixa-graviton-pronada','Barra fixa Graviton · pegada pronada','Academia','Costas','Máquinas','assist_kg'),
  item('elevacao-pelvica','Elevação pélvica','Academia','Glúteos','Livres/Polias'),
  item('coice-cabo','Coice no cabo','Academia','Glúteos','Livres/Polias'),
  item('mesa-flexora','Mesa flexora','Academia','Posteriores','Máquinas'),
  item('cadeira-abdutora','Cadeira abdutora','Academia','Glúteos','Máquinas'),
  item('agachamento-smith','Agachamento Smith','Academia','Quadríceps','Máquinas'),
  item('leg-press','Leg press','Academia','Quadríceps','Máquinas'),
  item('leg-press-45','Leg Press 45°','Academia','Quadríceps','Máquinas'),
  item('leg-press-horizontal','Leg Press horizontal','Academia','Quadríceps','Máquinas'),
  item('leg-press-vertical','Leg Press vertical','Academia','Quadríceps','Máquinas'),
  item('cadeira-extensora','Cadeira extensora','Academia','Quadríceps','Máquinas'),
  item('abducao-cabo-cruzado','Abdução no cabo cruzado','Academia','Glúteos','Livres/Polias'),
  item('gluteo-banco-romano','Glúteo no banco romano','Academia','Glúteos','Máquinas'),
  item('elevacao-frontal','Elevação frontal','Academia','Ombros','Livres/Polias'),
  item('desenvolvimento-maquina','Desenvolvimento na máquina','Academia','Ombros','Máquinas'),
  item('rosca-martelo','Rosca martelo','Academia','Bíceps','Livres/Polias'),
  item('abdominal-pernas-elevadas','Abdominal pernas elevadas','Academia','Abdômen/Core','Livres/Polias','none'),
  item('abdominal-polia','Abdominal na polia','Academia','Abdômen/Core','Livres/Polias'),
  item('burpees-sem-salto','Burpees sem salto','Funcional','Corpo inteiro','Funcional','none'),
  item('prancha-frontal','Prancha frontal','Funcional','Abdômen/Core','Funcional','none'),
  item('flexao-inclinada','Flexão inclinada','Funcional','Peitoral','Funcional','none'),
  item('crunch-sem-peso','Crunch sem peso','Funcional','Abdômen/Core','Funcional','none'),
  item('prancha-alta-toque-ombros','Prancha alta com toque nos ombros','Funcional','Abdômen/Core','Funcional','none'),
  item('mountain-climbers-prancha','Mountain climbers + prancha','Funcional','Abdômen/Core','Funcional','none'),
  item('corrida','Corrida','HYROX','Cardiorrespiratório','Monoestrutural','km/h')
];

export const CATEGORY_OPTIONS:ExerciseCategory[]=['Academia','CrossFit','HYROX','Funcional'];
export const MUSCLE_GROUP_OPTIONS:MuscleGroup[]=['Peitoral','Costas','Quadríceps','Posteriores','Glúteos','Panturrilhas','Ombros','Bíceps','Tríceps','Antebraço','Abdômen/Core','Corpo inteiro','Cardiorrespiratório'];

const canonical=(s:string)=>s.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
export function lookupExercise(key:string,name:string):CatalogExercise|undefined{
  return EXERCISE_CATALOG.find(e=>e.key===key) || EXERCISE_CATALOG.find(e=>canonical(e.name)===canonical(name));
}
export function exerciseFromCatalog(e:CatalogExercise):Exercise{
  return {key:e.key,name:e.name,sets:3,target:'10 repetições',defaultLoad:null,unit:e.unit,
    category:e.category,muscleGroup:e.muscleGroup,equipmentType:e.equipmentType};
}
