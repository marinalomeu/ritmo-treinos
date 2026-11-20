import { DEMO_TEMPLATES } from './demoTemplates';
import type { PersonalRecord, ExerciseModality } from './personalRecords';
import type { CatalogExercise } from './exerciseCatalog';

export type Unit = 'kg' | 'assist_kg' | 'km/h' | 'none';
export type Exercise = {
  key: string;
  name: string;
  sets: number;
  target: string;
  defaultLoad: number | null;
  unit: Unit;
  tip?: string;
  block?: number;
  restSeconds?: number | null;
};
export type Template = {
  id: string;
  name: string;
  description: string;
  days: string;
  category: string;
  gym_name?: string | null;
  exercises: Exercise[];
};
// Dados fictícios como fallback local; as fichas reais ficam apenas no Neon.
export const TEMPLATES: Template[] = DEMO_TEMPLATES;
export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id);
export type StoredSet = {
  id: string;
  exercise_key: string;
  exercise_name: string;
  sort_order: number;
  block_number: number | null;
  set_number: number;
  target_reps: string;
  actual_reps: number | null;
  actual_distance_m?: number | null;
  rest_seconds?: number | null;
  load_unit: Unit;
  weight_kg: number | null;
  completed: boolean;
  completed_at: string | null;
};
export type WorkoutSession = {
  id: string;
  template_id: string;
  template_name: string;
  challenge_id?: string | null;
  challenge_division?: string | null;
  performed_on: string;
  gym_name?: string | null;
  started_at: string;
  finished_at: string | null;
  status: 'active' | 'finished';
  completed_sets: number;
  total_sets: number;
};
export type SessionDetail = {session: WorkoutSession; sets: StoredSet[]};
export type HistoryData = {sessions: WorkoutSession[]; progress: {exercise_key:string;exercise_name:string;load_unit:Unit;performed_on:string;weight_kg:number;session_id:string}[];goal?:import('./goal').TrainingGoal;templates?:Template[];historicalExercises?:{key:string;name:string;unit:Unit}[];personalRecords?:PersonalRecord[];prPinned?:string[];prReferences?:{exercise_key:string;weight_kg:number;actual_reps:number|null;target_reps:string;performed_on:string}[];exerciseModalities?:ExerciseModality[];customExercises?:CatalogExercise[]};
/** Extrai somente metas inequívocas de repetições; nunca interpreta tempo, distância, AMRAP ou ranges como reps. */
export function prescribedReps(target:string):number|null {
  const match=target.trim().match(/^(\d{1,5})(?:\s*(?:reps?|repeti(?:ç|c)(?:ão|ões|oes)))?$/i);
  if(!match)return null;
  const count=Number(match[1]);
  return Number.isInteger(count)&&count>=0&&count<=10000?count:null;
}
/** Distância só quando o alvo é explicitamente uma metragem, nunca confundir com repetições. */
export function prescribedDistanceMeters(target:string):number|null{
  const match=target.trim().match(/^([\d.,]+)\s*(m|metros?|km|quilômetros?)$/i);
  if(!match)return null;
  const raw=match[1];
  const number=Number(raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):raw);
  const meters=number*(match[2].toLowerCase().startsWith('k')?1000:1);
  return Number.isFinite(meters)&&meters>0&&meters<=1000000?Math.round(meters*100)/100:null;
}
export const makeSets = (template: Template, past: Record<string, number> = {}): StoredSet[] => template.exercises.flatMap((e, index) => Array.from({length: e.sets}, (_, i) => ({
  id: `${e.key}-${i+1}`, exercise_key: e.key, exercise_name: e.name, sort_order: index, block_number: e.block ?? null,
  set_number: i+1, target_reps: e.target, actual_reps: null, actual_distance_m:null,rest_seconds:e.restSeconds??null, load_unit: e.unit, weight_kg: past[e.key] ?? e.defaultLoad,
  completed: false, completed_at: null
})));
