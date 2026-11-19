# ritmo. — Plano de ativação multiusuário

**Status: desenvolvimento, não pronto para produção.**
Issue: #1. PR em rascunho: #2. Nenhuma migração do banco principal foi aplicada.

## Ambientes
- Produção Neon: branch `main`; login antigo preservado.
- Banco de testes Neon: branch `staging/multiuser-2026-11-18`; auth Better Auth habilitado somente em staging.
- Frontend: branch GitHub `feat/multiusuario-convites` no Preview da Vercel, com variáveis restritas à branch.
- Snapshot de referência: `ritmo-before-multiuser-2026-11-18` (confirmar validade antes da migração real).
- Contagem do ponto de partida: 4 fichas, 2 treinos, 29 séries e 1 meta.

## Política de identidades
- O proprietário é UMA conta Neon Auth criada com um e-mail **explicitamente escolhido** pela mantenedora.
- E-mail verificado e sessão válida são exigidos; perfil `app_profiles` precisa existir e estar enabled.
- Toda consulta e mutação aplica filtro de usuário a partir da sessão — nunca aceita `user_id` do corpo.
- Convidados recebem contas independentes, sem fichas privadas pré-carregadas.
- `/demo` mantém dados fictícios e localStorage; não conecta ao Neon.

## Regras de convite
- Convites: token de 32 bytes aleatórios; apenas hash SHA-256 no banco.
- Envio: link copiado manualmente pela conta proprietária. Não precisamos enviar e-mails de convite pelo servidor.
- Validade: 7 dias; vínculo com e-mail específico; status pending/accepted/revoked.
- O webhook assinado `user.before_create` precisa **bloquear toda persistência de usuário sem convite ativo**, inclusive POST direto à API de autenticação. **O status HTTP isolado não demonstra autorização**: quando email verification é obrigatória, Better Auth pode retornar HTTP 200 com um usuário sintético e `token:null` para prevenir enumeração de e-mails (Better Auth docs, "Email Enumeration Protection"). Homologar pelo webhook assinado registrando `allowed:false`, inexistência de registro `neon_auth."user"` e ausência de perfil/sessão; teste positivo exige persistência e verificação só com convite.
- O webhook `user.created` vincula a conta criada ao perfil de membro.
- Não habilitar sign-up na branch até que webhook, domínio, WAF e teste negativo funcionem.
- Neon Auth produção exige SMTP customizado; verificar antes de ativar usuários reais.

## QA de segurança — não declarar pronto sem executar
1. GET `/api/data`, GET `/api/sessions/<uuid>`, PATCH `/api/sets/<id>`, DELETE `/api/sessions/<uuid>` sem login retornam 401.
2. Conta A não lê nem altera dados da B, mesmo conhecendo seus UUIDs/IDs.
3. Listas, progresso, históricos e gráficos não misturam dados; nenhuma query antiga sem filtro.
4. Metas e fichas com IDs iguais (A, B, C, D) podem existir em usuários diferentes.
5. Conta B não herda a meta "Projeto Carnaval" nem as cargas existentes do proprietário.
6. A ausência de perfil causa bloqueio, mesmo que Neon Auth considere a sessão válida.
7. Link de convite inválido, expirado, já utilizado ou revogado não cria conta.
8. Cadastro direto sem convite é bloqueado pelo provedor, não somente pela UI. **Critério específico:** webhook `user.before_create` com assinatura verificada retorna `allowed:false`, banco mantém 0 novos usuários/perfis e o fluxo não permite sessão nem acesso. Não exigir status HTTP 4xx do Neon Auth quando ele emitir `200` sintético de proteção contra enumeração. Repetir com convite válido e OTP para provar o caminho positivo.
9. Verificação e recuperação de e-mail, login, logout, reentrada, refresh e sessão expirada.
10. Preview não consegue acessar DATABASE_URL de produção; procurar nomes das variáveis sem revelar valores.
11. Atualizar regra WAF: o login antigo `/api/login` foi substituído por Neon Auth (endpoints efetivos a verificar).
12. Verificar impacto do PWA, dispositivos móveis, cache e links OG.
13. Verificar custos de SMTP, Neon Auth, Neon branches e limites Vercel.
14. Testar restauração de snapshot em branch descartável; registrar contagens.

## Ordem obrigatória do cutover de produção
1. Usuária seleciona e-mail proprietário. Não inferir do GitHub ou de ferramentas.
2. Testar duas contas reais separadas no staging + convites e e-mail.
3. Backup/snapshot final e reconciliação **atualizada**, dado que novos treinos são gravados diariamente.
4. Preparar janela controlada de manutenção/sem escrita; documentar snapshot e hash dos registros.
5. Habilitar Auth produção, associar conta real verificada e aplicar migração aditiva versionada.
6. Executar owner backfill em transação; conferir ID de cada treino/série/meta/ficha.
7. Somente então considerar coluna owner NOT NULL e remoção de acesso legado; aplicar nova versão do app.
8. Atualizar WAF; teste de login, edição da ficha, registro de treino, histórico, e `/demo`.
9. Comprovar ausência de acesso cruzado; abrir um ou dois convites reais.
10. Não excluir dados ou tabelas legadas sem backup e autorização separada.

## Rollback
- Manter a versão anterior do frontend disponível antes do corte.
- Reverter deploy **não** remove alterações no banco; mudanças aditivas permanecem sem efeito no app antigo.
- Restore do banco pode apagar treinos incluídos depois do backup: requer autorização explícita.
- Em caso de falha, congelar gravações, identificar intervalo afetado, comparar snapshots e planejar reconciliação.
