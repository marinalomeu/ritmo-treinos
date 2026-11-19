import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
const source=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('todas as rotas privadas de dados exigem sessao e identificador do usuario',()=>{
  const paths=[
    'app/api/data/route.ts',
    'app/api/goal/route.ts',
    'app/api/sessions/route.ts',
    'app/api/sessions/[id]/route.ts',
    'app/api/sessions/[id]/finish/route.ts',
    'app/api/sets/[id]/route.ts',
    'app/api/templates/route.ts',
    'app/api/templates/[id]/route.ts',
  ];
  for(const path of paths){
    const body=source(path);
    assert.ok(body.includes('currentProfile()'),path+' precisa validar sessao');
    assert.ok(body.includes('${user.id}'),path+' precisa filtrar dono');
    assert.ok(body.includes('unauthorized()'),path+' precisa retornar 401 sem perfil');
  }
});

test('sessao precisa de perfil ativo e e-mail verificado',()=>{
  const body=source('lib/multiuser.ts');
  assert.ok(body.includes('p.enabled=true'));
  assert.ok(body.includes('"emailVerified"=true'));
  assert.ok(body.includes('getSession()'));
});

test('bloqueio de cadastro por convite em dois niveis',()=>{
  const proxy=source('app/api/auth/[...path]/route.ts');
  assert.ok(proxy.includes("path.join('/')==='sign-up/email'"));
  assert.ok(proxy.includes("status='pending'"));
  assert.ok(proxy.includes("expires_at>NOW()"));
  assert.ok(proxy.includes("activated_at>NOW()-INTERVAL '30 minutes'"));
  assert.ok(proxy.includes('INVITE_REQUIRED'));
  assert.ok(proxy.includes('status:403'));

  const hook=source('app/api/webhooks/neon/route.ts');
  assert.ok(hook.includes('verifyNeonWebhook'));
  assert.ok(hook.includes("payload.event_type==='user.before_create'"));
  assert.ok(hook.includes('allowed:false'));
  assert.ok(hook.includes("payload.event_type==='user.created'"));
});

test('painel de convites exige papel owner',()=>{
  const panel=source('app/api/admin/invitations/route.ts');
  assert.ok(panel.includes("user?.role==='owner'"));
  assert.ok(panel.includes('currentProfile()'));
  assert.ok(panel.includes('token_hash'));
  assert.ok(panel.includes('randomBytes(32)'));
});

test('demo sem dados pessoais e sem login legado',()=>{
  const demo=source('app/demo/page.tsx');
  assert.ok(demo.includes('mode="showcase"'));
  assert.ok(!demo.includes('mode="cloud"'));
  const login=source('app/api/login/route.ts');
  assert.ok(login.includes('status:410'));
});

test('nenhuma rota temporaria de testes fica no codigo entregue',()=>{
  assert.equal(existsSync(new URL('../app/api/security-smoke/route.ts',import.meta.url)),false);
  assert.equal(existsSync(new URL('../app/api/__security-smoke/route.ts',import.meta.url)),false);
});

test('ativacao de convite preserva primeiro timestamp e nao renova prazo',()=>{
  const body=source('app/api/invitations/activate/route.ts');
  assert.ok(body.includes('SET activated_at=COALESCE(activated_at,NOW())'));
  assert.ok(body.includes("activated_at IS NULL OR activated_at>NOW()-INTERVAL '30 minutes'"));
  assert.ok(body.includes("status='pending' AND expires_at>NOW()"));
  assert.ok(body.includes('token_hash=${hash}'));
});

test('fichas, series e sessoes exigem ownership no banco',()=>{
  const session=source('app/api/sessions/[id]/route.ts');
  assert.ok(session.includes('ws.id=${id}::uuid AND ws.user_id=${user.id}::uuid'));
  assert.ok(session.includes('DELETE FROM public.workout_sessions'));
  assert.ok(session.includes('WHERE id=${id}::uuid AND user_id=${user.id}::uuid'));
  const sets=source('app/api/sets/[id]/route.ts');
  assert.ok(sets.includes('ss.session_id=ws.id AND ws.user_id=${user.id}::uuid'));
  const finish=source('app/api/sessions/[id]/finish/route.ts');
  assert.ok(finish.includes('WHERE id=${id}::uuid AND user_id=${user.id}::uuid'));
  const template=source('app/api/templates/[id]/route.ts');
  assert.equal((template.match(/WHERE user_id=\$\{user.id\}::uuid AND id=\$\{id\}/g)||[]).length,2);
});

test('PR e modalidades permanecem por usuario e nao aceitam id do cliente',()=>{
  const data=source('app/api/data/route.ts');
  assert.ok(data.includes('FROM public.user_personal_records WHERE user_id=${user.id}::uuid'));
  assert.ok(data.includes('FROM public.user_exercise_modalities'));
  const prs=source('app/api/prs/route.ts');
  const categories=source('app/api/exercise-modalities/route.ts');
  for(const body of [prs,categories]){
    assert.ok(body.includes('currentProfile()'));
    assert.ok(body.includes('sameOrigin(request)'));
    assert.ok(body.includes('user.id'));
    assert.ok(body.includes('RETURNING'));
    assert.ok(!body.includes('b.user_id'));
  }
  assert.ok(prs.includes("e->>'unit'='kg'"),'PR Epley nao pode usar velocidade ou assistencia');
  assert.ok(categories.includes('user_exercise_modalities'));
  assert.ok(categories.includes("b.modality===''"),'deve permitir remover classificacao');
});

test('filtro de modalidade compartilhado entre PRs e progressao, sem selecao fixa',()=>{
  const app=source('components/WorkoutApp.tsx');
  const prs=source('components/PersonalRecords.tsx');
  assert.ok(app.includes('modalityFilter'));
  assert.ok(app.includes('filteredProgress'));
  assert.ok(app.includes('exerciseCategories'));
  assert.ok(app.includes('effectiveSelected'));
  assert.ok(app.includes('<PersonalRecords'));
  assert.ok(prs.includes('Pesquisar exercício'));
  assert.ok(prs.includes('modalityMap.get(e.key)'));
  assert.ok(prs.includes('plannedReps'));
  assert.ok(prs.includes('plannedLoad'));
  assert.ok(prs.includes('targetWeightForReps'));
  assert.ok(prs.includes('estimatedOneRM'));
});

test('faixas e formula de Epley documentadas como estimativas',()=>{
  const formula=source('lib/personalRecords.ts');
  const view=source('components/PersonalRecords.tsx');
  assert.ok(formula.includes('load*(1+reps/30)'));
  assert.ok(formula.includes('oneRM/(1+reps/30)'));
  assert.ok(formula.includes('oneRM*.40'));
  assert.ok(formula.includes('oneRM*.60'));
  assert.ok(formula.includes('oneRM*.70'));
  assert.ok(formula.includes('oneRM*.85'));
  assert.ok(view.includes('RIR'));
});
