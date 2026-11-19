# PRs e modalidades — validação de staging

**Ambiente:** branch GitHub `feat/multiusuario-convites`, Neon `staging/multiuser-2026-11-18`. Não aprovado para produção.

## Regras implementadas
- `user_personal_records`: PR manual por `(user_id,exercise_key)`, com carga em kg e 1–30 repetições, apenas para exercícios do próprio usuário cujo `unit='kg'`.
- 1RM: se 1 repetição foi realizada, a carga é o 1RM observado; caso contrário `carga × (1 + reps/30)`.
- Intensidades da carga relativas ao 1RM: leve 40–60%; moderada 70–85%; pesada 85–100%. Faixa 60–70% classificada como intermediária.
- Repetições planejadas: carga teórica limite `1RM/(1 + reps/30)` (com 1 repetição = 1RM).
- Carga planejada opcional: percentual da carga em relação ao 1RM, mais índice relativo da série `Epley(carga planejada,reps)/1RM do PR × 100`. **Não equivale ao RPE/RIR medido**, nem a uma recomendação de carga segura.
- Exercícios de assistência, corrida por velocidade e peso corporal podem receber modalidade, mas não recebem o cálculo Epley com o campo atual de carga.
- `user_exercise_modalities`: classificações privadas por `(user_id,exercise_key)`: Academia, CrossFit, Funcional, Calistenia, Corrida, Pilates e Outros; remover classificação também é permitido.
- Os filtros de modalidade e o nome do exercício estão presentes na aba PRs; modalidades também filtram os gráficos na aba Evolução.
- A seleção inicial da Evolução usa preferencialmente um exercício com série concluída e carga válida, em vez de uma chave fixa da conta do proprietário.
- Séries só aparecem nos gráficos quando marcadas como concluídas **e** com carga registrada. Dados incompletos nunca são sintetizados.

## Segurança
- Os endpoints `PUT/DELETE /api/prs` e `PUT /api/exercise-modalities` exigem sessão de perfil ativo e origem permitida; o banco recebe exclusivamente `user.id` da sessão.
- A API `GET /api/data` devolve PRs/modalidades apenas para a conta autenticada.
- Migração versionada: `db/migrations/2026-11-19-personal-records-modalities.sql`. Aplicada apenas em Neon staging.
- As tabelas ainda não têm RLS e compartilham o risco de privilégios SQL amplos já registrado na avaliação geral de multiusuário. **Não promover para produção** sem tratar os gates de autorização e signup.

## Checklist de teste humano pendente
1. Acessar as duas contas independentes do staging.
2. Na conta A, definir modalidade para supino como Academia e PR 20 kg × 10 repetições: 1RM ~26,7 kg; faixas leve 10,7–16 kg, moderada 18,7–22,7 kg, pesada 22,7–26,7 kg.
3. Alterar o PR e observar recálculo imediato após salvar.
4. Clicar no nome do exercício e testar repetições planejadas e carga planejada.
5. Filtrar modalidade Academia nas abas PRs e Evolução; o mesmo exercício deve aparecer.
6. Na conta B, verificar que o PR e a modalidade da conta A não aparecem; realizar a operação inversa.
7. Marcar uma série real como concluída e preencher carga; conferir que o gráfico da própria conta mostra o novo ponto.
8. Executar testes HTTP IDOR entre duas contas antes de homologar, além dos testes de regressão automatizados.

**Status:** implementação disponível em branch de QA, aguardando confirmação do Preview e teste E2E humano. A produção continua sem mudanças.
