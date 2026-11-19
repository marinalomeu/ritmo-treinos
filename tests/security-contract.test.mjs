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
  assert.ok(prs.includes('FROM public.user_pr_exercises'),'PR manual permitido para exercício adicionado explicitamente');
  assert.ok(prs.includes("source='manual'"),'registro pelo formulário mantém proveniência manual');
  assert.ok(prs.includes("e->>'unit'<>'km/h'"),'PR Epley nao pode usar velocidade de corrida');
  assert.ok(prs.includes("ss.load_unit<>'km/h'"),'PRs devem permitir exercicios de peso corporal com carga adicional');
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
  assert.ok(view.includes("e.unit!=='km/h'"),'nao bloquear PR de exercicios com peso corporal');
  assert.ok(formula.includes("'Alongamentos'"),'alongamentos deve ser modalidade disponivel');
});

test('apenas a proprietaria administra contas e lista de autorizados',()=>{
  const admin=source('app/api/admin/members/route.ts');
  const invites=source('app/api/admin/invitations/route.ts');
  const profile=source('lib/multiuser.ts');
  const panel=source('components/InviteAdmin.tsx');
  assert.ok(admin.includes("user?.role === 'owner'"),'administracao de membros exclusiva da owner');
  assert.ok(invites.includes("user?.role==='owner'"),'convites exclusivos da owner');
  assert.ok(admin.includes('currentProfile()'));
  assert.ok(admin.includes('sameOrigin(request)'));
  assert.ok(admin.includes("p.role = 'member'"),'nao editar administradora');
  assert.ok(admin.includes('SET enabled = ${enabled}'),'bloqueio e reativacao de membro');
  assert.ok(admin.includes('u."emailVerified" = true'));
  assert.ok(profile.includes('p.enabled=true'),'membro bloqueado nao pode usar APIs');
  assert.ok(profile.includes('lower(u.email)=p.email'),'e-mail autenticado deve coincidir com cadastro');
  assert.ok(panel.includes("'/api/admin/members'"),'admin deve gerir usuarios autorizados');
});

test('novo convidado recebe meta anual estável e convite sem texto redundante',()=>{
  const data=source('app/api/data/route.ts');
  const app=source('components/WorkoutApp.tsx');
  const invite=source('components/InviteSignup.tsx');
  const sql=source('db/migrations/2026-11-19-allow-seven-training-days.sql');
  assert.ok(data.includes('America/Sao_Paulo'),'ponto inicial estável no dia da inscrição');
  assert.ok(data.includes("AND ${user.role}='member'"),'somente convidados sem meta recebem padrão');
  assert.ok(data.includes('NOT EXISTS (SELECT 1 FROM public.user_training_goals'),'metas personalizadas são preservadas');
  assert.ok(app.includes('defaultMemberGoal(todayLocal())'),'fallback respeita data local');
  assert.ok(app.includes('[1,2,3,4,5,6,7]'),'frequência sete editável');
  assert.ok(app.includes('segunda a domingo'),'domingo é dia válido');
  assert.ok(!invite.includes('Seus treinos serão privados e independentes dos demais usuários.'));
  assert.ok(sql.includes('BETWEEN 1 AND 7'),'banco permite sete dias por semana');
});


test('busca de exercícios usa lista vertical e mantém criação pessoal separada',()=>{
  const picker=source('components/ExercisePicker.tsx');
  const css=source('app/globals.css');
  assert.ok(picker.includes('rankExerciseMatches(items,value)'), 'busca classificada por relevância');
  assert.ok(picker.includes('normalized.startsWith(query)'), 'correspondência inicial tem prioridade');
  assert.ok(picker.includes('.slice(0,8)'), 'limita sugestões visíveis');
  assert.ok(picker.includes('exercise-picker-dropdown'), 'menu próprio de sugestões');
  assert.ok(picker.includes('exercise-picker-create-trigger'), 'criação separada da listagem');
  assert.ok(picker.includes('usedKeys.includes(item.key)'), 'impede repetir exercício na mesma ficha');
  assert.ok(picker.includes('onSelect(item)'), 'seleção mantém chave original do catálogo');
  assert.ok(css.includes('.exercise-picker-options{max-height:270px;overflow-y:auto'), 'resultados com rolagem');
  assert.ok(css.includes('.exercise-picker-option-name'), 'nome e origem apresentados separadamente');
});


