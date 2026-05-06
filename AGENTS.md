# AGENTS.md

## Objetivo

Este arquivo define as regras de trabalho para agentes que atuarem neste monorepo. Ele complementa `CODEX.md`, `COURSES.md` e a documentação local de `apps/web`.

O objetivo principal e reduzir retrabalho, evitar regressões de stack e manter consistencia entre frontend, backend e infraestrutura do projeto.

## Snapshot do projeto

- Monorepo gerenciado com `pnpm`.
- Versao de Node esperada: `20` conforme `.nvmrc`.
- App principal: `apps/web`.
- Stack principal do app:
  - `Nuxt 4`
  - `Vue 3`
  - `TypeScript`
  - `Tailwind CSS`
  - `Firebase` no servidor
  - `h3@1.15.11`
- Tipos compartilhados e contratos de dominio ficam em `packages/shared/src`.

## Regras operacionais

- Sempre iniciar o trabalho assumindo `Node 20`.
- Preferir comandos via workspace:
  - `pnpm --filter @ieb/web dev`
  - `pnpm --filter @ieb/web build`
  - `pnpm --filter @ieb/web typecheck`
  - `pnpm --filter @ieb/web postinstall`
- Nao editar arquivos gerados em `.nuxt` manualmente.
- Depois de alterar `package.json`, `nuxt.config.ts` ou dependencias de runtime, rodar `pnpm install` e `pnpm --filter @ieb/web postinstall`.
- Ao investigar bugs de ambiente, sempre confirmar a versao ativa do Node antes de concluir que o problema e de codigo.

## Convencoes do Nuxt

- O app Nuxt vive em `apps/web`.
- O projeto roda como SPA no momento: `ssr: false`.
- Se componentes, composables ou testes do app importarem diretamente de `vue`, o pacote `vue` deve permanecer declarado explicitamente em `apps/web/package.json`.
- Segredos e variaveis de ambiente devem ficar em `runtimeConfig`.
- Valores publicos devem ficar em `runtimeConfig.public`.
- Ao usar variaveis de ambiente para sobrescrever `runtimeConfig`, seguir a nomenclatura do Nuxt para chaves aninhadas.
  - Exemplo: `runtimeConfig.firebase.apiKey` corresponde a `NUXT_FIREBASE_API_KEY`.
- Ao mexer com `.env`, lembrar que este e um monorepo.
  - Confirmar de qual pasta o processo esta sendo executado.
  - Confirmar qual arquivo `.env` o app realmente esta lendo antes de diagnosticar falha de `runtimeConfig`.

## Componentes UI

- Os arquivos em `apps/web/app/components/ui/*.vue` sao componentes customizados do projeto.
- Nao tratar essa pasta como estrutura do `shadcn-nuxt`.
- Nao apontar `shadcn-nuxt` para `app/components/ui`.
- Nao assumir convencao de subpasta com `index.ts` ou `index.js` para esses componentes.
- O registro desses componentes deve seguir o fluxo normal do Nuxt para componentes Vue.
- Mesmo com auto-import do Nuxt, nao assumir que componentes customizados serao resolvidos automaticamente.
- Sempre importar explicitamente em `<script setup>` qualquer componente customizado utilizado, incluindo componentes de `app/components/ui`, `app/components/base`, shells compartilhados e outros componentes locais do projeto.
- Esta regra vale mesmo quando o componente ja parecer funcionar por auto-import.
- Componentes nativos do Nuxt, como `NuxtLink`, `NuxtPage`, `NuxtLayout` e similares, nao precisam de import explicito.

## Design system

- Seguir obrigatoriamente `apps/web/DESIGN_SYSTEM.md`.
- A linguagem visual atual e dark cinematografica com acento vermelho inspirada na NETFLIX.
- Reutilizar primeiro:
  - `UiPanel`
  - `UiButton`
  - `UiField`
  - `UiInput`
  - `UiSelect`
  - `UiTextarea`
- Evitar criar HTML cru quando ja existir componente equivalente.
- Antes de criar nova variacao visual, verificar se ela pode ser absorvida por um componente existente.
- Sempre que criar algo novo no design system, isto deve ser documentado obrigatoriamente em `apps/web/DESIGN_SYSTEM.md`

## Backend, auth e seguranca

- Firebase deve ser usado no servidor, nunca diretamente no frontend para auth ou acesso principal a dados.
- Fluxos de autenticacao devem usar cookies `HttpOnly`.
- Nao salvar token de auth no `localStorage`.
- Nunca expor credenciais privadas do Firebase em codigo cliente, logs ou respostas HTTP.
- Em operacoes de exclusao, preservar a estrategia de soft delete do projeto.
- Acoes administrativas relevantes devem continuar registrando rastreabilidade.

