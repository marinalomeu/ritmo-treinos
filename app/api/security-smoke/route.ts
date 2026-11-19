import {NextResponse} from 'next/server';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {db} from '../../../lib/server';
import {GET as dataGet} from '../data/route';
import {GET as sessionGet,DELETE as sessionDelete} from '../sessions/[id]/route';
import {PATCH as setPatch} from '../sets/[id]/route';
import {POST as sessionPost} from '../sessions/route';
import {PUT as goalPut} from '../goal/route';
import {GET as adminGet} from '../admin/invitations/route';

export const runtime='nodejs';
export const dynamic='force-dynamic';

// TEMPORARY QA ROUTE. REMOVE BEFORE PR MERGE. Requires a private preview-only
// environment key and the Git branch; never store any user credentials here.
export async function GET(request:Request) {
  const expected=process.env.RITMO_SECURITY_SMOKE_KEY||'';
  const provided=new URL(request.url).searchParams.get('key')||'';
  if(process.env.VERCEL_ENV!=='preview' ||
     process.env.VERCEL_GIT_COMMIT_REF!=='feat/multiusuario-convites' ||
     process.env.MULTIUSER_ENABLED!=='true' ||
     expected.length<32 || provided.length!==expected.length ||
     !timingSafeEqual(Buffer.from(provided),Buffer.from(expected))) {
    return NextResponse.json({error:'Not found'},{status:404});
  }
  const testId='00000000-0000-4000-8000-000000000001';
  const noAuthChecks:Record<string,number|string>={};
  try {
    const calls:[string,()=>Promise<Response>][]=[
      ['GET /api/data',()=>dataGet()],
      ['GET /api/sessions/:id',()=>sessionGet(new Request(request.url),{params:Promise.resolve({id:testId})})],
      ['DELETE /api/sessions/:id',()=>sessionDelete(new Request(request.url,{method:'DELETE'}),{params:Promise.resolve({id:testId})})],
      ['PATCH /api/sets/:id',()=>setPatch(new Request(request.url,{method:'PATCH'}),{params:Promise.resolve({id:'1'})})],
      ['POST /api/sessions',()=>sessionPost(new Request(request.url,{method:'POST'}))],
      ['PUT /api/goal',()=>goalPut(new Request(request.url,{method:'PUT'}))],
      ['GET /api/admin/invitations',()=>adminGet()],
    ];
    for(const [name,fn] of calls) {
      try {noAuthChecks[name]=(await fn()).status;}
      catch(e){noAuthChecks[name]='exception:'+((e instanceof Error)?e.message:'unknown').slice(0,90);}
    }
  }catch(e){noAuthChecks.critical='exception';}
  let crossChecks:Record<string,number|boolean|string>={};
  try{
    const sql=db();
    const persons=await sql`
      SELECT id::text AS id,role FROM public.app_profiles
      WHERE enabled=true AND role IN ('owner','member') ORDER BY role ASC
    `;
    const owner=persons.find(p=>p.role==='owner');
    const member=persons.find(p=>p.role==='member');
    if(!owner||!member)throw new Error('Missing real test owner/member');
    const rows=await sql`
      WITH targets AS (
        SELECT ws.id AS id,ws.user_id FROM public.workout_sessions ws
        WHERE ws.user_id=${owner.id}::uuid LIMIT 1
      )
      SELECT
        (SELECT count(*)::int FROM public.workout_sessions w JOIN targets t ON w.id=t.id WHERE w.user_id=${member.id}::uuid) AS member_reads_owner_session,
        (SELECT count(*)::int FROM public.session_sets s JOIN public.workout_sessions w ON s.session_id=w.id JOIN targets t ON t.id=w.id WHERE w.user_id=${member.id}::uuid) AS member_reads_owner_sets,
        (SELECT count(*)::int FROM public.user_workout_templates WHERE user_id=${owner.id}::uuid) AS owner_templates,
        (SELECT count(*)::int FROM public.user_workout_templates WHERE user_id=${member.id}::uuid) AS member_templates
    `;
    crossChecks={ownerAndMemberPresent:true,...rows[0]};
  }catch(e){crossChecks={error:e instanceof Error?e.message:'cross test failure'};}
  let rejectedSignup=false, signupHttpStatus=0, signupErrorCode='unknown', userCreated=false, contentType='', bodyShape='';
  try{
    const email='ritmo-qa-'+randomBytes(8).toString('hex')+'@example.com';
    const authUrl=(process.env.NEON_AUTH_BASE_URL||'').replace(/\/$/,'');
    if(!authUrl.startsWith('https://'))throw new Error('auth URL invalid');
    const result=await fetch(authUrl+'/sign-up/email',{
      method:'POST',redirect:'manual',
      headers:{'Content-Type':'application/json',
        'Origin':'https://ritmo-treinos-git-feat-multiusuar-29cf1c-marina-lomeus-projects.vercel.app'},
      body:JSON.stringify({name:'Ritmo security blocked signup',email,
        password:randomBytes(24).toString('base64url')+'9!'}),
      cache:'no-store',signal:AbortSignal.timeout(12000)
    });
    signupHttpStatus=result.status;
    contentType=result.headers.get('content-type')||'missing';
    const responseBody=(await result.text()).slice(0,3000);
    try {
      const parsed=JSON.parse(responseBody);
      bodyShape='json-keys:'+Object.keys(parsed).slice(0,12).join(',');
      const errorObj=parsed.error&&typeof parsed.error==='object'?parsed.error:{};
      signupErrorCode=String(parsed.code||parsed.error_code||errorObj.code||parsed.message||errorObj.message||'unknown').slice(0,150);
    }catch{ bodyShape=responseBody.trim().startsWith('<')?'html':'text:'+responseBody.slice(0,80); }
    if(signupErrorCode==='unknown'){
      signupErrorCode=responseBody.match(/INVITE_REQUIRED|SIGNUP_NOT_ALLOWED|not invited|convite/i)?.[0]||'not-in-response';
    }
    const sql=db();
    const created=await sql`SELECT count(*)::int AS count FROM neon_auth."user" WHERE lower(email)=${email}`;
    userCreated=Number(created[0]?.count||0)>0;
    rejectedSignup=!userCreated&&signupHttpStatus>=400&&signupHttpStatus<500&&signupErrorCode!=='not-in-response';
  }catch(e){signupErrorCode='error:'+((e instanceof Error)?e.message:'unknown').slice(0,80);}
  const unauthOK=Object.values(noAuthChecks).length===7&&Object.values(noAuthChecks).every(x=>x===401);
  const crossOK=crossChecks.ownerAndMemberPresent===true&&crossChecks.member_reads_owner_session===0&&crossChecks.member_reads_owner_sets===0;
  const passed=unauthOK&&crossOK&&rejectedSignup;
  return NextResponse.json({passed,unauthenticated:{passed:unauthOK,statuses:noAuthChecks},
    crossTenant:{passed:crossOK,checks:crossChecks},
    blockedSignup:{passed:rejectedSignup,status:signupHttpStatus,contentType,bodyShape,errorCode:signupErrorCode,accountCreated:userCreated}},
    {headers:{'Cache-Control':'no-store'}});
}
