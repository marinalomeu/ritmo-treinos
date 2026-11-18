import { NextResponse } from 'next/server';
import { db, hasSession, sameOrigin, unauthorized, forbiddenOrigin, serverError } from '../../../lib/server';
import { isValidGoal, type TrainingGoal } from '../../../lib/goal';
export async function PUT(request: Request) {
  if (!await hasSession()) return unauthorized();
  if (!sameOrigin(request)) return forbiddenOrigin();
  try {
    const incoming = await request.json() as Partial<TrainingGoal>;
    const goal:TrainingGoal = {
      name: typeof incoming.name === 'string' ? incoming.name.trim() : '',
      starts_on: incoming.starts_on || '',
      ends_on: incoming.ends_on || '',
      workouts_per_week: Number(incoming.workouts_per_week)
    };
    if (!isValidGoal(goal)) return NextResponse.json({error:'Confira o nome, as datas e a frequência (1 a 6 treinos por semana).'}, {status:400});
    const sql=db();
    const rows=await sql`
      INSERT INTO training_goal (id,name,starts_on,ends_on,workouts_per_week)
      VALUES (1,${goal.name},${goal.starts_on}::date,${goal.ends_on}::date,${goal.workouts_per_week})
      ON CONFLICT (id) DO UPDATE SET
        name=EXCLUDED.name,starts_on=EXCLUDED.starts_on,ends_on=EXCLUDED.ends_on,
        workouts_per_week=EXCLUDED.workouts_per_week,updated_at=NOW()
      RETURNING name,starts_on::text AS starts_on,ends_on::text AS ends_on,workouts_per_week
    `;
    return NextResponse.json(rows[0], {headers:{'Cache-Control':'no-store'}});
  } catch(e){return serverError(e);}
}
