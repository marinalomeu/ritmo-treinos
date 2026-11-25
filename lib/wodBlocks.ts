import { normalizeTemplate } from './templateEditor.ts';
import type { Exercise, StoredSet } from './templates';

export const WOD_FORMATS = {
  linear: 'Exercícios soltos',
  rounds: 'Voltas fixas',
  for_time: 'For Time',
  amrap: 'AMRAP',
  emom: 'EMOM',
} as const;

export type WodFormat = keyof typeof WOD_FORMATS;
type Metric = 'reps' | 'm' | 's';
export type WodBlock = {
  format: WodFormat;
  exercises: Exercise[];
  rounds: number | null;
  durationSeconds: number | null;
  restSeconds: number;
};
type Result = {
  slot: number;
  exercise: number;
  value: number;
  weight: number | null;
  complete: boolean;
  at: number;
};
type BlockProgress = {
  startedAt: number | null;
  endedAt: number | null;
  readyAt: number | null;
  results: Result[];
};
export type WodState = {
  plan: WodBlock[];
  progress: BlockProgress[];
  revision: number;
};
export type WodAction = {
  revision: number;
  block: number;
  kind: 'start' | 'record' | 'end';
  slot?: number;
  value?: number;
  weight?: number | null;
};

const integer = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

export function wodTarget(target: string): {value: number; metric: Metric} | null {
  const match = target.trim().match(/^(\d+(?:[.,]\d{1,2})?)\s*(reps?|repetições|m|s)?$/i);
  if (!match) return null;
  const value = Number(match[1].replace(',', '.'));
  const metric = match[2] === 'm' || match[2] === 's' ? match[2] : 'reps';
  if (value <= 0 || value > (metric === 'm' ? 1000000 : metric === 's' ? 3600 : 10000)) return null;
  if (metric !== 'm' && !Number.isInteger(value)) return null;
  return {value, metric};
}

export function normalizeWodPlan(input: unknown): WodBlock[] | null {
  if (!Array.isArray(input) || !input.length || input.length > 12) return null;
  const plan: WodBlock[] = [];
  let stations = 0;
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') return null;
    const {format, rounds, durationSeconds, restSeconds, exercises} = raw as Partial<WodBlock>;
    if (!format || !Object.prototype.hasOwnProperty.call(WOD_FORMATS, format)) return null;
    if (!Array.isArray(exercises)) return null;
    const itemsWithSets = format === 'linear' ? exercises
      : exercises.map(exercise => exercise && typeof exercise === 'object' ? {...exercise,sets:1} : exercise);
    const template = normalizeTemplate({name:'Bloco', exercises:itemsWithSets}, 'wod');
    if (!template || template.exercises.some(exercise => !wodTarget(exercise.target))) return null;
    if ((format === 'rounds' || format === 'for_time') && !integer(rounds, 1, 100)) return null;
    if ((format === 'emom' || format === 'amrap') && !integer(durationSeconds, 60, 7200)) return null;
    if (format === 'emom' && durationSeconds! % 60 !== 0) return null;
    if (format === 'for_time' && durationSeconds != null && !integer(durationSeconds, 1, 7200)) return null;
    if (format === 'rounds' && !integer(restSeconds, 0, 3600)) return null;
    const items = template.exercises;
    const count = items.reduce((sum, exercise) => sum + exercise.sets, 0);
    stations += format === 'rounds' || format === 'for_time' ? count * rounds! : count;
    plan.push({
      format, exercises:items,
      rounds:format === 'rounds' || format === 'for_time' ? rounds! : null,
      durationSeconds:format === 'amrap' || format === 'emom' || format === 'for_time' ? durationSeconds ?? null : null,
      restSeconds:format === 'rounds' ? restSeconds! : 0,
    });
  }
  return stations <= 1000 ? plan : null;
}

export function initialWod(plan: WodBlock[]): WodState {
  return {
    plan,
    progress:plan.map(() => ({startedAt:null,endedAt:null,readyAt:null,results:[]})),
    revision:0,
  };
}

export function wodCursor(block: WodBlock, progress: BlockProgress, now: number) {
  const elapsed = progress.startedAt === null ? 0 : Math.max(0, now - progress.startedAt);
  const expired = block.durationSeconds !== null && elapsed >= block.durationSeconds * 1000;
  const slot = block.format === 'emom'
    ? Math.min(Math.floor(elapsed / 60000), block.durationSeconds! / 60 - 1)
    : progress.results.length;
  const exerciseIndex = block.format === 'linear'
    ? block.exercises.findIndex((_, index) =>
      block.exercises.slice(0, index + 1).reduce((sum, exercise) => sum + exercise.sets, 0) > slot)
    : slot % block.exercises.length;
  const alreadyLogged = block.format === 'emom' && progress.results.at(-1)?.slot === slot;
  return {slot, exerciseIndex, elapsed, expired, alreadyLogged};
}

function isComplete(block: WodBlock, resultCount: number) {
  if (block.format === 'linear') return resultCount === block.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
  return block.rounds !== null && resultCount === block.rounds * block.exercises.length;
}

