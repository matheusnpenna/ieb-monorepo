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

## Preparacao para microservicos

- Definir contratos em `contracts/` para comandos, queries, responses e eventos publicos.
- Separar handlers HTTP em `interfaces/http` de futuros handlers de mensageria em `interfaces/messaging`.
- Publicar eventos de dominio por uma porta de `EventBus`, inicialmente in-process.
- Quando um dominio for extraido, substituir adapters in-process por transporte de mensagens sem alterar use cases.

## Validacao

- Para cada modulo migrado, rodar `pnpm --filter @ieb/web test:server`.
- Rodar `pnpm --filter @ieb/web typecheck` quando a fatia alterar exports, tipos ou imports usados pelos endpoints.
- Nao iniciar a migracao do proximo modulo antes da revisao e aprovacao do modulo atual.
