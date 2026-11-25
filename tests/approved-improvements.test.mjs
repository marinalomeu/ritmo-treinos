import assert from 'node:assert/strict';
import {test} from 'node:test';
import {prescribedReps,prescribedDistanceMeters,makeSets} from '../lib/templates.ts';
import {SHARE_PALETTES,SHARE_COMPOSITIONS,shareAwardLabels,workoutShareSummary} from '../lib/workoutShare.ts';

test('repetições numéricas inequívocas começam previstas mas não são histórico realizado',()=>{
 assert.equal(prescribedReps('10 repetições'),10);
 assert.equal(prescribedReps('100 repetições'),100);
 assert.equal(prescribedReps('8 reps'),8);
 assert.equal(prescribedReps('10'),10);
 for(const value of ['AMRAP','60 segundos','21-15-9','3 x 10 repetições','1.609,34 m','500 m']){
  assert.equal(prescribedReps(value),null,value);
 }
 const template={id:'test',name:'Teste',description:'',days:'',category:'',exercises:[
  {key:'abd',name:'Abdominal',sets:3,target:'10 repetições',defaultLoad:6,unit:'kg'}
 ]};
 const sets=makeSets(template);
 assert.equal(sets.length,3);
 assert.deepEqual(sets.map(s=>s.weight_kg),[6,6,6]);
 assert.deepEqual(sets.map(s=>s.actual_reps),[null,null,null]);
});
test('distância e repetições ficam em campos distintos, inclusive 1.609,34 m',()=>{
 assert.equal(prescribedDistanceMeters('1.609,34 m'),1609.34);
 assert.equal(prescribedDistanceMeters('500 m'),500);
 assert.equal(prescribedDistanceMeters('5 km'),5000);
 assert.equal(prescribedDistanceMeters('100 repetições'),null);
 assert.equal(prescribedDistanceMeters('AMRAP'),null);
});
test('cinco paletas e cinco composições, conquista impossível nunca ativada',()=>{
 assert.equal(SHARE_PALETTES.length,5);
 assert.equal(new Set(SHARE_PALETTES.map(p=>p.value)).size,5);
 assert.equal(SHARE_COMPOSITIONS.length,5);
 const notEligible={pr:false,prCount:0,week:false,month:false,weekCount:0,weekTarget:4,monthCount:0,monthTarget:16};
 assert.deepEqual(shareAwardLabels('all',notEligible),[]);
 const prOnly={...notEligible,pr:true,prCount:1};
 assert.deepEqual(shareAwardLabels('all',prOnly),['PR BATIDO']);
 const earned={...prOnly,week:true,month:true,weekCount:4,monthCount:16};
 assert.equal(shareAwardLabels('all',earned).length,3);
});
test('tempo de pausa não é contado duas vezes no Story',()=>{
 const detail={session:{started_at:'2026-11-20T12:00:00Z',finished_at:'2026-11-20T12:30:00Z',paused_ms:300000},sets:[]};
 assert.equal(workoutShareSummary(detail).elapsed,'00:25');
});

