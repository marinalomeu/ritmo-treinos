import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DEFAULT_SHARE_OPTIONS,workoutShareSummary,shareMetricValues,visibleShareExercises,formatVolume} from '../lib/workoutShare.ts';

const detail={
  session:{
    id:'test-session',template_id:'wod',template_name:'WOD de hoje',performed_on:'2026-11-19',
    started_at:'2026-11-19T15:00:00.000Z',finished_at:'2026-11-19T15:42:00.000Z',
    status:'finished',completed_sets:3,total_sets:6
  },
  sets:[
    {id:'1',exercise_key:'supino',exercise_name:'Supino',sort_order:0,set_number:1,target_reps:'10',actual_reps:10,load_unit:'kg',weight_kg:30,completed:true},
    {id:'2',exercise_key:'supino',exercise_name:'Supino',sort_order:0,set_number:2,target_reps:'10',actual_reps:8,load_unit:'kg',weight_kg:30,completed:false},
    {id:'3',exercise_key:'agachamento',exercise_name:'Agachamento',sort_order:1,set_number:1,target_reps:'10',actual_reps:null,load_unit:'kg',weight_kg:25,completed:true},
    {id:'4',exercise_key:'assistencia',exercise_name:'Barra assistida',sort_order:2,set_number:1,target_reps:'8',actual_reps:8,load_unit:'assist_kg',weight_kg:15,completed:true},
    {id:'5',exercise_key:'corrida',exercise_name:'Corrida',sort_order:3,set_number:1,target_reps:'500 m',actual_reps:500,load_unit:'km/h',weight_kg:10,completed:false},
    {id:'6',exercise_key:'flexao',exercise_name:'Flexão',sort_order:4,set_number:1,target_reps:'15',actual_reps:15,load_unit:'none',weight_kg:null,completed:false},
  ]
};

test('volume de carga soma somente kg externos x repetições medidas, incluindo série parcial',()=>{
  const s=workoutShareSummary(detail);
  assert.equal(s.volumeKg,540);
  assert.equal(s.volumePartial,true);
  assert.equal(s.elapsed,'00:42');
  assert.equal(s.exerciseCount,5);
  assert.equal(s.completedSets,3);
  assert.equal(s.exercises[0].name,'Supino');
  assert.equal(s.exercises[0].totalSets,2);
});

test('não inventa volume para fichas históricas sem repetições realizadas',()=>{
  const onlyHistorical={...detail,sets:detail.sets.map(set=>({...set,actual_reps:null}))};
  const summary=workoutShareSummary(onlyHistorical);
  assert.equal(summary.volumeKg,null);
  const selected={...DEFAULT_SHARE_OPTIONS,metrics:{...DEFAULT_SHARE_OPTIONS.metrics,volume:true}};
  assert.equal(shareMetricValues(summary,selected).some(v=>v.key==='volume'),false);
  assert.deepEqual(shareMetricValues(summary,selected,1250).find(v=>v.key==='volume'),{
    key:'volume',label:'VOLUME INFORMADO',value:'1.250 kg'
  });
});

test('cada informação do card pode ser ligada ou desligada sem misturar fontes',()=>{
  const summary=workoutShareSummary(detail);
  const all={...DEFAULT_SHARE_OPTIONS,metrics:{time:true,exerciseCount:true,sets:true,volume:true}};
  const metrics=shareMetricValues(summary,all);
  assert.deepEqual(metrics.map(m=>m.key),['time','exerciseCount','sets','volume']);
  assert.equal(metrics.find(m=>m.key==='volume').value,'540 kg');
  assert.equal(metrics.find(m=>m.key==='volume').label,'VOLUME REGISTRADO');
  assert.equal(shareMetricValues(summary,all,1800).find(m=>m.key==='volume').label,'VOLUME INFORMADO');
  assert.equal(shareMetricValues(summary,all,-10).find(m=>m.key==='volume').value,'540 kg');
  assert.deepEqual(shareMetricValues(summary,{...all,metrics:{time:false,exerciseCount:false,sets:false,volume:false}}),[]);
  assert.equal(formatVolume(1540.5),'1.540,5 kg');
});

test('exercícios preservam sequência do WOD e cabem nas dimensões do card',()=>{
  const summary=workoutShareSummary(detail);
  assert.deepEqual(summary.exercises.map(e=>e.key),['supino','agachamento','assistencia','corrida','flexao']);
  const story=visibleShareExercises(summary,'story',4);
  const feed=visibleShareExercises(summary,'feed',4);
  assert.equal(story.entries.length,5);assert.equal(story.extra,0);
  assert.equal(feed.entries.length,2);assert.equal(feed.extra,3);
});
