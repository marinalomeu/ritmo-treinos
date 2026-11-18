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