## Regra critica sobre h3

- Este projeto deve permanecer alinhado com `h3@1.15.11`.
- Nao atualizar `h3` isoladamente para `2.x` sem atualizar o stack inteiro do Nuxt/Nitro e validar compatibilidade real.
- Ao escrever handlers e utilitarios do servidor:
  - usar `createError`
  - usar `getCookie`, `setCookie`, `deleteCookie`, `readBody`, `getQuery`, `defineEventHandler`
- Evitar APIs ou suposicoes do `h3@2`, como:
  - `HTTPError`
  - acesso via `event.req.headers.get(...)`
- No runtime atual, varios helpers ainda operam com a estrutura baseada em `event.node.req`.

## Tipos e contratos

- Antes de criar tipos novos, verificar `packages/shared/src`.
- Se um ajuste afeta dominio, auth, Firestore ou payloads de API, atualizar os tipos compartilhados junto com o consumo.
- Evitar duplicar interfaces entre `apps/web` e `packages/shared`.

## Estrutura de testes

- Todo teste deve viver dentro do app ou pacote ao qual ele pertence.
- Para o app web, usar obrigatoriamente `apps/web/tests`.
- Nao criar testes do `apps/web` na raiz do monorepo em `tests/`.
- Organizacao padrao do app web:
  - `apps/web/tests/server`: testes de handlers, endpoints e utilitarios de backend
  - `apps/web/tests/nuxt`: testes que dependem do runtime do Nuxt
  - `apps/web/tests/e2e`: testes end-to-end com Playwright
- Ao criar um novo app no monorepo, repetir o mesmo padrao: testes dentro do proprio app.
- Ao configurar comandos de teste, preferir scripts no `package.json` do proprio app e usar a raiz apenas como proxy para esses scripts.
- Para testes componentes frontend em qualquer app do monorepo, os testes devem ser co-localizados com o componente.
- Padrao de nomenclatura obrigatorio:
  - `UiButton.vue` -> `UiButton.test.ts`
  - `UiInput.vue` -> `UiInput.test.ts`
- No `apps/web`, testes de componente Vue devem usar `Vitest` no projeto `components`.
- Para componentes de UI simples, preferir `mount` de `@vue/test-utils` em ambiente `happy-dom`.
- Quando um componente depender de `NuxtLink` ou outro componente global do Nuxt, stubar explicitamente o componente no proprio teste ao inves de acoplar a spec inteira ao runtime `nuxt`.
- Testes e2e do `apps/web` devem usar Playwright.
- Padrao de nomenclatura obrigatorio para e2e:
  - `[proposito_do_teste].e2e.test.ts`
  - Exemplo: `auth.e2e.test.ts`
- Fluxos e2e que dependem de autenticacao externa ou Firebase devem preferir `page.route(...)` para mockar as respostas HTTP quando o objetivo do teste for validar o comportamento do frontend e da navegacao.
- Nao criar testes de componente Vue dentro de `apps/web/tests/server`.
- Nao criar uma pasta centralizada para testes de componentes quando o teste puder ficar ao lado do proprio `.vue`.

## Validacao minima

- Para alteracoes pequenas, validar pelo menos com `typecheck` quando possivel.
- Para alteracoes de config ou dependencias, validar tambem com `postinstall` para regenerar artefatos do Nuxt.
- Para alteracoes em testes do app web, validar com `pnpm --filter @ieb/web test:server` ou `pnpm --filter @ieb/web test`.
- Para alteracoes em testes e2e do app web, validar com `pnpm --filter @ieb/web test:e2e` quando as dependencias do Playwright e os browsers estiverem instalados.
- Para alteracoes que tocam auth, cookies, `runtimeConfig` ou Firebase, revisar tambem:
  - `apps/web/server/utils/auth.ts`
  - `apps/web/server/utils/firebase-admin.ts`
  - `apps/web/nuxt.config.ts`

## O que evitar

- Nao reintroduzir `shadcn-nuxt` para resolver componentes da pasta `ui`.
- Nao misturar APIs de `h3` de majors diferentes.
- Nao deixar `console.log` de debug no codigo final.
- Nao criar componentes duplicados quando ja houver uma primitiva oficial do projeto.
- Nao mover regras de dominio para o frontend se elas pertencem ao servidor.
- Nao editar arquivos gerados para “corrigir” sintomas.

## Referencias internas

- `CODEX.md`: contexto macro e objetivos do produto.
- `COURSES.md`: conteudo e descricoes de cursos.
- `apps/web/DESIGN_SYSTEM.md`: direcao visual e uso dos componentes.