test('seed de bioimpedância fictício exclusivo da demonstração tem seis meses e métricas personalizadas',async()=>{
 const {demoBodyData,firstAchievement,latestForMetric,validateEvaluation}=await import('../lib/bodyMetrics.ts');
 const sample=demoBodyData();
 assert.equal(sample.evaluations.length,6);
 assert.equal(new Set(sample.evaluations.map(e=>e.measured_on.slice(0,7))).size,6);
 assert.ok(sample.metrics.some(m=>m.custom));
 assert.ok(sample.evaluations.every(e=>validateEvaluation(e,sample.metrics)));
 const goal=sample.goals.find(g=>g.metric_key==='waist_cm');
 assert.ok(goal);
 assert.equal(firstAchievement(goal,sample.evaluations)?.measured_on,'2026-11-13');
 assert.equal(latestForMetric(sample,'waist_cm')?.values.waist_cm,77.5);
 const retro={...sample.evaluations[5],id:'retro',measured_on:'2026-09-15',values:{waist_cm:77.4}};
 assert.equal(firstAchievement(goal,[...sample.evaluations,retro])?.measured_on,'2026-09-15');
 assert.equal(firstAchievement(goal,[...sample.evaluations,{...retro,deleted_at:'2026-11-20'}])?.measured_on,'2026-11-13');
});
test('demo efêmera não deve persistir no navegador ou acessar banco real',async()=>{
 const fs=await import('node:fs');
 const client=fs.readFileSync(new URL('../lib/clientStore.ts',import.meta.url),'utf8');
 assert.match(client,/if\(mode==='showcase'\)return JSON.parse\(JSON.stringify\(showcaseSessions/);
 assert.match(client,/if\(mode==='showcase'\)\{showcaseSessions=/);
 assert.match(client,/if\(mode==='showcase'\)showcaseExercises=/);
 const dashboard=fs.readFileSync(new URL('../components/BodyDashboard.tsx',import.meta.url),'utf8');
 assert.match(dashboard,/if\(mode==='cloud'\)\{/);
 assert.match(dashboard,/mode==='showcase'\?demoBodyData\(\)/);
 const api=fs.readFileSync(new URL('../app\/api\/body\/route.ts',import.meta.url),'utf8');
 assert.match(api,/currentProfile\(\)/);
 assert.match(api,/sameOrigin\(request\)/);
 assert.match(api,/WHERE user_id=/);
});

const movement=(key,target,sets=1)=>({key:key.normalize('NFD').replace(/\p{Diacritic}/gu,''),name:key,target,sets,unit:'none',defaultLoad:null});
const wodBlock=(format, exercises, rounds=null,durationSeconds=null,restSeconds=0)=>({format,exercises,rounds,durationSeconds,restSeconds});

test('voltas fixas avançam na ordem, preservam descanso e permitem repetir o mesmo exercício em blocos distintos',async()=>{
  const {normalizeWodPlan,initialWod,applyWodAction,wodScore}=await import('../lib/wodBlocks.ts');
  const plan=normalizeWodPlan([
    wodBlock('rounds',[movement('Flexão','8'),movement('Corrida','200 m')],2,null,15),
    wodBlock('linear',[movement('Flexão','5')])
  ]);
  assert.ok(plan);
  let state=initialWod(plan);
  const action=(block,kind,now,slot,value)=>{
    const result=applyWodAction(state,{block,kind,slot,value,revision:state.revision},now,'wod-id');
    state=result.state;
    return result.set;
  };
  action(0,'start',1000);
  assert.equal(action(0,'record',2000,0,8).exercise_name,'Flexão');
  assert.equal(action(0,'record',3000,1,200).actual_distance_m,200);
  assert.throws(()=>action(0,'record',5000,2,8),/etapa mudou/);
  assert.equal(action(0,'record',18000,2,8).set_number,2);
  action(0,'record',20000,3,200);
  assert.match(wodScore(plan[0],state.progress[0]),/^2 de 2 voltas$/);
  action(1,'start',20001);
  const later=action(1,'record',22000,0,5);
  assert.equal(later.block_number,2);
  assert.equal(later.set_number,3);
  assert.equal(later.actual_reps,5);
});

test('AMRAP termina no prazo e mantém o trabalho parcial separado da meta',async()=>{
  const {normalizeWodPlan,initialWod,applyWodAction,wodScore}=await import('../lib/wodBlocks.ts');
  const plan=normalizeWodPlan([wodBlock('amrap',[movement('Flexão','8'),movement('Prancha','30 s')],null,60)]);
  let state=initialWod(plan);
  const action=(kind,now,slot,value)=>{
    const result=applyWodAction(state,{block:0,kind,slot,value,revision:state.revision},now,'wod-id');
    state=result.state;
    return result.set;
  };
  action('start',1000);
  action('record',5000,0,8);
  const timed=action('record',35000,1,30);
  assert.equal(timed.actual_reps,null);
  state=JSON.parse(JSON.stringify(state));
  assert.throws(()=>action('record',61000,2,8),/tempo acabou/);
  const partial=action('end',63000,2,5);
  assert.equal(partial.actual_reps,5);
  assert.equal(partial.completed,false);
  assert.equal(state.progress[0].endedAt,61000);
  assert.match(wodScore(plan[0],state.progress[0]),/^1 volta \+ 5 reps/);
});

test('For Time diferencia conclusão do cap e EMOM ignora minutos sem registro',async()=>{
  const {normalizeWodPlan,initialWod,applyWodAction,wodScore}=await import('../lib/wodBlocks.ts');
  const plan=normalizeWodPlan([
    wodBlock('for_time',[movement('Remo','300 m')],1,60),
    wodBlock('emom',[movement('Flexão','8'),movement('Agachamento','12')],null,180)
  ]);
  let state=initialWod(plan);
  const action=(block,kind,now,slot,value)=>{
    const result=applyWodAction(state,{block,kind,slot,value,revision:state.revision},now,'wod-id');
    state=result.state;
    return result.set;
  };
  action(0,'start',1000);
  action(0,'record',26000,0,300);
  assert.equal(wodScore(plan[0],state.progress[0]),'Concluído em 0:25');
  action(1,'start',27000);
  assert.equal(action(1,'record',90000,1,12).exercise_key,'Agachamento');
  assert.throws(()=>action(1,'record',95000,1,12),/etapa mudou/);
  assert.equal(action(1,'record',150000,2,3).completed,false);
  assert.throws(()=>applyWodAction(state,{block:1,kind:'end',revision:0},207000,'wod-id'),/outra tela/);
  action(1,'end',207000);
  assert.equal(wodScore(plan[1],state.progress[1]),'1 de 3 minutos concluídos');
  const capped=normalizeWodPlan([wodBlock('for_time',[movement('Remo','300 m')],1,60)]);
  const started=applyWodAction(initialWod(capped),{block:0,kind:'start',revision:0},1000,'wod-id').state;
  const ended=applyWodAction(started,{block:0,kind:'end',revision:1,slot:0,value:100},62000,'wod-id').state;
  assert.doesNotMatch(wodScore(capped[0],ended.progress[0]),/Concluído em/);
  assert.equal(ended.progress[0].endedAt,61000);
});
