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
export const TEMPLATES: Template[] = [
  { id: 'A', name: 'Glúteos + posterior', description: 'Sua ficha de força para glúteos e posteriores.', days: 'Segunda e sexta', category: 'Força · Inferiores', exercises: [
    { key: 'elevacao-pelvica', name: 'Elevação pélvica', sets: 4, target: '8 repetições', defaultLoad: 50, unit: 'kg' },
    { key: 'coice-cabo', name: 'Coice no cabo', sets: 2, target: '12 repetições', defaultLoad: 30, unit: 'kg' },
    { key: 'mesa-flexora', name: 'Mesa flexora', sets: 3, target: '10 repetições', defaultLoad: 23, unit: 'kg' },
    { key: 'cadeira-abdutora', name: 'Cadeira abdutora', sets: 3, target: '12 repetições', defaultLoad: 45, unit: 'kg' },
    { key: 'abdominal-pernas-elevadas', name: 'Abdominal pernas elevadas', sets: 3, target: '20 repetições', defaultLoad: null, unit: 'none' }
  ]},
  { id: 'B', name: 'Superiores', description: 'Manutenção de superiores e evolução para barra fixa.', days: 'Terça', category: 'Força · Superiores', exercises: [
    { key: 'remada-frontal-baixa', name: 'Remada frontal baixa', sets: 2, target: '12 repetições', defaultLoad: 15, unit: 'kg' },
    { key: 'supino-reto', name: 'Supino reto', sets: 2, target: '12 repetições', defaultLoad: 5, unit: 'kg' },
    { key: 'elevacao-frontal', name: 'Elevação frontal', sets: 2, target: '10 repetições', defaultLoad: 2, unit: 'kg' },
    { key: 'rosca-martelo', name: 'Rosca martelo', sets: 3, target: '10 repetições', defaultLoad: 3, unit: 'kg' },
    { key: 'graviton-pronada', name: 'Barra fixa Graviton · pegada pronada', sets: 2, target: '10 repetições', defaultLoad: 20, unit: 'assist_kg', tip: 'Aqui o valor é a assistência: reduzir gradualmente significa evoluir.' },
    { key: 'abdominal-polia', name: 'Abdominal na polia', sets: 3, target: '20 repetições', defaultLoad: 20, unit: 'kg' }
  ]},
  { id: 'C', name: 'Quadríceps + glúteos', description: 'Ênfase em quadríceps com estímulo complementar de glúteos.', days: 'Quarta', category: 'Força · Inferiores', exercises: [
    { key: 'agachamento-smith', name: 'Agachamento Smith', sets: 3, target: '10 repetições', defaultLoad: 10, unit: 'kg' },
    { key: 'leg-press', name: 'Leg press', sets: 2, target: '10 repetições', defaultLoad: null, unit: 'kg', tip: 'Carga ainda não informada; registre a utilizada.' },
    { key: 'cadeira-extensora', name: 'Cadeira extensora', sets: 3, target: '10 repetições', defaultLoad: 20, unit: 'kg' },
    { key: 'abducao-cabo-cruzado', name: 'Abdução no cabo cruzado', sets: 2, target: '10 repetições', defaultLoad: 15, unit: 'kg' },
    { key: 'gluteo-banco-romano', name: 'Glúteo no banco romano', sets: 2, target: '12 repetições', defaultLoad: 20, unit: 'kg' },
    { key: 'abdominal-pernas-elevadas', name: 'Abdominal pernas elevadas', sets: 3, target: '20 repetições', defaultLoad: null, unit: 'none' }
  ]},
  { id: 'D', name: 'HYROX adaptado', description: 'Seis intervalos de 500 m a 10 km/h, intercalados com core e funcional.', days: 'Quinta e sábado', category: 'Cardio · Funcional', exercises: [
    { key: 'corrida-1', name: 'Corrida · bloco 1', sets: 1, target: '500 metros', defaultLoad: 10, unit: 'km/h', block: 1 },
    { key: 'burpees', name: 'Burpees sem salto', sets: 1, target: '15 repetições', defaultLoad: null, unit: 'none', block: 1 },
    { key: 'corrida-2', name: 'Corrida · bloco 2', sets: 1, target: '500 metros', defaultLoad: 10, unit: 'km/h', block: 2 },
    { key: 'prancha-frontal', name: 'Prancha frontal', sets: 2, target: '30 segundos', defaultLoad: null, unit: 'none', block: 2 },
    { key: 'corrida-3', name: 'Corrida · bloco 3', sets: 1, target: '500 metros', defaultLoad: 10, unit: 'km/h', block: 3 },
    { key: 'flexao-inclinada', name: 'Flexão inclinada', sets: 2, target: '8 repetições', defaultLoad: null, unit: 'none', block: 3 },
    { key: 'corrida-4', name: 'Corrida · bloco 4', sets: 1, target: '500 metros', defaultLoad: 10, unit: 'km/h', block: 4 },
    { key: 'crunch-sem-peso', name: 'Crunch sem peso', sets: 2, target: '15 repetições', defaultLoad: null, unit: 'none', block: 4 },
    { key: 'corrida-5', name: 'Corrida · bloco 5', sets: 1, target: '500 metros', defaultLoad: 10, unit: 'km/h', block: 5 },
    { key: 'prancha-alta-toque', name: 'Prancha alta com toque nos ombros', sets: 1, target: '15 toques no total', defaultLoad: null, unit: 'none', block: 5 },
    { key: 'corrida-6', name: 'Corrida · bloco 6', sets: 1, target: '500 metros', defaultLoad: 10, unit: 'km/h', block: 6 },
    { key: 'mountain-climber-prancha', name: 'Mountain climbers + prancha', sets: 1, target: '20 movimentos + 30 segundos', defaultLoad: null, unit: 'none', block: 6 }
  ]}
];
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
export type HistoryData = {sessions: WorkoutSession[]; progress: {exercise_key:string;exercise_name:string;load_unit:Unit;performed_on:string;weight_kg:number;session_id:string}[];goal?:import('./goal').TrainingGoal;templates?:Template[];historicalExercises?:{key:string;name:string;unit:Unit}[]};
export const makeSets = (template: Template, past: Record<string, number> = {}): StoredSet[] => template.exercises.flatMap((e, index) => Array.from({length: e.sets}, (_, i) => ({
  id: `${e.key}-${i+1}`, exercise_key: e.key, exercise_name: e.name, sort_order: index, block_number: e.block ?? null,
  set_number: i+1, target_reps: e.target, load_unit: e.unit, weight_kg: past[e.key] ?? e.defaultLoad,
  completed: false, completed_at: null
})));
