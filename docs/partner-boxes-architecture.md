# Ritmo — Arquitetura futura: boxes parceiros e WOD do dia

Status: desenho técnico versionado. Não implementado nem ativado em produção.

## Três experiências distintas

- **Suas fichas:** somente as fichas pessoais do aluno.
- **Em Outro Ritmo:** desafios e provas da biblioteca geral, com sessão executável.
- **Meu Box:** área privada e opcional, exibida somente quando o usuário possui vínculo ativo com um box. O usuário pode ter mais de um vínculo.

## Duas relações independentes

1. **Atribuição comercial:** identifica qual parceiro originou uma venda ou indicação, com evidência, canal e data. Isso não concede acesso ao box e pode permanecer mesmo após saída do aluno. Comissões e percentuais requerem contrato separado.
2. **Membership:** autoriza acesso à área privada do box. Pode ocorrer por convite, sem exigir que a venda tenha sido feita pelo mesmo box.

Não associar usuários a parceiros apenas porque o box apresentou uma lista de e-mails. Validar legitimidade do vínculo, identidade e tratamento de dados conforme LGPD. O box não recebe automaticamente acesso ao histórico pessoal do usuário.

## Papéis

- owner: gerencia o box e sua equipe.
- admin: gerencia convites, membros e WODs; não transfere propriedade.
- coach: cria, edita, agenda e publica WODs.
- member: lê os WODs publicados do próprio box e inicia sessões pessoais.
- não membro: não recebe nome, lista de integrantes, programação nem detalhes de um box privado.

Cada acesso à API precisa validar usuário autenticado, membership ativo, box solicitado e papel. Fazer autorização no servidor e negar por padrão.

## Fluxo do aluno

1. Recebe convite privado dentro da plataforma, ou por link de ativação enviado a e-mail verificado quando já tiver conta.
2. Aceita o convite de uso único dentro do prazo e passa a ver Meu Box.
3. Consulta o WOD do dia ou de uma data futura já publicada, antes de sair de casa.
4. Inicia o WOD: o aplicativo faz uma cópia da prescrição para uma sessão privada do aluno.
5. Ajusta suas próprias cargas e registra séries, tempo e resultado conforme o formato do WOD.
6. A execução fica no histórico; não entra nas suas fichas reutilizáveis.
7. Quando perder o membership, deixa de acessar novas publicações; seu histórico particular permanece sob sua conta.

## Fluxo do coach

O coach escolhe o box, uma data e um fuso, seleciona exercícios do catálogo central e define séries, repetições, distâncias, cargas sugeridas, formato, time cap e instruções. Salva rascunho, agenda publicação ou publica. Alterações posteriores são versionadas; sessões iniciadas mantêm a prescrição original.

WODs programados não devem ser divulgados antes da publicação. Cache das APIs privadas deve ser no-store. Não retornar dados de outros boxes em endpoints de busca.

## Dados previstos

A migração proposta db/migrations/20261120_partner_boxes_foundation.sql define:
- app_users: identidade com e-mail verificado e auth_subject
- partner_organizations: box e seus metadados
- partner_memberships: vínculos e papéis, múltiplos boxes por usuário
- partner_invitations: convite por e-mail e token apenas em hash, revogável, uso único
- partner_attributions: origem comercial independente da permissão de acesso
- partner_agreements: contratos e vigência
- partner_wods: WODs privados, datas, publicações, formatos e exercícios em JSONB

O JSON dos exercícios deve usar identificadores estáveis de data/exercises.json. Não duplicar catálogo de movimentos por parceiro.

## Bloqueio técnico obrigatório antes de habilitar

**O app atual usa senha compartilhada e tabelas globais. Não existe isolamento individual suficiente.**

Antes da primeira conta de box é necessário:
1. Implementar autenticação individual com e-mail verificado e sessão vinculada a user_id.
2. Migrar dados pessoais antigos, com owner_id/user_id em sessões, séries, fichas, metas e evolução. Nunca presumir quem é dono de dados legados compartilhados.
3. Ajustar todas as rotas atuais para filtrar por user_id. Revisar IDOR, autorização e acesso cruzado.
4. Exigir membership ativo e papel adequado em todas as rotas de box, inclusive leitura e convites.
5. Aceitação de convite atômica, com token criptograficamente aleatório salvo apenas por hash, e e-mail verificado correspondente; tratar reuso/expiração/concorrência.
6. Revisar LGPD, finalidade, retenção e consentimentos relevantes. Não dar aos coaches acesso irrestrito aos dados dos membros.
7. Testes automáticos de isolamento multiusuário/multibox, backup e rollout em staging.

Não executar a migração SQL enquanto essas dependências não estiverem atendidas.

## Entregas por fase

A: identidade individual e migração do histórico.
B: tenants, convites privados e papéis.
C: calendário/editor/publicação do WOD, sessões com cargas editáveis e métricas por formato.
D: atribuição comercial, controle de planos e relatórios de parceiro dentro de permissões e contratos.

Decisão de produto: a entrada Meu Box fica **invisível sem membership**, não apenas desabilitada.
