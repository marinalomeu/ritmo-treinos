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

## Programa de indicação / afiliados — dois convites independentes

**Decisão de produto (20/11/2026):** a tela de convites poderá ser liberada para boxes e, futuramente, usuários comuns. Um link de indicação atribui possível receita comercial, **não** concede permissão de visualização de WODs nem prova que a pessoa treina naquele box.

### Cenário X/Y
1. O box gera um link de indicação público/reutilizável (ou código), identificado por `referral_links.code`.
2. X se cadastra pelo link do box e passa a treinar lá. O cadastro pode gerar um `referral_claim` pendente; **somente uma conversão de pagamento elegível e confirmada** permite calcular eventual comissão. Para acessar WODs, X recebe **outro convite**, privado, de uso único, direcionado a e-mail verificado, via `partner_invitations`.
3. Y também se cadastra pelo link, mas faz musculação em outra academia. Seu pagamento elegível pode gerar comissão para o mesmo box, **sem membership ou acesso** ao box.
4. X e Y mantêm suas fichas e históricos sob contas individuais, independentemente da atribuição comercial.

### Diferenças de segurança e UX
| Recurso | Link afiliado | Convite privado do box |
| --- | --- | --- |
| Finalidade | Origem da venda/indicação | Membership e acesso ao painel/WOD |
| Público-alvo | Qualquer potencial assinante | E-mail especificamente convidado |
| Reutilização | Reutilizável até pausar/expirar | Token de uso único, revogável, prazo curto |
| Acesso concedido | Nenhum | Acesso ao box conforme papel autorizado |
| Resultado do clique | Cadastro com rastreamento permitido | Aceitação autenticada e e-mail verificado |
| Gera comissão | Nunca apenas pelo clique/cadastro | Nunca por si só |

### Evolução da tela de convites
- **Parceiro/box:** link de indicação, código copiável, convites privados a membros, histórico de indicação e métricas comerciais autorizadas; sessões pessoais dos indicados não ficam acessíveis.
- **Usuário comum (futuro):** link próprio do programa de indicação, se elegível, sem criação de organização/box.
- **Admin Ritmo:** políticas de elegibilidade, limite, validade, alteração, suspensão, auditoria de conversões e reversões por estorno.
- A interface deve explicar a distinção entre **Indicar o Ritmo** e **Convidar para meu box**; nunca reutilizar o mesmo token para as duas ações.

### Regras comerciais a definir antes da operação
- Atribuição first-touch/last-touch, janelas, regras de múltiplos indicadores e proteção contra autosindicação.
- Eventos de assinatura, pagamentos, renovação, cancelamento, estorno, chargeback e conciliação financeira. Definir se a comissão é pontual ou recorrente.
- Eligibility, tratamento LGPD (consentimento e retenção para tracking), e ausência de compartilhamento automático de e-mails com o box.
- Contrato de comissionamento separado de contrato de membership; vínculo ao box nunca altera o indicador da compra sem regra explícita.
- As tabelas futuras `referral_links`, `referral_claims` e `referral_conversion_events` estão em `db/migrations/20261120_referral_affiliates_future.sql`. A tabela anterior `partner_attributions` é apenas uma base preliminar e **não pode ser utilizada em paralelo como segundo cálculo de comissão** sem reconciliação e decisão de modelo único.

**Status:** somente especificação e migração proposta; não foi implementado cadastro por indicação, rastreamento, comissão nem convites operacionais.
