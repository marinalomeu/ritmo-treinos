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
};
export type Template = {
  id: string;
  name: string;
  description: string;
  days: string;
  category: string;
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
  load_unit: Unit;
  weight_kg: number | null;
  completed: boolean;
  completed_at: string | null;
};
export type WorkoutSession = {
  id: string;
  template_id: string;
  template_name: string;
  performed_on: string;
  started_at: string;
  finished_at: string | null;
  status: 'active' | 'finished';
  completed_sets: number;
  total_sets: number;
};
export type SessionDetail = {session: WorkoutSession; sets: StoredSet[]};
export type HistoryData = {sessions: WorkoutSession[]; progress: {exercise_key:string;exercise_name:string;load_unit:Unit;performed_on:string;weight_kg:number;session_id:string}[];goal?:import('./goal').TrainingGoal;templates?:Template[];historicalExercises?:{key:string;name:string;unit:Unit}[];personalRecords?:PersonalRecord[];exerciseModalities?:ExerciseModality[];customExercises?:CatalogExercise[]};
export const makeSets = (template: Template, past: Record<string, number> = {}): StoredSet[] => template.exercises.flatMap((e, index) => Array.from({length: e.sets}, (_, i) => ({
  id: `${e.key}-${i+1}`, exercise_key: e.key, exercise_name: e.name, sort_order: index, block_number: e.block ?? null,
  set_number: i+1, target_reps: e.target, load_unit: e.unit, weight_kg: past[e.key] ?? e.defaultLoad,
  completed: false, completed_at: null
})));
