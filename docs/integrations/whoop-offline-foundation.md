# WHOOP — fundação técnica desligada

**Estado: estrutura de código preparada, sem integração ativada.** A proprietária não tem WHOOP e pretende contratar futuramente. Não usar conta de familiar ou assinatura adicional; não pedir credenciais de usuário.

## Entregue nesta branch
- `lib/whoop/foundation.ts`: endpoints de configuração, escopos mínimos propostos, verificação **fail-closed** de `WHOOP_ENABLED`, construtor local de autorização, estado aleatório e criptografia autenticada AES-256-GCM de tokens (nunca armazenar plaintext).
- `db/migrations/20261120_whoop_foundation_future.sql`: **migração planejada, não executada**, para conexão por usuário, hashes de estados OAuth de uso único e importação idempotente de métricas por proprietário e identificador externo.
- `tests/whoop-foundation.test.mjs`: contrato offline para assegurar que não surgiram rotas WHOOP públicas, flags ativadas por acidente ou tokens em texto claro.

**Não entregue (intencional):** botões de conexão, rota OAuth de início/callback, troca/renovação/revogação real de tokens, jobs de sincronização, chamadas à WHOOP, consentimento em UI e importação de dados. Sem testes end-to-end ainda.

## Ativação futura — bloqueada
1. Obter dispositivo e assinatura WHOOP e criar Developer App oficial. Registrar URL HTTPS de callback, obter Client ID e Client Secret.
2. Escolher os dados do MVP, consentimento e retenção (saúde = dado sensível sob LGPD). Reavaliar escopos mínimos.
3. Implementar início OAuth **com usuário Ritmo autenticado**, hash de state com prazo e uso único, callback com verificação da **mesma sessão/conta**, e troca de code pelo token, exclusivamente server-side.
4. Armazenar credenciais criptografadas na tabela por `user_id`, nunca em navegador/log. Projetar renovação serializada de refresh token rotativo (WHOOP invalida o anterior).
5. Implementar importação idempotente em lotes paginados, sem transformar dados em PR, conquista ou treino concluído automaticamente.
6. Criar UI de conectar/desconectar, política de exclusão/retirada de consentimento, teste de dois usuários, segurança, e migration de staging antes de produção.

## Variáveis FUTURAS (não configurar agora)
- `WHOOP_ENABLED=false` (não definir true sem homologação).
- `WHOOP_CLIENT_ID` (server-side).
- `WHOOP_CLIENT_SECRET` (server-side; nunca versionar).
- `WHOOP_REDIRECT_URI` (HTTPS exata aprovada no Developer Dashboard).
- `WHOOP_TOKEN_ENCRYPTION_KEY` (32 bytes base64 gerados por CSPRNG, apenas em secret manager).
  
**Aviso:** nenhuma variável foi criada nem atualizada neste trabalho. O código falha fechado quando não está ativado.

## Fontes oficiais (consultadas em 20/11/2026)
- [OAuth 2.0](https://developer.whoop.com/docs/developing/oauth/) — URLs de autorização/token, escopos, estado e renovação rotativa.
- [Overview](https://developer.whoop.com/docs/developing/overview/) — credenciais de app e tokens por usuário.
- [API V2](https://developer.whoop.com/api/) — workouts/cycles/recovery/sleep.
- [Issue #24](https://github.com/marinalomeu/ritmo-treinos/issues/24).

**Publicação:** nunca ligar em produção apenas porque a branch foi criada; entregar no pacote consolidado após avaliação.
