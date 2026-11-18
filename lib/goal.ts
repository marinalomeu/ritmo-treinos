import type { HistoryData } from './templates';

export type TrainingGoal = {
  name: string;
  starts_on: string;
  ends_on: string;
  workouts_per_week: number;
};
export const DEFAULT_GOAL: TrainingGoal = {
  name: 'Projeto Carnaval', starts_on: '2026-11-18', ends_on: '2027-02-11', workouts_per_week: 6
};
export const SHOWCASE_GOAL: TrainingGoal = {
  name: 'Desafio 8 semanas', starts_on: '2026-11-02', ends_on: '2027-01-03', workouts_per_week: 5
};
const DAY_MS = 86400000;
export const utcDay = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
};
const isoFromDay = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);
const isTrainingDay = (day: number) => new Date(day * DAY_MS).getUTCDay() !== 0;
const monday = (day: number) => (day - (new Date(day * DAY_MS).getUTCDay() + 6) % 7);
export const isValidGoal = (goal: TrainingGoal) =>
  typeof goal.name === 'string' && goal.name.trim().length >= 2 && goal.name.trim().length <= 60 &&
  typeof goal.starts_on === 'string' && typeof goal.ends_on === 'string' &&
  [goal.starts_on, goal.ends_on].every(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && isoFromDay(utcDay(d)) === d) &&
  utcDay(goal.ends_on) >= utcDay(goal.starts_on) &&
  utcDay(goal.ends_on) - utcDay(goal.starts_on) <= 365 * 5 &&
  Number.isInteger(goal.workouts_per_week) && goal.workouts_per_week >= 1 && goal.workouts_per_week <= 6;

export const goalProgress = (goal: TrainingGoal, sessions: HistoryData['sessions'], today: string) => {
  const from = utcDay(goal.starts_on), to = utcDay(goal.ends_on);
  const weekly = new Map<number, {slots:number,checkins:Set<string>}>();
  for (let day = from; day <= to; day++) {
    if (!isTrainingDay(day)) continue;
    const week = monday(day), entry = weekly.get(week) || {slots:0,checkins:new Set<string>()};
    entry.slots++;
    weekly.set(week,entry);
  }
  for (const s of sessions) {
    if (s.status !== 'finished' || s.completed_sets < 1 || s.performed_on > today || s.performed_on < goal.starts_on || s.performed_on > goal.ends_on) continue;
    const day = utcDay(s.performed_on);
    if (!isTrainingDay(day)) continue;
    weekly.get(monday(day))?.checkins.add(s.performed_on);
  }
  const weeklyEntries = [...weekly.values()];
  return {
    daysLeft: Math.max(0,to-utcDay(today)),
    planned:weeklyEntries.reduce((sum,w)=>sum+Math.min(goal.workouts_per_week,w.slots),0),
    checkins:weeklyEntries.reduce((sum,w)=>sum+Math.min(goal.workouts_per_week,w.checkins.size),0)
  };
};
