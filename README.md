# ritmo. 💜

Diário pessoal de treino com quatro fichas (A, B, C e D), marcação de séries, registro das cargas e histórico de progressão.

## Tecnologias
- Next.js + React + TypeScript
- Neon Postgres
- Vercel

## Desenvolvimento

```bash
npm install
npm run dev
```

Para utilizar o armazenamento em nuvem, configure `.env.local` com `DATABASE_URL`, `APP_PASSWORD` e `SESSION_SECRET`. **Nunca envie valores reais de variáveis de ambiente ao GitHub.**

As tabelas são definidas em `db/schema.sql`. Em ambientes sem essas variáveis, o aplicativo utiliza armazenamento de demonstração no navegador.

> A publicação de produção é protegida pela autenticação da Vercel e pela senha do aplicativo.