test('PRs só exibem fichas e exercícios explicitamente adicionados pelo usuário',()=>{
  const app=source('components/WorkoutApp.tsx');
  const ui=source('components/PersonalRecords.tsx');
  const api=source('app/api/pr-exercises/route.ts');
  const data=source('app/api/data/route.ts');
  const migration=source('db/migrations/2026-11-19-pr-exercise-selection.sql');
  assert.ok(app.includes('(data.prPinned||[]).forEach'),'incluir pins próprios');
  const onlyPrList=app.split('const prExercises=useMemo')[1]?.split('const prReferences=useMemo')[0]||'';
  assert.ok(onlyPrList.length>0&&!onlyPrList.includes('historicalExercises'),'PRs não listar todo histórico automaticamente');
  assert.ok(ui.includes('Adicionar exercício'),'seleção de exercícios avulsos');
  assert.ok(ui.includes('rankExerciseMatches'),'buscar catálogo');
  assert.ok(ui.includes('Referência: último treino (reps planejadas)'),'não confundir meta com medição');
  assert.ok(api.includes('currentProfile()'),'autorização privada');
  assert.ok(api.includes('sameOrigin(request)'),'proteção same-origin');
  assert.ok(api.includes('user.id'),'sempre atribuir pins da sessão');
  assert.ok(api.includes('BASE_EXERCISES'),'validar chaves de catálogo');
  assert.ok(data.includes('FROM public.user_pr_exercises'),'pinned keys no GET');
  assert.ok(data.includes('ws.status=\'finished\''),'apenas sessões concluídas na referência');
  assert.ok(migration.includes('PRIMARY KEY(user_id,exercise_key)'),'não duplicar e isolar seleção');
});

test('busca por peito inclui grupo Peitoral sem limitar a oito resultados',()=>{
  const picker=source('components/ExercisePicker.tsx');
  const catalog=source('lib/exerciseCatalog.ts');
  assert.ok(picker.includes("peito:'Peitoral'"));
  assert.ok(picker.includes('item.muscleGroup===muscleGroup'));
  assert.ok(picker.includes('Consulta por grupo muscular mostra TODAS as opções'));
  assert.ok(catalog.includes('muscleGroup:item.muscleGroup||canonical?.muscleGroup'));
});


test('WOD salva sessão avulsa sem ficha fixa e com catálogo autorizado',()=>{
  const wod=source('app/api/wod/route.ts');
  const builder=source('components/WodDialog.tsx');
  const app=source('components/WorkoutApp.tsx');
  assert.ok(wod.includes('currentProfile()'),'WOD exige autenticação');
  assert.ok(wod.includes('sameOrigin(request)'),'WOD exige mesma origem');
  assert.ok(wod.includes('BASE_EXERCISES'),'WOD valida catálogo');
  assert.ok(wod.includes('user_id=${user.id}::uuid'),'só lê exercícios do usuário');
  assert.ok(wod.includes("VALUES (${user.id}::uuid,'wod'"),'sessão avulsa identificada');
  assert.ok(!wod.includes('INSERT INTO public.user_workout_templates'),'não deve criar ficha');
  assert.ok(!wod.includes('INSERT INTO public.user_pr_exercises'),'não deve adicionar PRs');
  assert.ok(builder.includes('onStarted(body.id)'),'inicia treino salvo');
  assert.ok(builder.includes('onClick={()=>move(index,index-1)}'),'reordenação permitida');
  assert.ok(app.includes('<WodDialog'),'opção visível no aplicativo');
});

test('repetições realmente feitas são separadas de metas históricas',()=>{
  const sets=source('app/api/sets/[id]/route.ts');
  const types=source('lib/templates.ts');
  const detail=source('app/api/sessions/[id]/route.ts');
  const migration=source('db/migrations/2026-11-19-session-actual-reps.sql');
  const app=source('components/WorkoutApp.tsx');
  assert.ok(sets.includes('actual_reps=CASE WHEN'),'reps realizadas precisam ser salvas');
  assert.ok(sets.includes('ws.user_id=${user.id}::uuid'),'séries isoladas por usuário');
  assert.ok(types.includes('actual_reps: number | null;'),'reps medidas separadas');
  assert.ok(detail.includes('ss.actual_reps'),'leitura persistente');
  assert.ok(migration.includes('ADD COLUMN IF NOT EXISTS actual_reps'),'histórico anterior permanece nulo');
  assert.ok(app.includes('Repetições realizadas da série'),'entrada de reps por série');
});

