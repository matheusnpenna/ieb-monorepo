# Backend modular monolith plan

## Objetivo

Refatorar o backend para uma arquitetura modular inspirada no NestJS, mantendo o Nuxt/h3 como runtime atual. O sistema continua sendo um monolito neste momento, mas cada dominio deve ficar isolado o suficiente para poder ser extraido como microservico no futuro.

## Principios

- Cada dominio deve ser um modulo autocontido com controllers, use cases, ports, providers, adapters e contratos proprios.
- Endpoints em `apps/web/server/api` devem ser finos e importar apenas controllers do modulo correspondente.
- Regras de negocio devem viver em `domain` e `application`, sem imports de Firebase, h3 ou detalhes de transporte.
- Firebase, Firestore, Firebase Auth e Storage devem ficar somente em `infrastructure`, atras de contratos de comunicacao.
- Comunicacao entre dominios deve acontecer por ports publicas ou eventos, nunca por acesso direto ao repository interno de outro modulo.
- O monolito deve poder usar adapters em memoria/in-process agora e trocar para mensageria no futuro.

## Estrutura alvo

```txt
apps/web/server/modules/
  shared/
  highlights/
    highlights.module.ts
    contracts/
    domain/
    application/
    infrastructure/
    interfaces/
      http/
      messaging/
```

Cada `*.module.ts` funciona como composition root do modulo, inspirado nos modules/providers do NestJS: ele conecta services, ports e adapters, e define a API publica que outros pontos do monolito podem usar.

## Caminho incremental

1. Implementar primeiro o modulo `highlights` como referencia arquitetural.
2. Manter facades temporarias apenas enquanto houver consumidores legados.
3. Migrar endpoints de highlights para controllers do novo modulo.
4. Revisar a implementacao do modulo `highlights` antes de migrar qualquer outro dominio.
5. Depois da aprovacao, repetir o padrao em `logs`, `classrooms`, `assessment-settings`, `assets`, `users` e, por ultimo, dividir `courses.ts`.

## Status da migracao de endpoints

Atualizado em 2026-05-18.

- `apps/web/server/api`: 64/64 endpoints migrados para wrappers finos que importam controllers de `server/modules`.
- Endpoints sem import direto de `server/utils`, `readBody`, `getQuery`, `setResponseStatus` ou `writeAdminLog`.
- Modulos implementados para as areas ja migradas: `auth`, `users`, `assets`, `assessment-settings`, `highlights`, `logs`, `classrooms`, `courses`, `course-modules`, `lessons` e `assessments`.
- A fatia de `courses.ts` foi separada na camada de endpoints em quatro modulos: `courses`, `course-modules`, `lessons` e `assessments`.
- `apps/web/server/modules`: sem imports diretos de `server/utils/*`.
- Nao ha consumidores ativos de facades temporarias em `server/utils` ou `server/[DELETAR]-utils`.
- Os adapters legados de cursos foram substituidos por adapters Firebase nos modulos `courses`, `course-modules`, `lessons` e `assessments`.
- As fatias `courses`, `course-modules`, `lessons` e `assessments` ja possuem implementacoes proprias em:
  - `modules/courses/infrastructure/firebase-courses.repository.ts`
  - `modules/course-modules/infrastructure/firebase-course-modules.repository.ts`
  - `modules/lessons/infrastructure/firebase-lessons.repository.ts`
  - `modules/assessments/infrastructure/firebase-assessments.repository.ts`
- As validacoes/factories administrativas de `courses`, `course-modules`, `lessons` e `assessments` foram movidas para `domain`, incluindo regras de ordenacao basicas dos itens filhos.
- As regras de progresso, disponibilidade de avaliacoes, normalizacao de respostas e correcao de tentativas foram movidas para `domain`.
- `modules/shared/infrastructure/course-catalog.ts` foi removido apos a migracao dos consumidores para repositories/fatias proprias.
- Contrato de parametros equalizado entre backend e admin: campos `courseId`, `moduleId`, `lessonId` e `assessmentId` preservam o ID do documento; campos `courseSlug`, `moduleSlug`, `lessonSlug`, `assessmentSlug` e `slug` sao resolvidos pelo campo `slug`.

## Proxima etapa recomendada

1. Remover imports in-process entre dominios quando houver uma porta publica ou evento equivalente.
2. Revisar se repositories que ainda montam projections de leitura podem ser divididos em query services menores.
3. Adicionar testes unitarios de dominio para validacoes/factories extraidas quando o modulo estabilizar.

## Preparacao para microservicos

- Definir contratos em `contracts/` para comandos, queries, responses e eventos publicos.
- Separar handlers HTTP em `interfaces/http` de futuros handlers de mensageria em `interfaces/messaging`.
- Publicar eventos de dominio por uma porta de `EventBus`, inicialmente in-process.
- Quando um dominio for extraido, substituir adapters in-process por transporte de mensagens sem alterar use cases.

## Validacao

- Para cada modulo migrado, rodar `pnpm --filter @ieb/web test:server`.
- Rodar `pnpm --filter @ieb/web typecheck` quando a fatia alterar exports, tipos ou imports usados pelos endpoints.
- Nao iniciar a migracao do proximo modulo antes da revisao e aprovacao do modulo atual.
