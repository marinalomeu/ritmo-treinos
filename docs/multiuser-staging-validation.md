# ritmo. — Validação do multiusuário em staging

**Data:** 18/11/2026. **Status:** pré-homologação; NÃO PUBLICAR em produção.

## O que foi validado

- O proprietário tem e-mail verificado, credencial individual configurada, `role=owner` e `enabled=true` **somente no Neon staging**.
- Foi executado o backfill dos registros da **cópia de staging**:
  - 4 fichas antigas = 4 fichas vinculadas à conta;
  - 2 sessões antigas = 2 sessões vinculadas à conta;
  - 29 séries antigas = 29 séries pertencentes às sessões da conta;
  - 1 meta antiga = 1 meta vinculada à conta;
  - Comparação de colunas das fichas e meta: **zero diferenças**.
  - Sessões sem proprietário e séries sem associação válida: **zero**.
- Foram criadas duas identidades sintéticas e **desativadas**, usando domínio reservado `.invalid`; não são contas humanas convidadas. Cada uma possui 1 ficha `A`, 1 sessão, 1 série, 1 meta fictícias. Ambas coexistem com a ficha `A` do proprietário sem conflito de chave.
- Consultas SQL filtradas por identidade retornaram para a proprietária 4/2/29/1 e para cada perfil sintético 1/1/1/1; sem associação de registros cruzados.
- Foram executados `EXPLAIN` para as duas operações SQL de aceite de convite: ambas são sintaticamente válidas, **sem executar mutações**.
- Os commits do projeto foram compilados em Preview na Vercel; o app principal permanece no commit antigo da `main`.

## O que este teste NÃO demonstra
- Não houve autenticação real com sessões separadas de convidados.
- Não foram feitas tentativas HTTP de leitura/edição/exclusão por outro usuário (IDOR).
- Nenhum link de convite foi emitido a um amigo real; nem e-mail foi enviado.
- Não houve prova de entrega dos eventos `user.before_create`/`user.created` do Neon ao webhook da Vercel.
- O provedor Neon Auth continua com **cadastro público desativado** e webhook **desativado** em staging.
- RLS/role de aplicação precisam de revisão separada; até aqui os filtros de propriedade estão na aplicação SQL.

## Atenção à proteção do Preview
- O Preview Vercel está protegido por autenticação da própria Vercel. A configuração de webhook do Neon exige um endpoint HTTPS atingível pelo provedor.
- Um token de bypass para automação foi gerado no projeto Vercel durante a investigação, mas **não foi cadastrado no Neon nem usado para liberar cadastro**. A tentativa de desmarcá-lo como variável automática falhou porque a Vercel exige que ao menos um token ocupe esse papel.
- **Higiene de credenciais:** revisar e revogar o bypass não utilizado nas configurações do projeto Vercel (`Deployment Protection > Protection Bypass for Automation`). Nunca colar esse token em arquivos Git ou documentação.
- Não desproteger indiscriminadamente todos os Previews para fazer o webhook funcionar.

## Próximos gates
1. Resolver acesso de webhook à infraestrutura de staging com exceção controlada ou bypass adequado.
2. Habilitar o webhook assinado `user.before_create` e `user.created` **somente em staging** e testar evento legítimo e falsificado.
3. Só depois liberar signup nesse ambiente, testando convites válidos, ausentes, vencidos, utilizados e revogados; verificar prova de e-mail.
4. Testar duas contas humanas de teste/convites e ataques IDOR em `/api/data`, `/api/sessions/*`, `/api/sets/*`, `/api/templates/*`, `/api/goal`.
5. Conferir envio por SMTP dedicado para produção; atualizar rate limit de `POST /api/login` para endpoints atuais.
6. Fazer novo snapshot de produção + sincronização final de dados: **staging está defasado**. Em 18/11 a produção tinha 4 fichas, 1 treino, 15 séries e 1 meta; staging da cópia original tem 4/2/29/1.
7. Revisar mecanismos de RLS/role, logins/logout/recovery, logs, custos e rollback.
8. Somente então obter aprovação expressa de go/no-go e implementar o cutover com reconciliação de dados.

**Não fazer merge da PR #2 antes desses gates.**


## Checkpoint adicional — webhook e testes negativos

- Foi configurada uma **credencial de automação temporária**, mantida fora do código, para a chamada do Neon ao endpoint protegido da Vercel em staging. O Neon Auth foi configurado para eventos `user.before_create` e `user.created`.
- O acesso `GET` ao webhook com o bypass retornou **HTTP 405**, comprovando o alcance da rota por essa URL. **Isso ainda não é prova de entrega/assinatura de POST pelo Neon.**
- O cadastro em staging foi habilitado com `user.before_create` ativo. **Não existem convites pendentes** e a produção continua no login antigo.
- Consultas negativas por identidade confirmaram que usuários sintéticos A/B não obtiveram dados de sessões/séries do proprietário ou um do outro. Todas as tentativas de correspondência indevida: **0**.
- Foi tentada uma regra adicional no WAF da Vercel para o novo login: a API respondeu `402 payment_required` (limite de taxa não disponível para o plano atual). **Não houve alteração da regra existente.** Better Auth possui rate limiting integrado; validar sua atuação real na integração gerenciada antes de lançar.
- Um bypass antigo gerado antes desta etapa permanece pendente de inventário e revogação manual; o bypass temporário atual deve ser revogado assim que o webhook não precisar mais dele, sem deixar uma integração apontando para um token revogado.

