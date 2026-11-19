import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DEFAULT_GOAL, defaultMemberGoal, goalProgress, isValidGoal} from '../lib/goal.ts';

test('novo convidado começa no dia do cadastro, até 31/12, com sete treinos por semana', () => {
  const goal=defaultMemberGoal('2026-11-19');
  assert.deepEqual(goal,{
    name:'Minha primeira meta',
    starts_on:'2026-11-19',
    ends_on:'2026-12-31',
    workouts_per_week:7,
  });
  assert.equal(isValidGoal(goal),true);
  assert.equal(goalProgress(goal,[],'2026-11-19').planned,43);
});

test('padrão acompanha o ano de entrada sem alterar metas existentes', () => {
  const goal=defaultMemberGoal('2027-01-02');
  assert.equal(goal.ends_on,'2027-12-31');
  assert.equal(goal.workouts_per_week,7);
  assert.equal(DEFAULT_GOAL.name,'Projeto Carnaval');
  assert.equal(DEFAULT_GOAL.workouts_per_week,6);
});

test('frequência é editável entre 1 e 7, mas 8 é rejeitado', () => {
  const goal=defaultMemberGoal('2026-11-19');
  for(let n=1;n<=7;n++)assert.equal(isValidGoal({...goal,workouts_per_week:n}),true);
  for(const n of [0,8,2.5])assert.equal(isValidGoal({...goal,workouts_per_week:n}),false);
});

test('domingo conta como treino na semana de sete dias', () => {
  const goal={name:'Meta teste',starts_on:'2026-11-22',ends_on:'2026-11-23',workouts_per_week:7};
  const sessions=[{status:'finished',completed_sets:1,performed_on:'2026-11-22'}];
  assert.deepEqual(goalProgress(goal,sessions,'2026-11-22'),{
    daysLeft:1,
    planned:2,
    checkins:1,
  });
});

test('seis treinos semanais continua sendo um limite editável', () => {
  const goal={name:'Meta teste',starts_on:'2026-11-16',ends_on:'2026-11-22',workouts_per_week:6};
  assert.equal(goalProgress(goal,[],'2026-11-16').planned,6);
});
