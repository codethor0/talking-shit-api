# ADR 0006: Free-tier operating boundary

Status: Accepted
Date: 2026-09-18

## Context

The project is a public hobby and learning service. The maintainer wants to study how APIs behave in production using Cloudflare's free resources, and must never be charged for it.

Cloudflare documents that the Workers Free plan has no overage billing: an exhausted allowance makes further operations of that type fail. Some other products have a different or unstated Free-plan failure mode. Existing documents already say the design targets Workers Free and refuses paid-only dependencies (`docs/security/OBSERVABILITY.md`, `docs/security/AVAILABILITY.md`), but nothing enforced it, and there was no single place recording each resource's behavior at its limit.

## Decision

1. The project operates on the Workers Free plan only. No plan upgrade, paid add-on, or payment-method-backed product is part of the design.
2. A Cloudflare resource may be adopted only if its current documentation shows it is available on Free and fails, rather than bills, at its limit. Resources with unstated or announced-but-unscheduled billing behavior are excluded until that is documented. Today that excludes Workers Analytics Engine and R2.
3. `docs/security/FREE_TIER.md` is the catalog of resources, allowances, failure modes, and stance. It carries a review date and is updated with any change to `wrangler.jsonc`.
4. `scripts/policy-check.mjs` fails on any top-level `wrangler.jsonc` key outside a reviewed allowlist. A new binding therefore cannot merge without changing the guard and this catalog in the same reviewed pull request.
5. Adopting a new free resource follows the five steps in `docs/security/FREE_TIER.md`. It is a one-way door under DOCTRINE section 18 and needs its own ADR.
6. Study of API behavior uses signals that need no new resource: sampled Workers Logs and traces, `wrangler tail`, response headers, client-side timing, and the local agent lab. See `docs/LEARNING.md`.

## Consequences

Cost exposure is bounded by construction rather than by vigilance. Studying the service costs nothing. Adding a resource takes a deliberate, reviewed change, which is the intended friction.

The catalog goes stale as Cloudflare changes limits. The review date and the re-read instruction are the mitigation, and the guard fails closed when the configuration grows.

## Rollback

Remove the allowlist check from `scripts/policy-check.mjs`, delete `docs/security/FREE_TIER.md`, and mark this ADR superseded. Runtime behavior is unaffected; this ADR adds no runtime capability.
