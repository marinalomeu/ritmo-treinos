import { NextResponse } from 'next/server';
import { db, sameOrigin, forbiddenOrigin, unauthorized, serverError } from '../../../../../lib/server';
import { currentProfile, multiuserConfigured } from '../../../../../lib/multiuser';
import { estimatedOneRM } from '../../../../../lib/personalRecords';
import type { Template, Unit } from '../../../../../lib/templates';
type Ctx={params:Promise<{id:string}>};
type CompletedSet={
  exercise_key:string;load_unit:Unit;weight_kg:number|null;actual_reps:number|null;
  set_number:number;sort_order:number;
};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const templateKey=/^[A-Za-z0-9_-]{1,100}$/;

export async function POST(request:Request,context:Ctx){
  if(!multiuserConfigured())return NextResponse.json({error:'Ambiente indisponível.'},{status:503});
  const user=await currentProfile();if(!user)return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  const {id}=await context.params;
  if(!uuid.test(id))return NextResponse.json({error:'Treino inválido.'},{status:400});
  try{
    const payload=await request.json() as Record<string,unknown>;
    const updatePRs=payload.update_prs===true,updateTemplate=payload.update_template===true;
    if(!updatePRs&&!updateTemplate)return NextResponse.json({error:'Selecione o que atualizar.'},{status:400});
    const sql=db();
    const sessions=await sql`
      SELECT id,template_id,status FROM public.workout_sessions
      WHERE id=${id}::uuid AND user_id=${user.id}::uuid LIMIT 1
    `;
    if(!sessions.length)return NextResponse.json({error:'Treino não encontrado.'},{status:404});
    if(sessions[0].status!=='finished')
      return NextResponse.json({error:'Finalize o treino antes de aplicar os resultados.'},{status:409});
    const sets=await sql`
      SELECT ss.exercise_key,ss.load_unit,ss.weight_kg::float8 AS weight_kg,ss.actual_reps,
        ss.set_number,ss.sort_order
      FROM public.session_sets ss
      JOIN public.workout_sessions ws ON ws.id=ss.session_id
      WHERE ws.user_id=${user.id}::uuid AND ss.session_id=${id}::uuid AND ss.completed=true
      ORDER BY ss.sort_order,ss.set_number
    ` as CompletedSet[];
    const best=new Map<string,{exercise_key:string;weight_kg:number;repetitions:number}>();
    if(updatePRs)for(const s of sets){
      if(s.load_unit!=='kg'&&s.load_unit!=='none')continue;
      if(typeof s.weight_kg!=='number'||s.weight_kg<=0||s.weight_kg>2000||
        !Number.isInteger(s.actual_reps)||s.actual_reps!<1||s.actual_reps!>30)continue;
      const candidate={exercise_key:s.exercise_key,weight_kg:s.weight_kg,repetitions:s.actual_reps};
      const older=best.get(s.exercise_key);
      if(!older||estimatedOneRM(candidate.weight_kg,candidate.repetitions)>
        estimatedOneRM(older.weight_kg,older.repetitions))best.set(s.exercise_key,candidate);
    }
    const prs=[...best.values()];
    if(updatePRs&&prs.length===0)
      return NextResponse.json({error:'Nenhuma série concluída tem carga externa e 1 a 30 repetições realizadas. Preencha as reps feitas antes de atualizar PRs.'},{status:422});

    let targetId='',templateExercises:Template['exercises']=[],matching=0,changed=0;
    if(updateTemplate){
      const requested=typeof payload.target_template_id==='string'?payload.target_template_id:'';
      targetId=sessions[0].template_id==='wod'?requested:(requested||sessions[0].template_id);
      if(!templateKey.test(targetId)||targetId==='wod')
        return NextResponse.json({error:'Selecione uma ficha fixa para receber as cargas.'},{status:400});
      const templates=await sql`
        SELECT exercises FROM public.user_workout_templates
        WHERE user_id=${user.id}::uuid AND id=${targetId} LIMIT 1
      `;
      if(!templates.length)return NextResponse.json({error:'Ficha de destino não encontrada.'},{status:404});
      const last=new Map<string,CompletedSet>();
      for(const s of sets){
        if(s.weight_kg===null||!Number.isFinite(s.weight_kg)||s.weight_kg<0||s.weight_kg>2000 ||
          (s.load_unit!=='kg'&&s.load_unit!=='assist_kg'))continue;
        last.set(s.exercise_key,s);
      }
      templateExercises=(templates[0].exercises as Template['exercises']).map(e=>{
        const series=last.get(e.key);
        if(!series||series.load_unit!==e.unit)return e;
        matching++;
        if(series.weight_kg!==e.defaultLoad)changed++;
        return {...e,defaultLoad:series.weight_kg};
      });
      if(!matching)return NextResponse.json({error:'A ficha selecionada não possui exercícios com cargas compatíveis com este treino.'},{status:422});
    }
    // Atualiza os dois destinos em uma ÚNICA instrução SQL transacional.
    // PRs só melhoram (Epley para 1-30 reps reais); Pins só nascem após
    // clique explícito; atualização de ficha não altera séries históricas.
    const result=await sql`
      WITH candidates AS (
        SELECT x.exercise_key,x.weight_kg,x.repetitions
        FROM jsonb_to_recordset(${JSON.stringify(prs)}::jsonb)
          AS x(exercise_key text,weight_kg numeric,repetitions integer)
      ), add_to_list AS (
        INSERT INTO public.user_pr_exercises(user_id,exercise_key)
        SELECT ${user.id}::uuid,c.exercise_key FROM candidates c
        ON CONFLICT(user_id,exercise_key) DO NOTHING
        RETURNING exercise_key
      ), upsert_pr AS (
        INSERT INTO public.user_personal_records(user_id,exercise_key,weight_kg,repetitions,source)
        SELECT ${user.id}::uuid,c.exercise_key,c.weight_kg,c.repetitions,'workout'
        FROM candidates c
        ON CONFLICT(user_id,exercise_key) DO UPDATE
          SET weight_kg=EXCLUDED.weight_kg,repetitions=EXCLUDED.repetitions,
              source='workout',updated_at=NOW()
          WHERE (CASE WHEN EXCLUDED.repetitions=1 THEN EXCLUDED.weight_kg
              ELSE EXCLUDED.weight_kg*(1+EXCLUDED.repetitions::numeric/30) END)
             > (CASE WHEN public.user_personal_records.repetitions=1 THEN public.user_personal_records.weight_kg
              ELSE public.user_personal_records.weight_kg*
                (1+public.user_personal_records.repetitions::numeric/30) END)
        RETURNING exercise_key
      ), update_fixed AS (
        UPDATE public.user_workout_templates SET
          exercises=${JSON.stringify(templateExercises)}::jsonb,updated_at=NOW()
        WHERE user_id=${user.id}::uuid AND id=${targetId} AND ${updateTemplate}
        RETURNING id
      )
      SELECT (SELECT COUNT(*)::int FROM candidates) AS prs_considered,
        (SELECT COUNT(*)::int FROM upsert_pr) AS prs_updated,
        (SELECT COUNT(*)::int FROM add_to_list) AS prs_added_to_list,
        (SELECT COUNT(*)::int FROM update_fixed) AS fixed_updated
    `;
    return NextResponse.json({
      ok:true,...result[0],template_matches:matching,template_loads_changed:changed
    },{headers:{'Cache-Control':'no-store'}});
  }catch(error){return serverError(error);}
}
