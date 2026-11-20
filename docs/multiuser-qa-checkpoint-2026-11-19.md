# Ritmo — checkpoint de QA multiusuário — 19/11/2026

**Ambiente:** Neon `staging/multiuser-2026-11-18`, Vercel Preview, branch `feat/multiusuario-convites`.
**Gate:** NÃO HOMOLOGADO; sem merge da PR #2, sem promoção para produção e sem habilitar sign-up no Neon.

## Evidências verificadas por leitura (sem mutações no banco)
- Neon staging: 4 usuários Auth e 4 perfis de aplicação, dos quais 2 ativos e verificados (owner e member).
- Contas ativas: owner 4 fichas / 2 treinos / 29 séries / 1 meta; member 1 ficha / 1 treino / 3 séries / 1 meta.
- Duas identidades adicionais são fixtures sintéticas desativadas, não usuários convidados.
- 0 sessões de treino sem proprietário; 0 séries órfãs; 0 fichas e 0 metas sem perfil.
- Chaves compostas `(user_id,id)` permitem identificador de ficha repetido entre usuários diferentes.
- 8 tabelas de aplicação em `public` sem RLS: controle de acesso depende do backend e do papel PostgreSQL usado.
- Inspeção de rotas: leitura e mutações de treinos, séries, fichas e metas filtram `user.id` derivado de `currentProfile()`; não comprova ausência de IDOR em E2E.
- Neon Auth staging `allow_sign_up=false`; Google OAuth está configurado. O status do OAuth não prova sozinho que usuários não convidados sejam barrados em todos os fluxos de criação.
- Webhook `user.before_create` + `user.created` habilitado no staging; falta evidência confiável de POST assinado e recusa de criação direta pelo provedor.
- GitHub Actions run 44509712298: `Security contract checks` = success, commit `9e1e96b`. Verificação de status Vercel = success.
- `app/api/invitations/activate/route.ts`: `COALESCE(activated_at,NOW())` preserva o primeiro horário de ativação e nega reativação depois de 30 minutos. O contrato está coberto em `tests/security-contract.test.mjs`.
- Matriz SQL read-only de elegibilidade (pending ativado, pending sem ativação, expiração por data, janela de ativação vencida, revoked, accepted): 6/6 cenários com comportamento esperado. SQL considera resultado NULL como não elegível, como ocorre em filtros WHERE.
- Neon Auth logs indisponíveis neste projeto (telemetria não habilitada); Vercel Hobby não permite consultar a janela de 24 horas de runtime logs. Ausência de logs não é evidência de ausência de falhas.

## Riscos bloqueantes
1. **IDOR E2E:** executar testes HTTP de leitura, alteração e exclusão com *duas sessões autenticadas independentes*; nunca extrair cookies pessoais nem fabricar sessão por SQL.
2. **Provedor diretamente acessível:** demonstrar recusa de cadastro sem convite mesmo em chamadas diretas ao Neon Auth com signup temporariamente habilitado em ambiente descartável/isolado; resposta 200 anterior foi ambígua e não demonstrou persistência nem recusa.
3. **OAuth:** confirmar que `user.before_create` atua em primeiro login social e que contas não convidadas não ganham perfil ativo; não presumir que `allow_sign_up=false` de email/senha cobre OAuth.
4. **Vínculo convite ↔ cadastro:** gate atual confere email + convite pendente ativado, mas não apresenta o token como desafio na requisição de criação; revisar risco de corrida/tomada de identidade e comprovar OTP/verificação antes de liberar.
5. **Hardening do banco:** revisar RLS e privilégios mínimos em conexão do app, migrar com avaliação de compatibilidade em branch isolada.
6. **Operacional:** custom SMTP/quotas/rate limiting, revogação de bypass temporário e variáveis de teste, logs, rollback, snapshot e backfill atualizados da produção.

## Próximo procedimento seguro
- Manter cadastro fechado e PR em draft.
- Testar sem sessão e com perfis de teste pelos fluxos legítimos; registrar códigos HTTP sem divulgar tokens/cookies.
- Só habilitar cadastro em uma branch descartável após isolamento dos webhooks/URL e testes negativos documentados.
- Não modificar produção nem aprovar go/no-go sem autorização expressa.

## Execução independente adicional — 19/11/2026 (homologação solicitada)

### Execução em ambiente isolado (Vercel Sandbox descartável)
- Checkout da branch no commit `a941563` (sem conexão com dados ou credenciais de produção).
- `node --test tests/security-contract.test.mjs`: **8/8 passaram**, saída efetiva registrada.
- `npm run typecheck`: **exit code 0**, sem erros.
- `npm run build`: **exit code 0**, Next.js compilou e gerou rotas; build executado com dependências instaladas com `--ignore-scripts` e sem lockfile salvo.
- GET não autenticado ao Preview pela infraestrutura de sandbox retornou **HTTP 302** (redirecionamento por proteção Vercel); isso demonstra que essa chamada não atravessou a proteção até a aplicação e **não** permite concluir que a API responderia 401.
- Tentativa de automatizar teste de cadastro direto ao Neon foi **bloqueada pelo ambiente de execução**, sem resultados HTTP; não classificar como sucesso nem como teste executado.
- Nenhum token, cookie pessoal, senha, segredo, convite ou configuração da produção foi consultado ou divulgado.

### Verificações SQL de propriedade com identidades já existentes
- Consultas read-only simulando filtros de ator/vítima para owner e member em sessões, séries, fichas e metas: **8/8 sem correspondência cruzada**.
- Estas consultas **não equivalem a ataques HTTP IDOR autenticados**, porque não executaram os handlers da aplicação sob duas sessões reais.

### Resultado da rodada
- **APROVADO apenas:** contrato estático, TypeScript, build, integridade de filtragem SQL.
- **NÃO COMPROVADO:** bloqueio direto de signup com cadastro habilitado, OAuth primeiro acesso, IDOR com duas sessões independentes, expiração/replay/revogação E2E, recovery/logout/OTP E2E.
- **SEM GO-LIVE:** `allow_sign_up=false` no staging, PR #2 draft, produção preservada. Teste direto do provedor exige ambiente temporário isolado com autorização operacional e ferramenta capaz de executar HTTP; não reabrir cadastro na branch em uso para contornar o bloqueio.