### Próximo teste com e-mail acessível
Para testar ponta a ponta sem usar dados dos amigos: usar **um segundo endereço de e-mail sob controle da proprietária**, criar convite no painel `/admin/convites`, usar o link e verificar OTP, login e isolamento com duas sessões reais. Também validar cadastro diretamente sem convite (deve ser bloqueado pelo webhook), expiração e revogação. Não compartilhar senhas/códigos na conversa. Não criar convite real até obter o e-mail do teste.


## Rodada final automatizada (18–19/11/2026)

### Evidências positivas
- Contas reais: proprietária e membro com e-mail confirmado, senha configurada, perfis ativos e pelo menos uma sessão válida para cada identidade no Neon staging.
- Convite real do membro: status `accepted`, vinculado ao cadastro.
- Integridade do **snapshot de staging** do proprietário: quatro fichas, duas sessões, 29 séries, uma meta; comparações de atributos das fichas e da meta sem divergências. Estes números **não** são o inventário atual de produção.
- Teste runtime a partir de rota temporária restrita à branch e a uma chave efêmera (removida ao fim): 7/7 handlers privados testados diretamente, sem sessão, responderam `401`:
  - GET `/api/data`
  - GET `/api/sessions/:id`
  - DELETE `/api/sessions/:id`
  - PATCH `/api/sets/:id`
  - POST `/api/sessions`
  - PUT `/api/goal`
  - GET `/api/admin/invitations`.
- Consultas SQL de regressão: os dados do proprietário não aparecem com `user_id` da conta membro; tentativas de correspondência por ID de sessão e série de terceiro deram zero.
- O app ganhou uma barreira adicional antes da passagem para Neon Auth: `POST /api/auth/sign-up/email` exige convite pendente, não expirado e ativado há no máximo 30 minutos. Um cadastro sem convite retornou **403** em teste de execução do próprio handler.
- `tests/security-contract.test.mjs` e workflow `.github/workflows/security-contract.yml` foram adicionados; GitHub Actions run **44448132981 passou**. São testes de invariantes de código, não substitutos para E2E.
- A rota temporária `/api/security-smoke` foi removida da branch. A variável Vercel `RITMO_SECURITY_SMOKE_KEY` teve seu valor invalidado; o conector não permite sua exclusão. Apagar a variável da Vercel manualmente quando conveniente.

### Incidente/ambiguidade investigado — bloqueio de signup no provedor
- Com cadastro habilitado apenas em staging, requisições de teste **diretamente ao endpoint do Neon Auth** usando e-mails sintéticos sem convite retornaram **HTTP 200 com campos `token` e `user`**, porém nenhuma conta correspondente apareceu em `neon_auth.user`, `neon_auth.session` ou `neon_auth.verification`. A resposta NÃO foi uma recusa `INVITE_REQUIRED` comprovada. A existência de sessão válida após essa resposta não foi demonstrada.
- **Medida de contenção aplicada:** `allow_sign_up=false` no Neon staging. Com essa configuração, tentativa direta ao provedor retornou **400 `EMAIL_PASSWORD_SIGN_UP_DISABLED`**, sem usuário criado.
- Adicionada proteção duplicada no proxy da aplicação; isso impede cadastro sem convite **via site**, mas **não demonstra que o próprio endpoint público do provedor recusa toda tentativa direta quando o cadastro estiver reabilitado**.
- Por segurança, manter cadastro de staging **desabilitado** até esclarecer e testar o comportamento do `user.before_create` e da persistência do Auth.

### Critérios de aceite ainda NÃO comprovados
- Teste E2E de ataque IDOR com **duas sessões HTTP autenticadas independentes** para todas as operações CRUD (as credenciais pessoais não foram acessadas nem extraídas; não criar sessões por adulteração do banco).
- Prova de recusa de cadastro sem convite na URL direta do Neon Auth com cadastro habilitado (resultado anterior ambíguo).
- Teste de revogação, expiração e replay de convites de ponta a ponta (foi validado o aceite real de um convite).
- Revisão de papel SQL e RLS; a aplicação hoje usa consultas com filtros de dono, mas o usuário de banco do servidor tem privilégios amplos.
- Configuração SMTP customizado necessária para produção do Managed Auth, checagem de quotas e rate limit efetivo. WAF Vercel recusou criação de regra nova com HTTP 402 (plano atual não oferece o recurso).
- Novo snapshot e backfill baseados em produção no instante do corte; a produção da última leitura possui 4 fichas, 1 sessão, 15 séries, 1 meta.
- Validação de rollout, rollback e go/no-go da proprietária.

**Conclusão:** testes pontuais de isolamento e proteção sem sessão passaram, mas o produto **NÃO ESTÁ HOMOLOGADO para produção**. PR #2 permanece draft, nenhum merge, nenhum dado principal modificado.