test('aplicação pós-treino exige confirmação, ownership e PR que só melhora',()=>{
  const route=source('app/api/sessions/[id]/apply/route.ts');
  const app=source('components/WorkoutApp.tsx');
  const migration=source('db/migrations/2026-11-19-pr-source.sql');
  assert.ok(route.includes('currentProfile()'),'exige sessão');
  assert.ok(route.includes('sameOrigin(request)'),'exige same-origin');
  assert.ok(route.includes('AND user_id=${user.id}::uuid'),'verifica posse da sessão/ficha');
  assert.ok(route.includes("sessions[0].status!=='finished'"),'não aplicar sessão ativa');
  assert.ok(route.includes('actual_reps'),'não inventar reps');
  assert.ok(route.includes('payload.pr_selections'),'exige seleção explícita por exercício');
  assert.ok(route.includes('seenKeys.has(key)'),'não permite exercício duplicado');
  assert.ok(route.includes('eligible.has(key)'),'só aceita exercícios presentes na sessão');
  assert.ok(route.includes('ss.session_id=${id}::uuid'),'busca séries desta sessão');
  assert.ok(!route.includes('ss.completed=true'),'PR permite registro parcial');
  assert.ok(route.includes('const completedSets=sets.filter(s=>s.completed)'),'ficha ainda usa séries concluídas');
  assert.ok(route.includes('ON CONFLICT(user_id,exercise_key) DO UPDATE'),'promove PR existente');
  assert.ok(route.includes('EXCLUDED.repetitions::numeric/30'),'compara Epley antes de atualizar');
  assert.ok(route.includes('INSERT INTO public.user_pr_exercises'),'inclusão explícita por ação');
  assert.ok(route.includes('UPDATE public.user_workout_templates'),'alterar cargas da ficha futura');
  assert.ok(!route.includes('UPDATE public.session_sets'),'histórico nunca é reescrito');
  assert.ok(app.includes("setPrUpdateMode('prs')"),'abre seleção de exercícios');
  assert.ok(app.includes('choices:PrSelection[]'),'aplica só PRs confirmados');
  assert.ok(app.includes('Atualizar ficha e PRs'),'terceira opção de conclusão');
  assert.ok(migration.includes("source IN ('manual','workout')"),'origem dos PRs separada');
});

test('cronômetro usa início e fim persistidos e reinicia atualização ao reabrir treino',()=>{
  const app=source('components/WorkoutApp.tsx');
  assert.ok(app.includes('Date.parse(startedAt)'),'horário persistido da sessão');
  assert.ok(app.includes('Date.parse(finishedAt)'),'sessão concluída usa horário final');
  assert.ok(app.includes("setClockNow(Date.now())"),'cronômetro vivo');
  assert.ok(app.includes('TEMPO DE TREINO'),'mostra contador');
});


test('migrações de WOD/PR são aditivas e preservam o histórico legado',()=>{
  const migrations=['db/migrations/2026-11-19-pr-exercise-selection.sql',
    'db/migrations/2026-11-19-session-actual-reps.sql',
    'db/migrations/2026-11-19-pr-source.sql'];
  for(const path of migrations){
    const sql=source(path);
    assert.ok(!/\b(TRUNCATE|DELETE FROM|DROP TABLE)\b/i.test(sql),path+' não pode excluir histórico');
  }
  const prs=source('app/api/data/route.ts');
  assert.ok(prs.includes('ss.actual_reps,ss.target_reps'),'última carga preserva reps realizadas ou alvo histórico');
  assert.ok(prs.includes('FROM public.user_pr_exercises'),'lista privada de PRs carregada');
});


test('PRs são escolhidos por exercício, mesmo em séries parciais',()=>{
  const modal=source('components/PrUpdateDialog.tsx');
  const app=source('components/WorkoutApp.tsx');
  const api=source('app/api/sessions/[id]/apply/route.ts');
  assert.ok(modal.includes('type="checkbox" checked={e.active}'),'escolha individual');
  assert.ok(modal.includes('value={e.weight}'),'mantém valor de carga selecionado para edição');
  assert.ok(modal.includes('Repetições feitas'),'repetições do resultado, não target');
  assert.ok(modal.includes('partial:Boolean(best&&!best.completed)'),'séries parciais são consideradas');
  assert.ok(api.includes('payload.pr_selections'),'back-end usa seleção explícita');
  assert.ok(api.includes('const completedSets=sets.filter(s=>s.completed)'),'ficha só considera séries finalizadas');
  assert.ok(app.includes('setPrUpdateMode(\'both\')'),'ação combinada abre seleção');
  assert.ok(app.includes('saveEditedReps'),'reps parciais podem ser registradas');
});

