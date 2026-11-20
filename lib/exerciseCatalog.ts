import rawCatalog from '../data/exercises.json';
import type { Exercise, Unit } from './templates';

export type ExerciseCategory='Academia'|'CrossFit'|'HYROX'|'Funcional';
export type MuscleGroup='Peitoral'|'Costas'|'Quadríceps'|'Posteriores'|'Glúteos'|'Adutores'|'Panturrilhas'|'Ombros'|'Bíceps'|'Tríceps'|'Antebraço'|'Abdômen/Core'|'Corpo inteiro'|'Cardiorrespiratório';
export type EquipmentType='Máquinas'|'Livres/Polias'|'Monoestrutural'|'Ginástico'|'Levantamento de peso'|'Estações'|'Funcional'|'Equipamentos';
export type CatalogExercise=Pick<Exercise,'key'|'name'|'unit'> & {category:ExerciseCategory;muscleGroup:MuscleGroup;equipmentType:EquipmentType;section?:string};

type RawEntry={id:string;name:string;category:string;section:string;kind:string;muscleGroup:string|null;equipmentType:string;variants?:string[];description?:string;stationOrder?:number;target?:string};
const entries=rawCatalog.exercises as RawEntry[];
const slug=(s:string)=>s.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const canonical=(s:string)=>s.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const inferUnit=(e:RawEntry):Unit=>e.equipmentType==='Monoestrutural'?'km/h':e.name.includes('Graviton')?'assist_kg':e.equipmentType==='Ginástico'?'none':'kg';

/** JSON is the source of truth. Equipment entries are intentionally excluded from exercise selection. */
export const EXERCISE_CATALOG:CatalogExercise[]=entries.filter(e=>e.kind==='exercise'&&e.muscleGroup).flatMap(e=>{
  const base:CatalogExercise={key:e.id,name:e.name,unit:inferUnit(e),category:e.category as ExerciseCategory,muscleGroup:e.muscleGroup as MuscleGroup,equipmentType:e.equipmentType as EquipmentType,section:e.section};
  return [base,...(e.variants||[]).map(variant=>({...base,key:`${e.id}--${slug(variant)}`,name:`${e.name} — ${variant}`}))];
});
export const EQUIPMENT_CATALOG=entries.filter(e=>e.kind==='equipment');
export const CATEGORY_OPTIONS:ExerciseCategory[]=['Academia','CrossFit','HYROX','Funcional'];
export const MUSCLE_GROUP_OPTIONS:MuscleGroup[]=['Peitoral','Costas','Quadríceps','Posteriores','Glúteos','Adutores','Panturrilhas','Ombros','Bíceps','Tríceps','Antebraço','Abdômen/Core','Corpo inteiro','Cardiorrespiratório'];

const legacyAliases:Record<string,string>={
  'elevacao-pelvica':'Elevação pélvica livre',
  'coice-cabo':'Glúteo na polia baixa',
  'mesa-flexora':'Mesa flexora',
  'cadeira-abdutora':'Cadeira abdutora',
  'agachamento-smith':'Agachamento no Smith',
  'leg-press':'Leg Press',
  'leg-press-45':'Leg Press',
  'leg-press-horizontal':'Leg Press',
  'leg-press-vertical':'Leg Press',
  'cadeira-extensora':'Cadeira extensora',
  'abducao-cabo-cruzado':'Glúteo na polia baixa',
  'gluteo-banco-romano':'Banco romano',
  'elevacao-frontal':'Elevação frontal',
  'desenvolvimento-maquina':'Desenvolvimento na máquina',
  'rosca-martelo':'Rosca martelo',
  'abdominal-pernas-elevadas':'Abdominal infra',
  'abdominal-polia':'Abdominal na polia alta',
  'supino-reto':'Supino reto',
  'supino-reto-maquina':'Supino reto na máquina',
  'remada-baixa':'Remada baixa no triângulo',
  'remada-frontal-baixa':'Remada baixa no triângulo',
  'barra-fixa-graviton-pronada':'Graviton'
};
export function lookupExercise(key:string,name:string):CatalogExercise|undefined{
  const direct=EXERCISE_CATALOG.find(e=>e.key===key);
  if(direct)return direct;
  const sourceName=legacyAliases[key]||name;
  return EXERCISE_CATALOG.find(e=>canonical(e.name)===canonical(sourceName))||
    EXERCISE_CATALOG.find(e=>canonical(e.name).startsWith(canonical(sourceName)))||
    EXERCISE_CATALOG.find(e=>canonical(e.name).includes(canonical(sourceName)));
}
export function exerciseFromCatalog(e:CatalogExercise):Exercise{
  return {key:e.key,name:e.name,sets:3,target:'10 repetições',defaultLoad:null,unit:e.unit,
    category:e.category,muscleGroup:e.muscleGroup,equipmentType:e.equipmentType};
}
