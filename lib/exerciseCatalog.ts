import type { Unit } from './templates';
import type { Modality } from './personalRecords';

export type CatalogExercise = {
  key: string;
  name: string;
  unit: Unit;
  modality: Modality;
  origin: 'global' | 'personal' | 'existing';
  muscleGroup?: string;
  equipment?: string;
  aliases?: string[];
};
export const MUSCLE_GROUPS=['Peitoral','Costas','Quadríceps','Posteriores','Glúteos','Panturrilhas','Ombros','Bíceps','Tríceps','Antebraços','Abdômen e core','Cardiorrespiratório','Corpo inteiro','Mobilidade'] as const;
export const EQUIPMENT_TYPES=['Máquina','Polia','Smith','Barra','Halter','Kettlebell','Peso corporal','Acessório','Cardio','Misto'] as const;

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
const groupOf=(slug:string):string=>{
  if(/supino|crucifixo|crossover|peck-deck|pullover|flexao|paralelas-peitoral/.test(slug))return 'Peitoral';
  if(/remada|puxada|barra-fixa|graviton|encolhimento|banco-romano/.test(slug))return 'Costas';
  if(/agachamento|leg-press|extensora|afundo|passada/.test(slug))return 'Quadríceps';
  if(/mesa-flexora|cadeira-flexora|stiff|romeno|terra/.test(slug))return 'Posteriores';
  if(/abdutora|elevacao-pelvica|coice|gluteo/.test(slug))return 'Glúteos';
  if(/panturrilha/.test(slug))return 'Panturrilhas';
  if(/desenvolvimento|elevacao-lateral|elevacao-frontal|face-pull|voador-invertido/.test(slug))return 'Ombros';
  if(/rosca|biceps/.test(slug))return 'Bíceps';
  if(/triceps|paralelas/.test(slug))return 'Tríceps';
  if(/abdominal|prancha|russian|vacuum/.test(slug))return 'Abdômen e core';
  if(/corrida|caminhada|bike|esteira|erg|eliptico|escada/.test(slug))return 'Cardiorrespiratório';
  if(/alongamento|mobilidade|pilates/.test(slug))return 'Mobilidade';
  return 'Corpo inteiro';
};
const equipmentOf=(slug:string):string=>{
  if(/smith/.test(slug))return 'Smith';
  if(/polia|puxada-alta|crossover|face-pull/.test(slug))return 'Polia';
  if(/maquina|mesa|cadeira|leg-press|graviton|hack/.test(slug))return 'Máquina';
  if(/halter/.test(slug))return 'Halter';
  if(/kettlebell/.test(slug))return 'Kettlebell';
  if(/barra|supino|agachamento|levantamento|stiff|remada-curvada/.test(slug))return 'Barra';
  if(/corrida|caminhada|bike|esteira|erg|eliptico|escada/.test(slug))return 'Cardio';
  return 'Misto';
};
const extraData = `
Peitoral|Máquina|Supino reto na máquina|supino-reto-maquina|kg|Academia
Peitoral|Máquina|Supino inclinado na máquina|supino-inclinado-maquina|kg|Academia
Peitoral|Máquina|Supino declinado na máquina|supino-declinado-maquina|kg|Academia
Peitoral|Máquina|Peck Deck / Voador|peck-deck|kg|Academia
Peitoral|Polia|Crossover na polia alta|crossover-alta|kg|Academia
Peitoral|Polia|Crossover na polia média|crossover-media|kg|Academia
Peitoral|Polia|Crossover na polia baixa|crossover-baixa|kg|Academia
Peitoral|Smith|Supino reto no Smith|supino-reto-smith|kg|Academia
Peitoral|Smith|Supino inclinado no Smith|supino-inclinado-smith|kg|Academia
Peitoral|Halter|Supino reto com halteres|supino-reto-halteres|kg|Academia
Peitoral|Halter|Supino inclinado com halteres|supino-inclinado-halteres|kg|Academia
Peitoral|Halter|Supino declinado com halteres|supino-declinado-halteres|kg|Academia
Peitoral|Halter|Crucifixo reto com halteres|crucifixo-reto|kg|Academia
Peitoral|Halter|Crucifixo inclinado com halteres|crucifixo-inclinado|kg|Academia
Peitoral|Halter|Crucifixo declinado com halteres|crucifixo-declinado|kg|Academia
Peitoral|Halter|Pullover com halter|pullover-halter|kg|Academia
Peitoral|Barra|Pullover com barra|pullover-barra|kg|Academia
Peitoral|Peso corporal|Flexão declinada|flexao-declinada|none|Funcional
Peitoral|Peso corporal|Flexão diamante|flexao-diamante|none|Funcional
Peitoral|Peso corporal|Paralelas para peitoral|paralelas-peitoral|none|Funcional
Costas|Polia|Puxada frontal aberta|puxada-frontal-aberta|kg|Academia
Costas|Polia|Puxada frontal fechada|puxada-frontal-fechada|kg|Academia
Costas|Polia|Puxada frontal supinada|puxada-frontal-supinada|kg|Academia
Costas|Polia|Puxada frontal triângulo|puxada-frontal-triangulo|kg|Academia
Costas|Polia|Remada baixa no triângulo|remada-baixa-triangulo|kg|Academia
Costas|Máquina|Remada articulada|remada-articulada|kg|Academia
Costas|Máquina|Remada cavalinho na máquina|remada-cavalinho-maquina|kg|Academia
Costas|Máquina|Graviton (barra fixa assistida)|graviton|assist_kg|Academia
Costas|Polia|Pullover na polia alta|pullover-polia|kg|Academia
Costas|Máquina|Banco romano / Hiperextensão|banco-romano|kg|Academia
Costas|Peso corporal|Barra fixa supinada|barra-fixa-supinada|none|Calistenia
Costas|Halter|Remada unilateral com halter|remada-unilateral-halter|kg|Academia
Costas|Barra|Remada cavalinho livre|remada-cavalinho-livre|kg|Academia
Costas|Halter|Encolhimento de ombros com halteres|encolhimento-halter|kg|Academia
Costas|Barra|Encolhimento de ombros com barra|encolhimento-barra|kg|Academia
Costas|Barra|Remada alta com barra|remada-alta-barra|kg|Academia
Costas|Halter|Remada alta com halteres|remada-alta-halter|kg|Academia
Quadríceps|Máquina|Leg press 45°|leg-press-45|kg|Academia
Quadríceps|Máquina|Leg press horizontal|leg-press-horizontal|kg|Academia
Quadríceps|Máquina|Leg press vertical|leg-press-vertical|kg|Academia
Posteriores|Máquina|Cadeira flexora|cadeira-flexora|kg|Academia
Posteriores|Máquina|Flexora vertical unilateral|flexora-vertical|kg|Academia
Quadríceps|Máquina|Agachamento Hack|agachamento-hack|kg|Academia
Quadríceps|Máquina|Agachamento pendular|agachamento-pendular|kg|Academia
Quadríceps|Máquina|V-Squat|v-squat|kg|Academia
Glúteos|Máquina|Cadeira adutora|cadeira-adutora|kg|Academia
Glúteos|Máquina|Elevação pélvica na máquina|elevacao-pelvica-maquina|kg|Academia
Glúteos|Máquina|Coice de glúteo na máquina|coice-gluteo-maquina|kg|Academia
Panturrilhas|Máquina|Panturrilha sentado|panturrilha-sentado|kg|Academia
Panturrilhas|Máquina|Panturrilha em pé na máquina|panturrilha-maquina|kg|Academia
Quadríceps|Barra|Agachamento frontal|agachamento-frontal|kg|Academia
Quadríceps|Halter|Agachamento Goblet|agachamento-goblet|kg|Academia
Quadríceps|Misto|Agachamento sumô|agachamento-sumo|kg|Academia
Quadríceps|Misto|Agachamento búlgaro|agachamento-bulgaro|kg|Academia
Quadríceps|Misto|Afundo / Passada|afundo-passada|kg|Academia
Posteriores|Barra|Levantamento terra romeno (RDL)|terra-romeno|kg|Academia
Glúteos|Polia|Abdução de quadril na polia|abducao-polia|kg|Academia
Glúteos|Polia|Extensão de quadril na polia|extensao-quadril-polia|kg|Academia
Panturrilhas|Peso corporal|Panturrilha no degrau|panturrilha-degrau|none|Funcional
Panturrilhas|Smith|Panturrilha no Smith|panturrilha-smith|kg|Academia
Ombros|Máquina|Desenvolvimento na máquina|desenvolvimento-maquina|kg|Academia
Ombros|Smith|Desenvolvimento no Smith|desenvolvimento-smith|kg|Academia
Ombros|Máquina|Elevação lateral na máquina|elevacao-lateral-maquina|kg|Academia
Ombros|Máquina|Voador invertido na máquina|voador-invertido|kg|Academia
Ombros|Polia|Elevação lateral na polia|elevacao-lateral-polia|kg|Academia
Ombros|Polia|Elevação frontal na polia|elevacao-frontal-polia|kg|Academia
Ombros|Polia|Crucifixo inverso na polia|crucifixo-inverso-polia|kg|Academia
Ombros|Polia|Face Pull|face-pull|kg|Academia
Ombros|Halter|Desenvolvimento com halteres|desenvolvimento-halter|kg|Academia
Ombros|Barra|Desenvolvimento militar com barra|desenvolvimento-militar|kg|Academia
Ombros|Halter|Desenvolvimento Arnold|desenvolvimento-arnold|kg|Academia
Ombros|Halter|Crucifixo inverso inclinado|crucifixo-inverso-inclinado|kg|Academia
Tríceps|Polia|Tríceps francês na polia|triceps-frances-polia|kg|Academia
Tríceps|Polia|Tríceps coice na polia|triceps-coice-polia|kg|Academia
Tríceps|Máquina|Máquina de tríceps|triceps-maquina|kg|Academia
Bíceps|Polia|Rosca direta na polia|rosca-direta-polia|kg|Academia
Bíceps|Máquina|Rosca Scott na máquina|rosca-scott-maquina|kg|Academia
Bíceps|Máquina|Máquina de bíceps articulada|biceps-maquina|kg|Academia
Bíceps|Halter|Rosca alternada com halteres|rosca-alternada|kg|Academia
Bíceps|Halter|Rosca concentrada|rosca-concentrada|kg|Academia
Bíceps|Halter|Rosca inclinada com halteres|rosca-inclinada|kg|Academia
Bíceps|Barra|Rosca Scott livre|rosca-scott-livre|kg|Academia
Tríceps|Barra|Tríceps testa|triceps-testa|kg|Academia
Tríceps|Halter|Tríceps francês com halter|triceps-frances-halter|kg|Academia
Tríceps|Halter|Tríceps coice com halter|triceps-coice-halter|kg|Academia
Tríceps|Peso corporal|Tríceps banco|triceps-banco|none|Funcional
Tríceps|Peso corporal|Paralelas para tríceps|paralelas-triceps|none|Funcional
Antebraços|Barra|Rosca punho|rosca-punho|kg|Academia
Antebraços|Barra|Rosca punho invertida|rosca-punho-invertida|kg|Academia
Abdômen e core|Máquina|Máquina de abdominal|maquina-abdominal|kg|Academia
Abdômen e core|Máquina|Cadeira abdominal / Elevação de pernas|cadeira-abdominal|none|Academia
Abdômen e core|Acessório|Roda abdominal|roda-abdominal|none|Funcional
Abdômen e core|Peso corporal|Abdominal supra|abdominal-supra|none|Funcional
Abdômen e core|Peso corporal|Abdominal infra|abdominal-infra|none|Funcional
Abdômen e core|Peso corporal|Abdominal oblíquo bicicleta|abdominal-bicicleta|none|Funcional
Abdômen e core|Peso corporal|Abdominal remador|abdominal-remador|none|Funcional
Abdômen e core|Peso corporal|Abdominal canivete|abdominal-canivete|none|Funcional
Abdômen e core|Peso corporal|Prancha lateral|prancha-lateral|none|Funcional
Abdômen e core|Peso corporal|Vacuum abdominal|vacuum-abdominal|none|Funcional
Abdômen e core|Acessório|Russian Twist|russian-twist|none|Funcional
Cardiorrespiratório|Cardio|Esteira ergométrica|esteira-ergometrica|km/h|Academia
Cardiorrespiratório|Cardio|Bicicleta ergométrica vertical|bicicleta-ergometrica-vertical|none|Academia
Cardiorrespiratório|Cardio|Bicicleta ergométrica horizontal|bicicleta-ergometrica-horizontal|none|Academia
Cardiorrespiratório|Cardio|Bicicleta de Spinning|bicicleta-spinning|none|Academia
Cardiorrespiratório|Cardio|Elíptico|eliptico|none|Academia
Cardiorrespiratório|Cardio|Simulador de escada|simulador-escada|none|Academia
Cardiorrespiratório|Cardio|Remo seco Concept2|remo-seco-concept2|none|Academia
Cardiorrespiratório|Cardio|Air Bike|air-bike|none|Academia
`.trim();
const extras:CatalogExercise[]=extraData.split('\n').map((line)=>{
  const [muscleGroup,equipment,name,slug,unit,modality]=line.split('|');
  return {key:`catalog-${slug}`,name,unit:unit as Unit,modality:modality as Modality,origin:'global',muscleGroup,equipment};
});
const legacy:CatalogExercise[]=entries.map(([slug,name,unit,modality])=>({
  key:`catalog-${slug}`,name,unit,modality:slug==='flexao'||slug==='flexao-inclinada'?'Funcional':modality,
  origin:'global',muscleGroup:groupOf(slug),equipment:equipmentOf(slug)
}));
export const BASE_EXERCISES: CatalogExercise[]=[...legacy,...extras];
export const normalizeExerciseName=(name:string)=>name.normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim().replace(/\s+/g,' ');
export function mergedExerciseCatalog(
  existing: CatalogExercise[], personal:CatalogExercise[], global:CatalogExercise[]=BASE_EXERCISES
):CatalogExercise[]{
  // Reaproveitar chaves existentes sem perder a classificação do catálogo público
  // quando um exercício da ficha aparece antes da versão canônica na lista.
  const byName=new Map(global.map(item=>[normalizeExerciseName(item.name),item]));
  const result:CatalogExercise[]=[];
  const seen=new Set<string>();
  for(const item of [...existing,...personal,...global]){
    const key=normalizeExerciseName(item.name);
    if(!key||seen.has(key))continue;
    seen.add(key);
    const canonical=byName.get(key);
    result.push({...item,muscleGroup:item.muscleGroup||canonical?.muscleGroup,
      equipment:item.equipment||canonical?.equipment});
  }
  return result.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