test('histórico não exibe UUID de ficha e conclusão apresenta card compartilhável',()=>{
  const app=source('components/WorkoutApp.tsx');
  const share=source('components/WorkoutShareCard.tsx');
  assert.ok(app.includes("'Ficha personalizada'"),'não mostrar identificador interno');
  assert.ok(!app.includes('Ficha {s.template_id}'),'ocultar ID do cadastro no histórico');
  assert.ok(app.includes('setShowShare(true)'),'tela de conquista após finalizar');
  assert.ok(app.includes('setDetail(completed)'),'continuar com sessão concluída aberta');
  assert.ok(share.includes('c.width=1080;c.height=1920'),'exportar ambos os visuais em 9:16');
  assert.ok(share.includes('navigator.share'),'usuário inicia compartilhamento');
  assert.ok(share.includes('Baixar imagem PNG'),'download de arte disponível');
  assert.ok(share.includes('options.showExercises'),'exercícios são opt-in no card');
  assert.ok(!share.includes('user.email'),'não expor e-mail no compartilhamento');
});


test('card possui seleção elegante de informações, volume imutável e mínimo de duas',()=>{
  const ui=source('components/WorkoutShareCard.tsx');
  const calc=source('lib/workoutShare.ts');
  const css=source('app/globals.css');
  assert.ok(ui.includes('O QUE MOSTRAR NO CARD?'));
  assert.ok(ui.includes('share-info-card is-active'),'cartões com visual selecionado');
  assert.ok(ui.includes('share-info-indicator'),'indicador próprio, não checkbox nativo');
  assert.ok(ui.includes('shareSelectionCount(options)<=2'),'não permite remover a segunda info');
  assert.ok(ui.includes('aria-pressed={active}'),'estado acessível');
  assert.ok(ui.includes('updateShareOption(key)'),'opções independentes');
  assert.ok(ui.includes('toggleTargets'),'metas opcionais para WOD');
  assert.ok(ui.includes("options.showDate?'  ·  '"),'PNG respeita data');
  assert.ok(ui.includes('numericShareTarget(entry.target)'),'metas sem texto extra');
  assert.ok(ui.includes('shareMetricValues(summary,options)'),'prévia e PNG usam mesmos dados');
  assert.ok(ui.includes('pngPoster(detail,visual,options,summary)'),'exportação respeita estilo e seleção');
  assert.ok(calc.includes("set.load_unit!=='kg'"),'assistência e velocidade não contam como volume');
  assert.ok(calc.includes('set.actual_reps'),'volume não usa reps planejadas');
  assert.ok(calc.includes("summary.volumeKg===null?'—'"),'sem inventar volume antigo');
  assert.ok(css.includes('.share-info-card.is-active'),'visual de escolha ativa');
  assert.ok(!ui.includes('manualVolume'),'volume não pode ser digitado');
  assert.ok(!ui.includes('Informar outro volume'),'retira edição de carga/volume');
  assert.ok(!ui.includes('user.email'),'card não compartilha email');
});

test('seletor visual alterna claro/escuro sem voltar ao quadrado de feed',()=>{
  const ui=source('components/WorkoutShareCard.tsx');
  const css=source('app/globals.css');
  const share=source('lib/workoutShare.ts');
  assert.ok(ui.includes('>VISUAL</span>'),'seletor se chama VISUAL');
  assert.ok(ui.includes("setVisual('dark')"),'alternativa escura');
  assert.ok(ui.includes("setVisual('light')"),'alternativa clara');
  assert.ok(ui.includes('aria-pressed={visual'), 'botões anunciam seleção acessível');
  assert.ok(ui.includes('share-poster-${visual}'),'prévia acompanha a aparência');
  assert.ok(ui.includes('c.width=1080;c.height=1920'),'PNG sempre vertical');
  assert.ok(ui.includes('SHARE_THEMES[visual]'),'Canvas usa cores por visual');
  assert.ok(ui.includes('pngPoster(detail,visual,options,summary)'),'exporta visual selecionado');
  assert.ok(share.includes("light:{"),'paleta clara explícita');
  assert.ok(css.includes('.share-poster-light .share-poster-main>strong'),'título escuro no fundo claro');
  assert.ok(css.includes('.share-poster-light .share-poster-metrics'),'métricas legíveis no fundo claro');
  assert.ok(!ui.includes('Feed · 1:1'),'feed foi removido');
  assert.ok(!ui.includes('setFormat('),'seletor não muda proporção');
  assert.ok(!css.includes('.share-poster-feed'),'estilos quadrados removidos');
});
