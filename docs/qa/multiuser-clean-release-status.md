# Ritmo — atualização de gate: início zerado (20/11/2026)

**REGRA DE PRECEDÊNCIA:** esta atualização substitui os critérios legados de preservação de dados em `docs/qa/multiuser-release-gate.md` e `docs/multiuser-cutover.md`. Evidências funcionais completas estão na issue #4.

## Decisões ratificadas

- Multiusuário começa sem fichas, séries, sessões, metas, histórico ou PRs importados da produção antiga.
- Não executar `db/migrations/002_owner_backfill.sql` no cutover limpo.
- Não apagar dados legados; usar implantação aditiva e isolamento lógico dos novos usuários.
- Preservar Neon Auth, perfis, convites, configurações, código e infraestrutura. Dados de QA do staging não devem ser copiados para produção.
- A nomenclatura atual `Corrida 500m` na HYROX segue válida se esta ficha voltar a existir, mas nenhuma ficha legada precisa ser transportada.
- Backup de histórico descartável não é gate; reversibilidade da autenticação/configuração e isolamento das contas **continuam gates**.

## Evidências dinâmicas documentadas

- MU-01 cadastro sem convite bloqueado no proxy e webhook provider.
- MU-03 convites revogados não ativam; demais variantes pendentes.
- MU-05 isolamento de GET /api/data, séries, planos/sessões em ambas as contas, com SQL.
- MU-06 bloqueio com sessão ativa retorna 401 e reativação 200, incluindo APIs adicionais.
- MU-07 membro não administra contas; owner não consegue bloquear a si mesma.
- MU-09 logout invalidou a sessão ativa.
- MU-11 membro criou/editou/excluiu fichas; criou/concluiu/excluiu sessão e séries; registrou/excluiu PR; editou/restaurou meta. SQL confirmou limpeza e preservação dos demais dados.
- MU-13 chamadas com assinatura webhook ausente/falsa retornaram 400; assinatura verdadeira com replay segue pendente.

**Os cenários acima foram aprovados somente em seus escopos; NÃO homologam MU-01..15 integralmente.**

## CI e release

O workflow `.github/workflows/release-quality.yml` executa `npm ci`, `npm run typecheck`, contratos de segurança/regressão e `npm run build`, sem deploy. Uma falha bloqueia publicação; todos os gates acima continuam exigidos.

**Status do release: BLOQUEADO** até resultado CI e testes finais, configuração de Neon Auth de produção e autorização expressa.
