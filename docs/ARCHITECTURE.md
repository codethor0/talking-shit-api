# Architecture

## Context

Talking Shit API is a public, anonymous, read-only HTTP API. V1 returns curated developer humor selected from code shipped inside the Worker bundle.

## Deployment

```text
Internet
   |
   v
Cloudflare edge
   |
   +-- native rate-limit binding
   |
   v
single TypeScript Worker
   |
   +-- router
   +-- validator
   +-- deterministic catalog boundary
   +-- cryptographic random selection
   |
   v
JSON response
```

There is no database, queue, object storage, remote model, outbound API, or second service.

## Module responsibilities

- `src/index.ts`: thin Cloudflare entrypoint; exports only the default Worker handler.
- `src/app.ts`: HTTP routing and stable response envelope.
- `src/validation.ts`: query allowlisting and validation.
- `src/engine.ts`: roast selection.
- `src/stats.ts`: catalog statistics derived directly from the bundled catalog.
- `src/random.ts`: unbiased random index generation using Web Crypto.
- `src/content/roasts.ts`: curated static content.
- `src/rate-limit.ts`: transient client-key derivation and platform limiter call.
- `src/http.ts`: response/header construction.
- `src/openapi.ts`: machine-readable API contract.
- `src/types.ts`: shared narrow types and service constants.

## Invariants

1. HTTP behavior remains read-only.
2. Production source imports only local modules.
3. Runtime dependencies remain zero.
4. No source module initiates outbound network access.
5. No arbitrary user-supplied roast target exists in V1.
6. No application secrets exist in V1.
7. Rate limiting is an abuse brake, not authentication or billing.

## Scaling model

The service is stateless. Scaling is delegated to Cloudflare Workers. Because content is bundled and there are no subrequests, normal request cost is bounded and independent of external system health except the platform rate-limit binding.

## Entrypoint boundary

`src/index.ts` is a thin Cloudflare boundary and exports only the default Worker handler. Request routing and application behavior live in `src/app.ts`. Runtime globals are typed exclusively from `worker-configuration.d.ts`, generated from `wrangler.jsonc` by Wrangler.
