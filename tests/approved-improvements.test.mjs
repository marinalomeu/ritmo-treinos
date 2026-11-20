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
