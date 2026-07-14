# RPG Aurores — Web (nova stack)

Reescrita incremental do sistema de fichas em **React + Vite + TypeScript**, migrando o site legado
(`rpg-aurores/`, JS vanilla sem build) página por página. Enquanto a migração não termina, este projeto
convive lado a lado com o legado — nada aqui é publicado ainda.

Ver o plano completo de migração no histórico de conversa / documentação do projeto.

## Setup

```bash
cd web
npm install
cp .env.example .env.local   # preencha com as credenciais do seu projeto Firebase
npm run dev
```

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Typecheck + build de produção (`dist/`) |
| `npm run lint` | Lint com oxlint |
| `npm run format` / `format:check` | Formata (ou verifica) com Prettier |
| `npm run typecheck` | Só o typecheck, sem build |
| `npm run test` / `test:run` | Vitest (watch / single run) |

## Estrutura

```
src/
  services/     # firebase.ts, auth.ts — camada de dados, tipada, sem UI
  types/        # tipos de domínio compartilhados (Ficha, Campanha, ...)
  test/         # setup do Vitest
```

`components/`, `pages/`, `state/` e `lib/` (lógica pura como cálculo de dado/dano) são adicionados
conforme cada página do site legado é migrada.

## Firebase

Usa o SDK modular (`firebase` v9+ via npm), não o `firebase-*-compat` do legado. Credenciais entram via
variáveis de ambiente `VITE_FIREBASE_*` (ver `.env.example`), nunca hardcoded — em CI elas vêm dos mesmos
GitHub Secrets já usados pelo `deploy.yml` do legado.
