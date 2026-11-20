# Ritmo — cutover limpo multiusuário

Decisão da proprietária (20/11/2026): **não migrar dados pessoais de treino** da versão legada. Descartáveis: fichas, séries, sessões, histórico, metas e PRs antigos. **Isso não autoriza apagar credenciais, perfis, convites, backups ou o banco principal durante QA.**

## Execução obrigatória — produção (somente após GO)

1. Congelar as mudanças e confirmar o commit candidato com typecheck, build e contratos verdes em GitHub Actions. Não instalar/deployar por commit de correção isolado.
2. Fazer inventário somente leitura de produção (branch Neon `main`) e confirmar domínio, ambiente Vercel, branch e variáveis de produção, **sem reutilizar segredos de staging**.
3. Ativar/configurar Neon Auth **da produção**: domínio confiável exato, senha, SMTP, webhooks assinados, convite obrigatório e identidade da proprietária real com e-mail verificado. Não copiar usuário/UUID de QA.
4. Executar migração **001_multiuser_additive.sql** e migrações aditivas subsequentes em ordem, sem executar `002_owner_backfill.sql`. O backfill histórico é dispensado por decisão de produto.
5. Criar o perfil `owner` somente após validar `neon_auth."user"` real e o e-mail escolhido pela proprietária; exigir role `owner`, `enabled=true` e identidade verificada em consulta SQL antes de permitir tráfego.
6. **Isolamento do estado inicial:** as tabelas novas `user_workout_templates`, `user_training_goals`, `user_personal_records`, `user_pr_exercises`, `user_custom_exercises`, `user_exercise_modalities` devem estar vazias para a nova conta, sem rows legadas associadas. Sessões legadas em `workout_sessions` podem permanecer `user_id IS NULL`: o aplicativo novo só consulta `WHERE ws.user_id=...`. **Nunca forçar o backfill nem alterar IDs das sessões antigas.**
7. Preservar tabelas legadas e dados históricos em repouso (inacessíveis ao app novo) durante o período de estabilização. Nenhum `TRUNCATE`, `DELETE` ou `DROP` é necessário para começar do zero.
8. Confirmar controle de convites (cadastro sem convite bloqueado no proxy **e** provider), isolamento owner/member, logout, bloqueio de conta, rotas administrativas e `/demo`; teste adversarial residual de replay/expiração/e-mail incorreto obrigatório.
9. Com gates aprovados e autorização explícita de GO, fazer **uma única publicação consolidada**; validar o fluxo novo e disponibilizar convidados de forma controlada.

## Rollback

- Manter versão antiga do frontend e configuração de ambiente exportada/identificada para reversão.
- A migração de schema é **aditiva**; retornar à versão antiga não exige desfazer as tabelas novas.
- Desativar o acesso à nova versão durante um incidente; não restaurar um snapshot antigo por cima de registros novos sem inventariar a diferença.
- O backup de 18/11 foi restaurado em branch isolada e é **histórico**, não um backup atual. O risco de perda de fichas/séries antigas foi expressamente aceito; integridade de identidades e convites continua obrigatória.

## Bloqueios reais restantes

- MU-02/03/04/08/09/13: testes adversariais de convites, e-mail não verificado, expiração/reset e webhook.
- MU-05/06/07: cenários restantes de autorização cruzada e bloqueio.
- MU-15: `typecheck`, `build` e contratos no commit consolidado.
- Neon Auth de produção: SMTP, trusted origins, webhook, owner verificado e variáveis de produção, sem segredos de QA.
- Revisão final de segurança e GO/NO-GO antes de produção.

Sem GO, **não aplicar SQL de produção, não trocar ambientes e não publicar**.
