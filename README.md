# Instituto Eurico Bergsten

Plataforma de aprendizagem do Instituto Eurico Bergsten, construida como uma area de membros inspirada na experiencia de navegacao de plataformas de streaming e acompanhada de um painel administrativo para gestao de conteudo.

O projeto foi pensado para uso real em producao, com autenticacao segura, backend dentro do servidor do Nuxt, integracao com Firebase e uma base compartilhada de tipos para manter consistencia entre frontend e servidor.

## O que este projeto faz

- Entrega um site institucional na raiz `/`.
- Disponibiliza fluxo de autenticacao com login, cadastro e recuperacao de senha.
- Mantem uma area de conteudo para alunos com cursos, modulos e aulas.
- Mantem um painel administrativo para gerenciar cursos, modulos, aulas, avaliacoes, destaques, turmas, usuarios e logs.
- Usa Firebase no servidor para autenticacao e persistencia de dados.
- Usa cookies `HttpOnly` para sessao, sem armazenar token sensivel no frontend.

## Stack principal

- `Nuxt 4`
- `Vue 3`
- `TypeScript`
- `Tailwind CSS`
- `Firebase`
- `firebase-admin`
- `h3@1.15.11`
- `pnpm` workspace

## Estrutura do monorepo

```text
.
├── apps/
│   └── web/                  # Aplicacao Nuxt principal
├── packages/
│   └── shared/               # Tipos e contratos compartilhados
├── AGENTS.md                 # Regras para agentes e automacoes
├── CODEX.md                  # Contexto macro do produto
├── COURSES.md                # Informacoes de cursos
├── PROMPT.md                 # Historico de entregas e tarefas
└── .env.example              # Exemplo de variaveis de ambiente
```

## Arquitetura em alto nivel

### Frontend

O frontend fica em `apps/web` e hoje roda como SPA. As paginas vivem em `apps/web/app/pages` e seguem a estrutura padrao do Nuxt.

Rotas ja presentes no projeto:

- `/`
- `/login`
- `/cadastro`
- `/recurperar-senha`
- `/home`
- `/curso/[courseSlug]`
- `/admin`

### Backend

O backend fica no proprio servidor do Nuxt, dentro de `apps/web/server`.

Pontos importantes:

- `apps/web/server/utils/auth.ts`: fluxo de autenticacao, sessao e cookies
- `apps/web/server/utils/firebase-admin.ts`: inicializacao do Firebase Admin e acesso ao Firestore
- `apps/web/server/middleware/auth-context.ts`: middleware de contexto de autenticacao

### Tipos compartilhados

Os contratos de dominio ficam em `packages/shared/src` e sao consumidos tanto no frontend quanto no backend.

Antes de criar tipos novos, o ideal e verificar se eles devem morar em `@ieb/shared`.

## Regras de arquitetura

- Firebase deve ser acessado pelo servidor, nao diretamente pelo frontend para auth ou dados principais.
- Tokens de autenticacao nao devem ir para `localStorage`.
- A sessao deve continuar baseada em cookies `HttpOnly`.
- O projeto esta alinhado com `h3@1.15.11`.
- Nao atualizar `h3` isoladamente para `2.x` sem revisar compatibilidade completa com Nuxt/Nitro.
- Os componentes em `apps/web/app/components/ui/*.vue` sao componentes customizados do projeto.
- Nao usar `shadcn-nuxt` para resolver a pasta `app/components/ui`.

## Design system

O projeto segue uma linguagem visual dark cinematografica, com forte inspiracao em plataformas de streaming e acento vermelho.

Documento de referencia:

- [apps/web/DESIGN_SYSTEM.md](./apps/web/DESIGN_SYSTEM.md)

Componentes base mais importantes:

- `UiPanel`
- `UiButton`
- `UiField`
- `UiInput`
- `UiSelect`
- `UiTextarea`

## Como rodar localmente

### Requisitos

- `Node 20`
- `pnpm 10`

O repositorio ja traz `.nvmrc` com a versao esperada:

```bash
nvm use
```

### Instalacao

```bash
pnpm install
```

### Variaveis de ambiente

Use o arquivo de exemplo como base:

```bash
cp .env.example apps/web/.env
```

Preencha no arquivo `apps/web/.env` os valores do Firebase e da sessao.

Variaveis principais:

- `NUXT_FIREBASE_PROJECT_ID`
- `NUXT_FIREBASE_CLIENT_EMAIL`
- `NUXT_FIREBASE_PRIVATE_KEY`
- `NUXT_FIREBASE_STORAGE_BUCKET`
- `NUXT_FIREBASE_DATABASE_URL`
- `NUXT_FIREBASE_API_KEY`
- `NUXT_FIREBASE_AUTH_DOMAIN`
- `NUXT_SESSION_COOKIE_NAME`
- `NUXT_SESSION_COOKIE_MAX_AGE`

Observacoes:

- A chave privada do Firebase deve manter o formato com `\n`.
- Se houver problema com `runtimeConfig`, confirme primeiro qual arquivo `.env` esta sendo lido no processo atual.

### Desenvolvimento

Na raiz do monorepo:

```bash
pnpm dev
```

### Typecheck

```bash
pnpm typecheck
```

### Build

```bash
pnpm build
```

### Preview

```bash
pnpm preview
```

## Scripts principais

Scripts disponiveis na raiz:

- `pnpm dev`
- `pnpm build`
- `pnpm preview`
- `pnpm typecheck`
- `pnpm prepare`

## Fluxo de autenticacao

O fluxo atual usa o Firebase Identity Toolkit para login e criacao de conta, enquanto o servidor do Nuxt cria e valida cookies de sessao usando `firebase-admin`.

Resumo:

1. O frontend envia credenciais para endpoints do servidor.
2. O servidor autentica no Firebase.
3. O servidor cria um cookie de sessao `HttpOnly`.
4. As paginas protegidas passam a depender do contexto autenticado no servidor.

## Convencoes para contribuicao

- Nao editar arquivos gerados em `.nuxt`.
- Ao alterar dependencias ou configuracoes do Nuxt, rode tambem:

```bash
pnpm prepare
```

- Antes de criar tipos duplicados, verificar `packages/shared/src`.
- Antes de criar novos componentes visuais, verificar `apps/web/app/components/ui`.
- Ao tocar em auth, revisar:
  - `apps/web/server/utils/auth.ts`
  - `apps/web/server/utils/firebase-admin.ts`
  - `apps/web/nuxt.config.ts`

## Documentacao complementar

- [AGENTS.md](./AGENTS.md)
- [CODEX.md](./CODEX.md)
- [PROMPT.md](./PROMPT.md)
- [COURSES.md](./COURSES.md)
