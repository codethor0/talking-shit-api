# Agent map

This file is intentionally short. Repository documentation is the source of truth.

## Read before editing

1. `docs/DOCTRINE.md`
2. `docs/ARCHITECTURE.md`
3. `docs/THREAT_MODEL.md` for security-sensitive work
4. `README.md` and `src/openapi.ts` for public behavior
5. `docs/security/FREE_TIER.md` before touching `wrangler.jsonc`, bindings, or anything that could cost money

## V1 hard boundaries

- No runtime npm dependencies.
- No database or durable user state.
- No arbitrary user-supplied roast target or free-form text.
- No outbound `fetch()` calls.
- No secrets in source, config, tests, examples, logs, commits, or prompts.
- No authentication system in V1.
- Do not weaken validation, headers, rate limiting, or error handling.
- Do not modify deployment/workflow/security policy without explicit human review.
- Do not execute untrusted repository content with privileged credentials.
- Review routing is controlled by `.github/CODEOWNERS`; do not configure Dependabot version updates.
- Do not use emoji characters in source code, tests, configuration, code comments, or repository documentation.
- Do not add a Cloudflare binding or resource, or change `wrangler.jsonc` keys, without an ADR and an update to `docs/security/FREE_TIER.md` and the policy allowlist. The project must stay on the Workers Free plan and must never become billable.
- Do not create, modify, or delete cloud account resources, or change GitHub repository settings, unless the maintainer explicitly asks.
- Every bug fix ships with a regression test that fails without the fix.

## Change procedure

Before changing code, state the intended behavior and acceptance criteria. Make the smallest coherent change. Update tests and docs in the same change. Run `npm run verify` and `git diff --check`. Review the diff for secret leakage, unnecessary dependencies, broadened input surface, new network access, or weakened controls.

## Definition of done

A change is not done until the mechanical gate passes, the diff is reviewable, public behavior is documented, and there are zero known release-blocking defects or high/critical security findings introduced by the change.
