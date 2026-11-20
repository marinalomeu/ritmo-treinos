import type { Template, Exercise, Unit } from './templates';
import { lookupExercise, CATEGORY_OPTIONS, MUSCLE_GROUP_OPTIONS } from './exerciseCatalog';

const units:Unit[]=['kg','assist_kg','km/h','none'];
const text=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
const validKey=(s:unknown)=>typeof s==='string' && /^[a-zA-Z0-9_-]{1,100}$/.test(s);

export const normalizeTemplate=(input:unknown,id:string):Template | null=>{
  if(!input || typeof input!=='object'||!validKey(id))return null;
  const raw=input as Partial<Template>;
  const name=text(raw.name,70);
  const description=text(raw.description,400);
  const days=text(raw.days,100);
  const category=text(raw.category,70)||'Personalizado';
  if(!name||!Array.isArray(raw.exercises)||raw.exercises.length<1||raw.exercises.length>40)return null;
  const keys=new Set<string>();
  const exercises:Exercise[]=[];
  for(const entry of raw.exercises){
    if(!entry||typeof entry!=='object')return null;
    const x=entry as Partial<Exercise>;
    if(!validKey(x.key)||keys.has(x.key as string)||!text(x.name,100)||!text(x.target,100)
      ||!Number.isInteger(x.sets)||x.sets!<1||x.sets!>20||!units.includes(x.unit as Unit)
      ||!(x.defaultLoad===null || (typeof x.defaultLoad==='number' && Number.isFinite(x.defaultLoad) && x.defaultLoad>=0 && x.defaultLoad<=2000))
      ||!(x.block===undefined||x.block===null||(Number.isInteger(x.block)&&x.block>=1&&x.block<=20)))return null;
    keys.add(x.key as string);
    const known=lookupExercise(x.key as string,x.name as string);
    const category=CATEGORY_OPTIONS.includes(x.category as never)?x.category:known?.category;
    const muscleGroup=MUSCLE_GROUP_OPTIONS.includes(x.muscleGroup as never)?x.muscleGroup:known?.muscleGroup;
    const equipmentType=x.equipmentType||known?.equipmentType;
    exercises.push({
      key:x.key as string,name:text(x.name,100),sets:x.sets as number,target:text(x.target,100),
      defaultLoad:x.defaultLoad as number|null,unit:x.unit as Unit,
      ...(category?{category}:{}),...(muscleGroup?{muscleGroup}:{}),...(equipmentType?{equipmentType}:{}),
      ...(text(x.tip,300)?{tip:text(x.tip,300)}:{}),
      ...(typeof x.block==='number'?{block:x.block}:{})
    });
  }
  return {id,name,description,days,category,exercises};
};
