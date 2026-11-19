/** Estimativa de 1RM para exercícios resistidos com carga externa (kg). */
export const DEFAULT_MODALITIES = ['Academia', 'CrossFit', 'Funcional', 'Calistenia', 'Levantamento olímpico', 'Outros'] as const;
export const UNCLASSIFIED_MODALITY = 'Não classificado';
export type Intensity = 'Leve' | 'Moderada' | 'Pesada' | 'Transição' | 'Muito leve' | 'Acima do PR estimado';
export function epley1RM(weightKg: number, reps: number): number {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || !Number.isInteger(reps) || reps < 1 || reps > 30) return NaN;
  // Uma repetição máxima medida já é 1RM; não extrapolar uma repetição com Epley.
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}
export function plannedLoad(oneRM: number, reps: number): number {
  if (!Number.isFinite(oneRM) || oneRM <= 0 || !Number.isInteger(reps) || reps < 1 || reps > 30) return NaN;
  return reps === 1 ? oneRM : oneRM / (1 + reps / 30);
}
export function intensityForPercentage(percent: number): Intensity {
  if (percent > 100) return 'Acima do PR estimado';
  if (percent >= 85) return 'Pesada';
  if (percent >= 70) return 'Moderada';
  if (percent >= 60) return 'Transição';
  if (percent >= 40) return 'Leve';
  return 'Muito leve';
}
export const formattedLoad = (value:number) => Number.isFinite(value) ? value.toLocaleString('pt-BR',{maximumFractionDigits:1}) : '—';
