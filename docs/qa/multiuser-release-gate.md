# Ritmo — Gate de liberação multiusuário (20/11/2026)

**Estado: BLOQUEADO para deploy de produção.** Esta página distingue verificações automatizadas, auditoria de banco em staging e testes de comportamento que ainda precisam ser executados com duas contas reais.

## Evidências verificadas nesta rodada

- GitHub Actions Security contract checks: o commit anterior ao ajuste de auditoria de convites passou em 20/11/2026 (workflow run 44659646471). O commit atual precisa de nova execução e resultado confirmado.
- Neon staging branch `staging/multiuser-2026-11-18` (`br-flat-feather-b699t3wq`), consultada com consultas SQL **somente leitura**.
- Contagens em staging: 5 perfis, 1 owner, 10 sessões, 11 fichas, 2 convites aceitos.
- Auditoria de integridade: 0 sessões sem dono, 0 séries órfãs, 0 fichas/metas/PRs/classificações/exercícios customizados sem perfil, 0 convites pendentes vencidos.
- **Pendência identificada:** 2 convites aceitos sem `accepted_by`. O código foi corrigido para novos aceites, mas a remediação dos registros antigos ainda **não foi aplicada**.
- RLS desativado nas seis tabelas consultadas (`workout_sessions`, `session_sets`, `user_workout_templates`, `user_training_goals`, `app_profiles`, `app_invitations`). A segurança depende de verificações explícitas de usuário nas rotas. Isso **não** comprova isolamento em runtime; revisar cada endpoint e a política de acesso do papel SQL.

## Checklists de homologação com duas identidades

Nenhum cenário abaixo pode ser marcado como aprovado sem evidência executável (logs/redações de resposta, request ID, resultado esperado e obtido). Usar **contas de teste**, nunca compartilhar senhas ou tokens nos comentários do GitHub.

| ID | Teste | Critério de aceite | Estado |
| --- | --- | --- | --- |
| MU-01 | Cadastro sem convite | Rejeitado em proxy e provider/webhook | PENDENTE DINÂMICO |
| MU-02 | Convite válido para email A | Apenas A consegue ativar e concluir com email verificado | PENDENTE DINÂMICO |
| MU-03 | Convite vencido, revogado e reutilizado | Rejeitados sem criar perfil ativo | PENDENTE DINÂMICO |
| MU-04 | Convites simultâneos/replay webhook | Um vínculo legítimo; sem duplicação/transferência de aceite | PENDENTE DINÂMICO |
| MU-05 | Acesso cruzado entre duas contas | Usuário B recebe 404/403 ao ler/editar sessões/fichas/séries/PR/metas de A | PENDENTE DINÂMICO |
| MU-06 | Bloqueio de membro | Sessões existentes deixam de autorizar APIs imediatamente | PENDENTE DINÂMICO |
| MU-07 | Papel owner vs member | Somente owner cria/revoga convites e bloqueia contas | PENDENTE DINÂMICO |
| MU-08 | Usuário sem email verificado | Não cria perfil autorizável nem acessa endpoints privados | PENDENTE DINÂMICO |
| MU-09 | Recuperação de conta e expiração de sessão | Tokens expirados e sessões invalidadas não mantêm acesso | PENDENTE DINÂMICO |
| MU-10 | Migração de dados da proprietária | Contagens iguais, owner correto, dados pessoais não migrados a terceiros | PENDENTE DINÂMICO |
| MU-11 | Persistência e regressões | Criar/editar/excluir treino, PR, meta e histórico sem vazamento | PENDENTE DINÂMICO |
| MU-12 | Compatibilidade do pacote #14/#15/#16 | Biblioteca, desafio executável, Stories e arquitetura comercial sem regressões | PENDENTE DE INTEGRAÇÃO |
| MU-13 | Webhook adversarial | Assinatura inválida, payload alterado, replay e falha do provider rejeitados | PENDENTE DINÂMICO |
| MU-14 | Rollback | Snapshot/restore testado; sem perda de dados da conta proprietária | PENDENTE DINÂMICO |
| MU-15 | Build e TypeScript | npm run typecheck e npm run build passam no commit integrado | PENDENTE |

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
