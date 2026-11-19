import type { Unit } from './templates';
import type { Modality } from './personalRecords';

export type CatalogExercise = {
  key: string;
  name: string;
  unit: Unit;
  modality: Modality;
  origin: 'global' | 'personal' | 'existing';
};

// Nomes e identidades são estáveis para todas as contas; nenhuma conta pode editar esta lista.
const entries: [string,string,Unit,Modality][] = [
  ['supino-reto','Supino reto','kg','Academia'],
  ['supino-inclinado','Supino inclinado','kg','Academia'],
  ['supino-declinado','Supino declinado','kg','Academia'],
  ['remada-baixa','Remada baixa','kg','Academia'],
  ['remada-curvada','Remada curvada','kg','Academia'],
  ['puxada-alta','Puxada alta','kg','Academia'],
  ['desenvolvimento','Desenvolvimento de ombros','kg','Academia'],
  ['elevacao-lateral','Elevação lateral','kg','Academia'],
  ['elevacao-frontal','Elevação frontal','kg','Academia'],
  ['rosca-direta','Rosca direta','kg','Academia'],
  ['rosca-martelo','Rosca martelo','kg','Academia'],
  ['triceps-polia','Tríceps na polia','kg','Academia'],
  ['agachamento-livre','Agachamento livre','kg','Academia'],
  ['agachamento-smith','Agachamento no Smith','kg','Academia'],
  ['leg-press','Leg press','kg','Academia'],
  ['mesa-flexora','Mesa flexora','kg','Academia'],
  ['cadeira-extensora','Cadeira extensora','kg','Academia'],
  ['cadeira-abdutora','Cadeira abdutora','kg','Academia'],
  ['elevacao-pelvica','Elevação pélvica','kg','Academia'],
  ['stiff','Stiff','kg','Academia'],
  ['levantamento-terra','Levantamento terra','kg','Academia'],
  ['coice-polia','Coice na polia','kg','Academia'],
  ['abdominal-pernas-elevadas','Abdominal com pernas elevadas','none','Academia'],
  ['abdominal-polia','Abdominal na polia','kg','Academia'],
  ['flexao','Flexão de braço','none','Calistenia'],
  ['flexao-inclinada','Flexão inclinada','none','Calistenia'],
  ['barra-fixa','Barra fixa','none','Calistenia'],
  ['prancha','Prancha','none','Funcional'],
  ['burpee','Burpee','none','CrossFit'],
  ['box-jump','Box jump','none','CrossFit'],
  ['wall-ball','Wall ball','kg','CrossFit'],
  ['thruster','Thruster','kg','CrossFit'],
  ['clean','Clean','kg','CrossFit'],
  ['snatch','Snatch','kg','CrossFit'],
  ['deadlift-cross','Deadlift','kg','CrossFit'],
  ['kettlebell-swing','Kettlebell swing','kg','CrossFit'],
  ['double-under','Double under','none','CrossFit'],
  ['rowing-erg','Remo ergométrico','none','CrossFit'],
  ['ski-erg','SkiErg','none','CrossFit'],
  ['sled-push','Sled push','kg','CrossFit'],
  ['sled-pull','Sled pull','kg','CrossFit'],
  ['farmer-carry','Farmer carry','kg','CrossFit'],
  ['corrida','Corrida','km/h','Corrida'],
  ['caminhada','Caminhada','km/h','Corrida'],
  ['corrida-longao','Longão (corrida)','km/h','Corrida'],
  ['corrida-fartlek','Fartlek (corrida)','km/h','Corrida'],
  ['corrida-intervalada','Corrida intervalada','km/h','Corrida'],
  ['alongamento-geral','Alongamento geral','none','Alongamentos'],
  ['mobilidade-quadril','Mobilidade de quadril','none','Alongamentos'],
  ['mobilidade-ombro','Mobilidade de ombros','none','Alongamentos'],
  ['pilates-solo','Pilates solo','none','Pilates']
];
export const BASE_EXERCISES: CatalogExercise[] = entries.map(([slug,name,unit,modality])=>({
  key:`catalog-${slug}`,name,unit,modality,origin:'global'
}));
export const normalizeExerciseName=(name:string)=>name.normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim().replace(/\s+/g,' ');
export function mergedExerciseCatalog(
  existing: CatalogExercise[], personal:CatalogExercise[], global:CatalogExercise[]=BASE_EXERCISES
):CatalogExercise[]{
  // Preferir IDs já utilizados na conta para não quebrar histórico ou PRs anteriores.
  const result:CatalogExercise[]=[];
  const seen=new Set<string>();
  for(const item of [...existing,...personal,...global]){
    const key=normalizeExerciseName(item.name);
    if(!key||seen.has(key))continue;
    seen.add(key);result.push(item);
  }
  return result.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
