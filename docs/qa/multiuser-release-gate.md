# Ritmo — Gate de liberação multiusuário (20/11/2026)

**Estado: BLOQUEADO para deploy de produção.** Esta página distingue verificações automatizadas, auditoria de banco em staging e testes de comportamento que ainda precisam ser executados com duas contas reais.

## Evidências verificadas nesta rodada

- GitHub Actions Security contract checks: duas execuções concluídas com sucesso para o commit `c4b4c503a70162ab844bcf25fac8df3ba20b44f0` em 20/11/2026 ([run 44756220312](https://github.com/marinalomeu/ritmo-treinos/actions/runs/44756220312) e [run 44756206613](https://github.com/marinalomeu/ritmo-treinos/actions/runs/44756206613)). Esses testes de contrato não substituem os cenários dinâmicos.
- Neon staging branch `staging/multiuser-2026-11-18` (`br-flat-feather-b699t3wq`), consultada com consultas SQL **somente leitura**.
- Contagens em staging: 5 perfis, 1 owner, 10 sessões, 11 fichas, 2 convites aceitos.
- Auditoria de integridade: 0 sessões sem dono, 0 séries órfãs, 0 fichas/metas/PRs/classificações/exercícios customizados sem perfil, 0 convites pendentes vencidos.
- **Pendência identificada:** 2 convites aceitos sem `accepted_by`. O código foi corrigido para novos aceites, mas a remediação dos registros antigos ainda **não foi aplicada**.
- RLS desativado nas seis tabelas consultadas (`workout_sessions`, `session_sets`, `user_workout_templates`, `user_training_goals`, `app_profiles`, `app_invitations`). A segurança depende de verificações explícitas de usuário nas rotas. Isso **não** comprova isolamento em runtime; revisar cada endpoint e a política de acesso do papel SQL.

## Checklist de homologação — status atualizado com evidências de 18–20/11/2026

Estados: **VALIDADO (ESCOPO TESTADO)** quando há teste funcional reportado com resultado observado; **PARCIAL** quando apenas parte dos critérios foi coberta; **PENDENTE** quando não há confirmação suficiente. A aprovação integral de um MU exige todos os subcenários e evidência; registros de conversas anteriores são evidências reportadas e não substituem logs e testes reproduzíveis. Usar **contas de teste**; nunca compartilhar senhas ou tokens no GitHub.

| ID | Teste | Critério de aceite | Estado |
| --- | --- | --- | --- |
| MU-01 | Cadastro sem convite | Rejeitado em proxy e provider/webhook | **VALIDADO (ESCOPO TESTADO)** — proxy 403 `INVITE_REQUIRED` e webhook `allowed:false` sem conta persistida (19/11) |
| MU-02 | Convite válido para email A | Apenas A consegue ativar e concluir com email verificado | **PARCIAL** — convite, ativação, email verificado e perfil ativo confirmados; tentativa por email diferente não demonstrada |
| MU-03 | Convite vencido, revogado e reutilizado | Rejeitados sem criar perfil ativo | **PARCIAL** — banco e código impedem reuso de aceitos; revogado, vencido e tentativa HTTP ainda pendentes |
| MU-04 | Convites simultâneos/replay webhook | Um vínculo legítimo; sem duplicação/transferência de aceite | PENDENTE DINÂMICO |
| MU-05 | Acesso cruzado entre duas contas | Usuário B recebe 404/403 ao ler/editar sessões/fichas/séries/PR/metas de A | **PARCIAL** — fichas invisíveis entre contas; exclusão cruzada bloqueada e alterações em séries/cargas negadas; testar PR, metas e todos os endpoints |
| MU-06 | Bloqueio de membro | Sessões existentes deixam de autorizar APIs imediatamente | **PARCIAL** — bloqueio 401 e reativação 200 reportados (19/11); falta evidência de cobertura de todas as rotas e sessão já existente |
| MU-07 | Papel owner vs member | Somente owner cria/revoga convites e bloqueia contas | **PARCIAL** — membro recebeu 401 nas APIs de convites e membros e não criou convite; falta teste explícito de revogação e permissões em todas as operações |
| MU-08 | Usuário sem email verificado | Não cria perfil autorizável nem acessa endpoints privados | PENDENTE DINÂMICO |
| MU-09 | Recuperação de conta e expiração de sessão | Tokens expirados e sessões invalidadas não mantêm acesso | **PARCIAL** — login em preview confirmado após corrigir `Invalid origin`; expiração/revogação e reset ponta a ponta ainda pendentes |
| MU-10 | Migração de dados da proprietária | Contagens iguais, owner correto, dados pessoais não migrados a terceiros | PENDENTE DINÂMICO |
| MU-11 | Persistência e regressões | Criar/editar/excluir treino, PR, meta e histórico sem vazamento | PENDENTE DINÂMICO |
| MU-12 | Compatibilidade do pacote #14/#15/#16 | Biblioteca, desafio executável, Stories e arquitetura comercial sem regressões | PENDENTE DE INTEGRAÇÃO |
| MU-13 | Webhook adversarial | Assinatura inválida, payload alterado, replay e falha do provider rejeitados | PENDENTE DINÂMICO |
| MU-14 | Rollback | Snapshot/restore testado; sem perda de dados da conta proprietária | PENDENTE DINÂMICO |
| MU-15 | Build e TypeScript | npm run typecheck e npm run build passam no commit integrado | PENDENTE |

## Evidências funcionais recuperadas (18–20/11/2026)

- **MU-01 (19/11):** tentativa de cadastro sem convite via app retornou HTTP 403 / `INVITE_REQUIRED`. Chamada direta ao provedor acionou `user.before_create` com `allowed:false`; apesar do HTTP 200 externo, a inspeção posterior constatou ausência de novo usuário persistido. Registrar a diferença entre status HTTP e bloqueio efetivo.
- **MU-02 (19–20/11):** convite para `nina.boxfornews@gmail.com` ativado, email verificado e perfil `member` habilitado. Conferência SQL em staging confirmou cadastro e credencial; falta testar tentativa por email diferente.
- **MU-03 (20/11):** consulta somente leitura constatou **2 convites aceitos, 0 pendentes**, e nenhuma linha aceita elegível para reativação. O endpoint exige `status='pending'`; sem token original, não foi efetuada a chamada HTTP de reutilização. Casos revogado/expirado ainda não executados.
- **MU-05 (19/11):** testes funcionais relatados com contas distintas: fichas de uma conta invisíveis à outra; exclusão cruzada de treino rejeitada; tentativa de alteração cruzada de séries/cargas não modificou dados. Escopo de PRs, metas e demais rotas ainda não coberto integralmente.
- **MU-06 (19/11):** teste reportado de bloqueio/reativação de membro retornou 401 durante bloqueio e 200 após reativação. Falta coletar evidência de session-cookie ativa e demais APIs.
- **MU-07 (19/11):** chamadas feitas com conta de membro a `/api/admin/invitations` e `/api/admin/members` retornaram 401, e membro não conseguiu criar convite. Owner visualizou área de administração no preview em 20/11. Revogação e demais operações administrativas ainda pendentes.
- **MU-09 (20/11):** erro `Invalid origin` observado em screenshot; adicionada origem exata do preview à allowlist Better Auth da branch de Neon staging; usuária confirmou login bem-sucedido depois da correção. Não comprova ainda o sucesso do reset nem expiração ou revogação de sessão.
- **CI (20/11):** verificações automáticas de contrato de segurança verdes no commit `c4b4c503a70162ab844bcf25fac8df3ba20b44f0` (runs 44756220312 e 44756206613).

**Nota de rastreabilidade:** evidências funcionais anteriores provêm de resultados reportados na sessão de testes de 19/11 e auditados em conversa; nem todos contam com logs de requisições ou identificadores guardados. **Não interpretar "PARCIAL" como teste integral homologado.**

## SQL de auditoria somente leitura

Executar apenas na branch de staging, nunca apontar para a branch principal por engano:

```sql
SELECT
 (SELECT count(*) FROM public.app_profiles) AS total_profiles,
 (SELECT count(*) FROM public.app_profiles WHERE role='owner') AS owner_count,
 (SELECT count(*) FROM public.workout_sessions WHERE user_id IS NULL) AS sessions_without_owner,
 (SELECT count(*) FROM public.session_sets ss LEFT JOIN public.workout_sessions ws ON ws.id=ss.session_id WHERE ws.id IS NULL) AS orphan_sets,
 (SELECT count(*) FROM public.app_invitations WHERE status='accepted' AND accepted_by IS NULL) AS accepted_without_user,
 (SELECT count(*) FROM public.app_invitations WHERE status='pending' AND expires_at<NOW()) AS expired_pending;
```

Resultado observado 20/11/2026: owner_count=1, sessions_without_owner=0, orphan_sets=0, accepted_without_user=2, expired_pending=0.

## Remediação da rastreabilidade

A correção de código associa `accepted_by` **somente depois** da criação de `app_profiles` (evitando violação da chave estrangeira), tanto no webhook quanto no fallback autenticado. Backfill de convites históricos deve exigir identidade correspondente inequívoca e email verificado, com transação/backup e revisão; **não foi executado**.

## Regras de liberação

1. Todos os MU-01 a MU-15 aprovados em staging com registro de evidências.
2. PR de multiusuários rebaseada/integrada à branch de staging consolidada para evitar sobrescrever as mudanças das PRs #14, #15 e #16.
3. Aprovação de migrações e restauração em staging, sem tocar em produção durante QA.
4. Nenhum deploy automático de produção durante a fase de testes. Liberar somente por go/no-go explícito.

**Conclusão atual:** código e schema parcialmente validados, mas **isolamento entre contas ainda não homologado**. Este gate não deve ser tratado como aprovação para liberar usuários.


## Evidência adicional — 20/11/2026: login em preview

- Usuária apresentou erro `Invalid origin` ao fazer login no deploy preview `ritmo-treinos-deauyddbx-marina-lomeus-projects.vercel.app`.
- Na configuração do Neon Auth **da branch de staging**, somente o alias fixo da branch estava autorizado como origem confiável.
- A origem exata do preview foi adicionada ao allowlist Better Auth, e o cadastro foi confirmado por nova leitura da configuração.
- A usuária confirmou em seguida: **"consegui"**, referindo-se ao login no preview após a correção.
- **Resultado parcial MU-09:** LOGIN VALIDADO para esta conta/preview após a correção de origem. Continuam pendentes os testes de expiração de sessão, revogação de sessão e comprovação separada de reset de senha ponta a ponta. Não marcar MU-09 completa.
- Nenhuma senha foi consultada ou modificada pela equipe, e nenhuma alteração foi aplicada ao banco de produção.


## Nova auditoria somente leitura — 20/11/2026 (retomada da homologação)

**Objetivo:** atualizar evidência de staging antes de executar os testes dinâmicos restantes. **Sem escrita no banco, credenciais ou deploy.**

- Neon project `small-moon-69587175`, branch staging `br-flat-feather-b699t3wq` (não é produção): **5 perfis, 1 owner, 14 sessões e 11 fichas**. A contagem de sessões evoluiu em relação às 10 anotadas anteriormente; não constitui perda de dados, mas exige reconciliar quais sessões são de teste antes do cutover.
- Integridade: **0 sessões sem `user_id`, 0 séries órfãs, 0 convites pendentes vencidos**.
- Rastreabilidade: **2 convites aceitos continuam com `accepted_by IS NULL`**. Não foram alterados. Backfill só com identidade inequívoca, backup e aprovação.
- PostgreSQL: RLS continua **desligado** nas tabelas `app_invitations`, `app_profiles`, `session_sets`, `user_custom_exercises`, `user_personal_records`, `user_training_goals`, `user_workout_templates` e `workout_sessions`. Como o banco é usado em rotas server-side, verificar permissões SQL e **IDOR dinâmico por API**; não tratar a existência de filtros como isolamento comprovado.
- Inspeção estática das rotas `admin/invitations`, `admin/members`, `sessions/[id]`, `sets/[id]`, `prs`, `goal`, `templates`, `sessions/[id]/apply`: há `currentProfile()` e referências ao ID do usuário; rotas administrativas exigem `role==='owner'`. Essa inspeção **não** substitui os testes completos com dois usuários.
- Segurança: `Security contract checks` do commit mais recente `4ad22b6c022ae76af58fbe8d4fd6e2d7703f6219` aparece como **completed/success** no GitHub Actions. Ainda falta `npm run typecheck` e `npm run build` verificados no candidato congelado.
- Vercel: preview da branch de desenvolvimento, commit `4ad22b6`, aparece como **READY**. Este status é de build/infraestrutura e não comprova que convites, autenticação e isolamento foram homologados.

### Execução ainda necessária, por prioridade
1. **MU-05/MU-06/MU-07:** E2E com duas sessões reais independentes e múltiplos recursos (incluindo PR/metas), bloqueio com cookie existente, revogação administrativa.
2. **MU-02/03/04/08/09/13:** convite de outro e-mail, expirado, revogado e replay; e-mail não verificado; reset, expiração e webhook adulterado, tudo em ambientes/contas de teste.
3. **MU-10/14:** snapshot e inventário atual de produção, plano/ensaio de migração e rollback **apenas em branch isolada**, após autorização para qualquer escrita.
4. **MU-11/12/15:** regressões de treino/ficha/meta/PR/histórico, compatibilidade de pacote, typecheck/build do commit congelado, testes mobile/PWA.

**Gate permanece BLOQUEADO.** Não mudar status MU individual com base nessas verificações passivas.