export function applyWodAction(state: WodState, action: WodAction, now: number, sessionId: string) {
  if (!action || action.revision !== state.revision) throw new Error('O treino mudou em outra tela. Confira a etapa atual.');
  const index = state.progress.findIndex(part => part.endedAt === null);
  if (index < 0 || action.block !== index) throw new Error('Este bloco não está disponível.');
  const block = state.plan[index];
  const previous = state.progress[index];
  const progress = {...previous, results:[...previous.results]};
  let set: StoredSet | null = null;
  if (action.kind === 'start') {
    if (progress.startedAt !== null) throw new Error('Este bloco já foi iniciado.');
    progress.startedAt = now;
  } else {
    if (action.kind !== 'record' && action.kind !== 'end') throw new Error('Ação inválida.');
    if (progress.startedAt === null && action.kind === 'record') throw new Error('Inicie o bloco primeiro.');
    const cursor = wodCursor(block, progress, now);
    const ending = action.kind === 'end';
    const hasResult = action.kind === 'record' || action.value !== undefined;
    if (hasResult) {
      if (progress.startedAt === null || cursor.alreadyLogged || cursor.exerciseIndex < 0 ||
          (progress.readyAt ?? 0) > now || action.slot !== cursor.slot || (!ending && cursor.expired)) {
        throw new Error('A etapa mudou ou o tempo acabou. Confira o bloco antes de registrar.');
      }
      const count = state.progress.reduce((sum, part) => sum + part.results.length, 0);
      if (count >= 3000) throw new Error('Limite de registros atingido. Encerre o bloco para salvar o treino.');
      const exercise = block.exercises[cursor.exerciseIndex];
      const target = wodTarget(exercise.target)!;
      const value = action.value;
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > target.value ||
          (!ending && block.format !== 'emom' && value !== target.value) ||
          (target.metric === 'm' ? Math.abs(value * 100 - Math.round(value * 100)) > 1e-6 : !Number.isInteger(value))) {
        throw new Error('Confira o valor realizado para este exercício.');
      }
      const weight = exercise.unit === 'none' ? null : action.weight;
      if (weight !== null && (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0 || weight > 2000)) {
        throw new Error('Confira a carga informada.');
      }
      const complete = value === target.value;
      progress.results.push({slot:cursor.slot,exercise:cursor.exerciseIndex,value,weight,complete,at:now});
      const setNumber = state.progress.reduce((sum, part, i) =>
        sum + part.results.filter(result => state.plan[i].exercises[result.exercise].key === exercise.key).length, 0) + 1;
      set = {
        id:`${sessionId}:${count+1}`,exercise_key:exercise.key,exercise_name:exercise.name,
        sort_order:count,block_number:index+1,set_number:setNumber,target_reps:exercise.target,
        actual_reps:target.metric === 'reps' ? value : null,actual_distance_m:target.metric === 'm' ? value : null,
        load_unit:exercise.unit,weight_kg:weight,completed:complete,completed_at:complete ? new Date(now).toISOString() : null,
      };
      if (complete && isComplete(block, progress.results.length)) progress.endedAt = now;
      if (block.format === 'rounds' && complete && (cursor.slot + 1) % block.exercises.length === 0)
        progress.readyAt = now + block.restSeconds * 1000;
      if (block.format === 'linear' && complete) progress.readyAt = now + (exercise.restSeconds ?? 0) * 1000;
    }
    if (ending || progress.endedAt !== null)
      progress.endedAt = block.durationSeconds !== null && progress.startedAt !== null
        ? Math.min(now, progress.startedAt + block.durationSeconds * 1000) : now;
  }
  const next = {...state,revision:state.revision+1,progress:state.progress.map((part, i) => i === index ? progress : part)};
  return {state:next,set};
}

export function wodScore(block: WodBlock, progress: BlockProgress) {
  const complete = progress.results.filter(result => result.complete);
  const rounds = Math.floor(complete.length / block.exercises.length);
  const actualTime = Math.max(0,(progress.endedAt ?? progress.startedAt ?? 0) - (progress.startedAt ?? 0));
  const elapsed = block.durationSeconds === null ? actualTime : Math.min(actualTime,block.durationSeconds*1000);
  const seconds = Math.round(elapsed / 1000);
  const clock = `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  if (block.format === 'emom') return `${complete.length} de ${block.durationSeconds! / 60} minutos concluídos`;
  if (block.format === 'linear') return `${complete.length} séries concluídas`;
  if (block.format === 'for_time' && rounds === block.rounds) return `Concluído em ${clock}`;
  const extra = progress.results.slice(rounds * block.exercises.length).map(result => {
    const exercise = block.exercises[result.exercise];
    return `${result.value} ${wodTarget(exercise.target)?.metric} · ${exercise.name}`;
  });
  return `${rounds}${block.rounds === null ? '' : ' de '+block.rounds} ${rounds === 1 && block.rounds === null ? 'volta' : 'voltas'}${extra.length ? ' + '+extra.join(', ') : ''}`;
}
