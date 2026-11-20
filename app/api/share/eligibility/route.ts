import {NextRequest,NextResponse} from 'next/server';
import {db,unauthorized,serverError} from '../../../../lib/server';
import {currentProfile,multiuserConfigured} from '../../../../lib/multiuser';

type Session={id:string;performed_on:string;status:string;completed_sets:number;challenge_id:string|null;started_at:string;finished_at:string|null;challenge_division:string|null};
const utc=(s:string)=>Date.parse(s.slice(0,10)+'T12:00:00Z');
const day=(n:number)=>new Date(n).toISOString().slice(0,10);
export async function GET(request:NextRequest){
 if(!multiuserConfigured())return NextResponse.json({error:'Indisponível.'},{status:503});
 const user=await currentProfile();if(!user)return unauthorized();
 const id=request.nextUrl.searchParams.get('session_id')||'';
 if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:'Sessão inválida.'},{status:400});
 try{
  const sql=db();
  const sessionRows=await sql`SELECT id::text,performed_on::text,status,started_at::text,finished_at::text,challenge_id,challenge_division,
   (SELECT COUNT(*)::int FROM public.session_sets s WHERE s.session_id=ws.id AND s.completed=true) AS completed_sets
   FROM public.workout_sessions ws WHERE id=${id}::uuid AND user_id=${user.id}::uuid`;
  if(!sessionRows.length||sessionRows[0].status!=='finished'||Number(sessionRows[0].completed_sets)<1)
   return NextResponse.json({error:'Treino concluído não encontrado.'},{status:404});
  const current=sessionRows[0] as Session;
  const [sessions,goals,prRows]=await Promise.all([
   sql`SELECT ws.id::text,ws.performed_on::text,ws.status,ws.started_at::text,ws.finished_at::text,
      ws.challenge_id,ws.challenge_division,ws.paused_ms,COUNT(ss.id) FILTER(WHERE ss.completed)::int AS completed_sets,
      COUNT(ss.id)::int AS total_sets
      FROM public.workout_sessions ws LEFT JOIN public.session_sets ss ON ss.session_id=ws.id
      WHERE ws.user_id=${user.id}::uuid AND ws.performed_on<=${current.performed_on}::date
      GROUP BY ws.id`,
   sql`SELECT name,starts_on::text,ends_on::text,workouts_per_week FROM public.user_training_goals WHERE user_id=${user.id}::uuid`,
   sql`SELECT ss.exercise_key,ss.weight_kg::float8 AS weight_kg,ss.actual_reps,ws.id::text AS session_id,
      ws.finished_at::text AS finished_at,ss.completed_at::text AS completed_at
      FROM public.session_sets ss JOIN public.workout_sessions ws ON ws.id=ss.session_id
      WHERE ws.user_id=${user.id}::uuid AND ss.completed=true AND ss.load_unit='kg'
      AND ss.weight_kg>0 AND ss.actual_reps BETWEEN 1 AND 30
      AND ws.status='finished' AND ws.finished_at<=${current.finished_at}::timestamptz`
  ]);
  const goal=goals[0] as {starts_on:string;ends_on:string;workouts_per_week:number}|undefined;
  const completed=(sessions as unknown as (Session&{total_sets:number})[]).filter(s=>s.status==='finished'&&s.completed_sets>0);
  let week=false,month=false,weekCount=0,monthCount=0,weekTarget=0,monthTarget=0;
  if(goal&&current.performed_on>=goal.starts_on&&current.performed_on<=goal.ends_on){
    const date=utc(current.performed_on),d=new Date(date).getUTCDay(),monday=date-((d+6)%7)*86400000;
    const sunday=monday+6*86400000;
    const finished=new Set(completed.map(s=>s.performed_on));
    const weekDays:Array<string>=[];for(let t=monday;t<=sunday;t+=86400000){const x=day(t);if(x>=goal.starts_on&&x<=goal.ends_on)weekDays.push(x);}
    weekTarget=Math.min(goal.workouts_per_week,weekDays.length);
    weekCount=weekDays.filter(x=>finished.has(x)).length;
    week=weekTarget>0&&weekCount>=weekTarget;
    const monthStart=current.performed_on.slice(0,7)+'-01';
    const last=day(Date.UTC(Number(current.performed_on.slice(0,4)),Number(current.performed_on.slice(5,7)),0));
    let cursor=Math.max(utc(monthStart),utc(goal.starts_on)),end=Math.min(utc(last),utc(goal.ends_on));
    const weeks=new Map<number,string[]>();
    for(let t=cursor;t<=end;t+=86400000){const dow=new Date(t).getUTCDay(),key=t-((dow+6)%7)*86400000;weeks.set(key,[...(weeks.get(key)||[]),day(t)]);}
    monthTarget=[...weeks.values()].reduce((sum,days)=>sum+Math.min(goal.workouts_per_week,days.length),0);
    monthCount=[...weeks.values()].reduce((sum,days)=>sum+Math.min(goal.workouts_per_week,days.filter(d=>finished.has(d)).length),0);
    month=monthTarget>0&&monthCount>=monthTarget;
  }
  const bestEarlier=new Map<string,number>();
  const own=new Map<string,number>();
  for(const row of prRows){
    const v=row as {exercise_key:string;weight_kg:number;actual_reps:number;session_id:string};
    const est=v.actual_reps===1?v.weight_kg:v.weight_kg*(1+v.actual_reps/30);
    const map=v.session_id===id?own:bestEarlier;
    map.set(v.exercise_key,Math.max(map.get(v.exercise_key)||0,est));
  }
  const prs=[...own.entries()].filter(([key,v])=>bestEarlier.has(key)&&v>(bestEarlier.get(key)||0)+0.0001).map(([key])=>key);
  const comparable=completed.filter(s=>s.challenge_id&&s.challenge_id===current.challenge_id&&s.challenge_division===current.challenge_division&&s.completed_sets===s.total_sets);
  const currentComparable=comparable.find(s=>s.id===id);
  const previous=comparable.filter(s=>s.id!==id&&s.finished_at&&current.finished_at&&s.finished_at<current.finished_at);
  const elapsed=(s:Session)=>s.finished_at?Date.parse(s.finished_at)-Date.parse(s.started_at)-(s.paused_ms??0):Infinity;
  const challengeFirst=Boolean(currentComparable&&previous.length===0);
  const challengeBest=Boolean(currentComparable&&previous.length>0&&previous.every(s=>elapsed(current)<elapsed(s)));
  return NextResponse.json({pr:prs.length>0,prCount:prs.length,week,month,weekCount,weekTarget,monthCount,monthTarget,
     challengeFirst,challengeBest,challengeId:current.challenge_id},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return serverError(error);}
}
