import { prescribedRepetitions } from '../../../../lib/repetitions';
import { NextResponse } from 'next/server';
import { db, sameOrigin, forbiddenOrigin, unauthorized, serverError } from '../../../../lib/server';
import { currentProfile, multiuserConfigured } from '../../../../lib/multiuser';
type Ctx={params:Promise<{id:string}>};
export async function PATCH(request:Request,context:Ctx){
  if(!multiuserConfigured())return NextResponse.json({error:'Ambiente não configurado.'},{status:503});
  const user=await currentProfile();
  if(!user)return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  const {id}=await context.params;
  if(!/^\d+$/.test(id))return NextResponse.json({error:'ID inválido.'},{status:400});
  try{
    const body=await request.json();
    if(typeof body.completed!=='boolean'||!(body.weight_kg===null||
      (typeof body.weight_kg==='number'&&Number.isFinite(body.weight_kg)&&body.weight_kg>=0&&body.weight_kg<=2000))) {
      return NextResponse.json({error:'Valores inválidos.'},{status:400});
    }
    const includesActual=Object.prototype.hasOwnProperty.call(body,'actual_reps');
    const actual=body.actual_reps;
    if(includesActual&&!(actual===null||(Number.isInteger(actual)&&actual>=0&&actual<=10000)))
      return NextResponse.json({error:'Repetições realizadas inválidas.'},{status:400});
    const sql=db();
    // O cliente sempre envia actual_reps; o fallback também cobre clientes antigos.
    const fallback=body.completed?true:false;
    const rows=await sql`
      UPDATE public.session_sets ss
      SET weight_kg=${body.weight_kg},completed=${body.completed},
        actual_reps=CASE
          WHEN ${includesActual&&actual!==null} THEN ${includesActual&&actual!==null?actual:null}::integer
          WHEN ${fallback} AND ss.actual_reps IS NULL
               AND trim(ss.target_reps) ~* '^[0-9]{1,5}(\\s*(reps?|repetições|repetição|repeticoes|repeticao))?
        completed_at=CASE WHEN ${body.completed} THEN COALESCE(ss.completed_at,NOW()) ELSE NULL END
      FROM public.workout_sessions ws
      WHERE ss.id=${id}::bigint AND ss.session_id=ws.id AND ws.user_id=${user.id}::uuid
      RETURNING ss.id::text AS id,ss.weight_kg::float8 AS weight_kg,ss.actual_reps,
        ss.completed,ss.completed_at::text AS completed_at
    `;
    if(!rows.length)return NextResponse.json({error:'Série não encontrada.'},{status:404});
    return NextResponse.json(rows[0]);
  }catch(error){return serverError(error);}
}

          THEN CASE WHEN (substring(trim(ss.target_reps) from '^[0-9]{1,5}'))::integer BETWEEN 1 AND 10000
            THEN (substring(trim(ss.target_reps) from '^[0-9]{1,5}'))::integer ELSE NULL END
          WHEN ${includesActual} THEN NULL
          ELSE ss.actual_reps END,
        completed_at=CASE WHEN ${body.completed} THEN COALESCE(ss.completed_at,NOW()) ELSE NULL END
      FROM public.workout_sessions ws
      WHERE ss.id=${id}::bigint AND ss.session_id=ws.id AND ws.user_id=${user.id}::uuid
      RETURNING ss.id::text AS id,ss.weight_kg::float8 AS weight_kg,ss.actual_reps,
        ss.completed,ss.completed_at::text AS completed_at
    `;
    if(!rows.length)return NextResponse.json({error:'Série não encontrada.'},{status:404});
    return NextResponse.json(rows[0]);
  }catch(error){return serverError(error);}
}
