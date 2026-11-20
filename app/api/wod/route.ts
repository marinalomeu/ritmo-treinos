import { NextResponse } from 'next/server';
import { db, sameOrigin, forbiddenOrigin, unauthorized, serverError } from '../../../lib/server';
import { currentProfile, multiuserConfigured } from '../../../lib/multiuser';
import { BASE_EXERCISES, normalizeExerciseName } from '../../../lib/exerciseCatalog';
import { normalizeTemplate } from '../../../lib/templateEditor';
import { makeSets, type Template, type Unit } from '../../../lib/templates';

type KnownExercise={name:string;unit:Unit};

export async function POST(request:Request){
  if(!multiuserConfigured())return NextResponse.json({error:'Ambiente indisponível.'},{status:503});
  const user=await currentProfile();if(!user)return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  try{
    const body=await request.json() as Record<string,unknown>;
    const performed_on=typeof body.performed_on==='string'?body.performed_on:'';
    const gym_name=typeof body.gym_name==='string'?body.gym_name.trim():'';
    if(gym_name.length>100)return NextResponse.json({error:'Local deve ter até 100 caracteres.'},{status:400});
    const validDate=/^\d{4}-\d{2}-\d{2}$/.test(performed_on)&&
      !Number.isNaN(Date.parse(`${performed_on}T12:00:00Z`));
    const source={id:'wod',name:typeof body.name==='string'?body.name:'Treino do dia / WOD',
      description:'',days:'',category:'CrossFit',exercises:body.exercises};
    const template=normalizeTemplate(source,'wod');
    if(!validDate||!template||template.exercises.reduce((sum,e)=>sum+e.sets,0)>160)
      return NextResponse.json({error:'Informe data válida e até 40 exercícios / 160 séries.'},{status:400});
    const sql=db();
    const allowed=new Map<string,KnownExercise>(BASE_EXERCISES.map(e=>[e.key,{name:e.name,unit:e.unit}]));
    const [custom,ownedTemplates,history]=await Promise.all([
      sql`SELECT exercise_key,name,unit FROM public.user_custom_exercises WHERE user_id=${user.id}::uuid`,
      sql`SELECT exercises FROM public.user_workout_templates WHERE user_id=${user.id}::uuid`,
      sql`SELECT DISTINCT ON (ss.exercise_key) ss.exercise_key,ss.exercise_name,ss.load_unit
        FROM public.session_sets ss JOIN public.workout_sessions ws ON ws.id=ss.session_id
        WHERE ws.user_id=${user.id}::uuid ORDER BY ss.exercise_key,ss.id DESC`
    ]);
    for(const row of custom)allowed.set(row.exercise_key,{name:row.name,unit:row.unit});
    for(const row of ownedTemplates)for(const e of row.exercises as Template['exercises'])
      allowed.set(e.key,{name:e.name,unit:e.unit});
    for(const row of history)if(!allowed.has(row.exercise_key))
      allowed.set(row.exercise_key,{name:row.exercise_name,unit:row.load_unit});
    for(const e of template.exercises){
      const known=allowed.get(e.key);
      if(!known||known.unit!==e.unit||normalizeExerciseName(known.name)!==normalizeExerciseName(e.name))
        return NextResponse.json({error:'Selecione exercícios existentes no catálogo do Ritmo.'},{status:400});
    }
    const created=await sql`
      INSERT INTO public.workout_sessions(user_id,template_id,template_name,performed_on,gym_name)
      VALUES (${user.id}::uuid,'wod',${template.name},${performed_on}::date,${gym_name||null})
      RETURNING id::text AS id
    `;
    const id=created[0].id as string;
    const entries=makeSets(template).map(s=>({
      exercise_key:s.exercise_key,exercise_name:s.exercise_name,sort_order:s.sort_order,
      block_number:s.block_number,set_number:s.set_number,target_reps:s.target_reps,
      load_unit:s.load_unit,weight_kg:s.weight_kg,actual_reps:s.actual_reps
    }));
    try{
      await sql`
        INSERT INTO public.session_sets(session_id,exercise_key,exercise_name,sort_order,
          block_number,set_number,target_reps,load_unit,weight_kg,actual_reps)
        SELECT ${id}::uuid,x.exercise_key,x.exercise_name,x.sort_order,x.block_number,
          x.set_number,x.target_reps,x.load_unit,x.weight_kg,x.actual_reps
        FROM jsonb_to_recordset(${JSON.stringify(entries)}::jsonb) AS x(
          exercise_key text,exercise_name text,sort_order smallint,block_number smallint,
          set_number smallint,target_reps text,load_unit text,weight_kg numeric,actual_reps integer
        )
      `;
    }catch(error){
      await sql`DELETE FROM public.workout_sessions WHERE id=${id}::uuid AND user_id=${user.id}::uuid`;
      throw error;
    }
    return NextResponse.json({id},{status:201});
  }catch(error){return serverError(error);}
}
