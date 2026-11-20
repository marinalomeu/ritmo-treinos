import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DEFAULT_SHARE_OPTIONS,SHARE_THEMES,workoutShareSummary,shareMetricValues,shareSelectionCount,numericShareTarget,visibleShareExercises,formatVolume} from '../lib/workoutShare.ts';

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
  assert.deepEqual(shareMetricValues(summary,selected).find(v=>v.key==='volume'),{
    key:'volume',label:'VOLUME (KG)',value:'—'
  });
});

test('cada informação do card pode ser ligada ou desligada sem misturar fontes',()=>{
  const summary=workoutShareSummary(detail);
  const all={...DEFAULT_SHARE_OPTIONS,metrics:{time:true,exerciseCount:true,sets:true,volume:true}};
  const metrics=shareMetricValues(summary,all);
  assert.deepEqual(metrics.map(m=>m.key),['time','exerciseCount','sets','volume']);
  assert.equal(metrics.find(m=>m.key==='volume').value,'540 kg');
  assert.equal(metrics.find(m=>m.key==='volume').label,'VOLUME (KG)');
  // O valor não aceita substituição arbitrária: sempre vem das séries medidas.
  assert.equal(shareMetricValues(summary,all).find(m=>m.key==='volume').value,'540 kg');
  assert.deepEqual(shareMetricValues(summary,{...all,metrics:{time:false,exerciseCount:false,sets:false,volume:false}}),[]);
  assert.equal(formatVolume(1540.5),'1.540,5 kg');
});

test('exercícios preservam sequência do WOD e cabem no único card vertical 9:16',()=>{
  const summary=workoutShareSummary(detail);
  assert.deepEqual(summary.exercises.map(e=>e.key),['supino','agachamento','assistencia','corrida','flexao']);
  const poster=visibleShareExercises(summary,4);
  assert.equal(poster.entries.length,5);assert.equal(poster.extra,0);
  const long={...summary,exercises:Array.from({length:10},(_,i)=>({
    key:String(i),name:'Exercício '+i,target:'10',totalSets:1,completedSets:1
  }))};
  assert.equal(visibleShareExercises(long,4).entries.length,6);
  assert.equal(visibleShareExercises(long,4).extra,4);
  assert.equal(visibleShareExercises(long,2).entries.length,8);
});

test('padrão tem exatamente tempo e volume, e exige no mínimo duas informações',()=>{
  assert.deepEqual(DEFAULT_SHARE_OPTIONS,{
    showWorkoutName:false,showGymName:false,showDate:false,showExercises:false,showExerciseTargets:false,
    metrics:{time:true,exerciseCount:false,sets:false,volume:true}
  });
  assert.equal(shareSelectionCount(DEFAULT_SHARE_OPTIONS),2);
  const other={...DEFAULT_SHARE_OPTIONS,showExercises:true};
  assert.equal(shareSelectionCount(other),3);
  assert.equal(shareSelectionCount({...DEFAULT_SHARE_OPTIONS,metrics:{time:false,exerciseCount:false,sets:false,volume:false}}),0);
  assert.equal(shareSelectionCount({...DEFAULT_SHARE_OPTIONS,showExerciseTargets:true}),2);
});

test('meta do WOD aparece apenas em formato numérico, sem a palavra meta',()=>{
  assert.equal(numericShareTarget('10 repetições'),'10');
  assert.equal(numericShareTarget('21-15-9 reps'),'21-15-9');
  assert.equal(numericShareTarget('3 x 10 repetições'),'3×10');
  assert.equal(numericShareTarget('500 m'),'500');
  assert.equal(numericShareTarget('AMRAP'),null);
});

test('os dois visuais preservam composição, mas têm contraste invertido',()=>{
  assert.notEqual(SHARE_THEMES.dark.headline,SHARE_THEMES.light.headline);
  assert.notEqual(SHARE_THEMES.dark.gradient[0],SHARE_THEMES.light.gradient[0]);
  assert.equal(SHARE_THEMES.dark.headline,'#fffafc');
  assert.equal(SHARE_THEMES.light.headline,'#28242d');
  assert.equal(SHARE_THEMES.light.gradient[0],'#f9eeee');
  assert.equal(SHARE_THEMES.light.metricValue,'#302733');
  assert.equal(SHARE_THEMES.light.exerciseText,'#362b38');
});
