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
2. Manter `server/utils/highlights.ts` como facade temporaria para compatibilidade com testes e chamadas antigas.
3. Migrar endpoints de highlights para controllers do novo modulo.
4. Revisar a implementacao do modulo `highlights` antes de migrar qualquer outro dominio.
5. Depois da aprovacao, repetir o padrao em `logs`, `classrooms`, `assessment-settings`, `assets`, `users` e, por ultimo, dividir `courses.ts`.

## Status da migracao de endpoints

Atualizado em 2026-05-15.

- `apps/web/server/api`: 64/64 endpoints migrados para wrappers finos que importam controllers de `server/modules`.
- Endpoints sem import direto de `server/utils`, `readBody`, `getQuery`, `setResponseStatus` ou `writeAdminLog`.
- Modulos implementados para as areas ja migradas: `auth`, `users`, `assets`, `assessment-settings`, `highlights`, `logs`, `classrooms`, `courses`, `course-modules`, `lessons` e `assessments`.
- A fatia de `courses.ts` foi separada na camada de endpoints em quatro modulos: `courses`, `course-modules`, `lessons` e `assessments`.
- `apps/web/server/modules`: sem imports diretos de `server/utils/*`.
- `server/utils/auth.ts`, `server/utils/firebase-admin.ts` e `server/utils/courses.ts` permanecem apenas como facades temporarias de compatibilidade.
- Os adapters legados de cursos foram substituidos por adapters Firebase nos modulos `courses`, `course-modules`, `lessons` e `assessments`.
- A implementacao compartilhada que ainda concentra comportamento de catalogo, progresso e avaliacoes fica em `modules/shared/infrastructure/course-catalog.ts`; ela deve ser quebrada em repositories/use cases menores nas proximas fatias.

## Proxima etapa recomendada

1. Quebrar `modules/shared/infrastructure/course-catalog.ts` por responsabilidade, criando repositories/projections proprios para `courses`, `course-modules`, `lessons` e `assessments`.
2. Mover validacoes de payload e regras de negocio para `domain`/`application` desses quatro modulos.
3. Remover as facades temporarias em `server/utils/*` quando nao houver testes ou chamadas antigas dependentes delas.
4. Remover imports in-process entre dominios quando houver uma porta publica ou evento equivalente.

## Preparacao para microservicos

- Definir contratos em `contracts/` para comandos, queries, responses e eventos publicos.
- Separar handlers HTTP em `interfaces/http` de futuros handlers de mensageria em `interfaces/messaging`.
- Publicar eventos de dominio por uma porta de `EventBus`, inicialmente in-process.
- Quando um dominio for extraido, substituir adapters in-process por transporte de mensagens sem alterar use cases.

## Validacao

- Para cada modulo migrado, rodar `pnpm --filter @ieb/web test:server`.
- Rodar `pnpm --filter @ieb/web typecheck` quando a fatia alterar exports, tipos ou imports usados pelos endpoints.
- Nao iniciar a migracao do proximo modulo antes da revisao e aprovacao do modulo atual.
