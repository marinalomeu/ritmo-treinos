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

## Instalar no celular (PWA)

O ritmo. pode ser instalado diretamente do endereço [ritmo-treinos-coral.vercel.app](https://ritmo-treinos-coral.vercel.app), sem publicar nas lojas.

- **iPhone (Safari):** abrir o site → Compartilhar → Adicionar à Tela de Início → Abrir como App (quando disponível) → Adicionar.
- **Android (Chrome):** abrir o site → menu ⋮ → Instalar app (ou Adicionar à tela inicial).

O aplicativo usa o mesmo servidor Vercel, autenticação por senha e histórico armazenado no Neon. **É necessário estar conectado à internet para abrir, autenticar e salvar treinos.** Nenhuma rota autenticada é armazenada em cache offline pela PWA. O ícone está disponível nos formatos 64, 180, 192 e 512 px, com versão maskable.

## Fichas e histórico

- As fichas atuais são armazenadas em `workout_templates`, e podem ser criadas/editadas/excluídas no app.
- Cada sessão guarda uma cópia dos exercícios e suas cargas em `session_sets`: alterações posteriores da ficha **não editam nem apagam os registros históricos**.
- Um exercício retirado da rotina continua disponível na aba Evolução, desde que tenha séries concluídas com carga.
- O modo `/demo` usa exclusivamente dados fictícios no armazenamento do navegador, sem acesso ao Neon.
