# Changelog

Notable project changes are recorded here. The API follows semantic versioning once a change is released.

## 0.8.0 - 2026-09-18

Client-visible changes:

- Reject query strings on every parameterless route (`/`, `/v1/health`, `/v1/categories`, `/v1/stats`, `/openapi.json`) with `400 INVALID_REQUEST`, matching what `/v1/stats` already did, so a client that sends a parameter a route ignores is told instead of silently succeeding. Clients that append cache-busting or tracking parameters to these routes must stop doing so. An empty `?` and `OPTIONS` preflights are still accepted.
- Make validation errors self-correcting by naming the allowed categories, levels, query parameters, and batch count bounds. The error `code` is unchanged, but the message text is longer, so a client that matches an exact old message string must update. Messages are built only from static allowlists and still never reflect rejected input.
- Make the OpenAPI contract tool-ready: stable `operationId` values, operation and parameter descriptions, JSON Schema response bodies for every success and error envelope, a documented `400` on the parameterless routes, and the `Retry-After` header documented on every 429. A dependency-free structural schema test verifies live handler output against the published schemas.
- Expose `Retry-After` to cross-origin browser clients with `Access-Control-Expose-Headers`, so a web app can read the 60-second back-off on a 429.

Tooling and guardrails:

- Add a local, never-deployed agent lab (`lab/`, ADR 0005) that converts the OpenAPI contract into Claude tools and traces every model tool call, HTTP request, and recovery step. It returns transport failures to the model as tool errors, fails clearly on an unreachable API, an invalid `--tool-choice`, a non-JSON or operation-less contract, and a malformed `--max-turns`, writes its trace even when a run fails, and refuses a hostile target by accepting only plain absolute OpenAPI paths and never sending a request outside the configured base URL.
- Enforce the free-tier boundary mechanically (ADR 0006, `docs/security/FREE_TIER.md`): the policy check fails on any top-level `wrangler.jsonc` key outside a reviewed allowlist, with regression fixtures for KV, D1, R2, AI, queues, Durable Objects, and other bindings.
- Fail the policy check on stale documentation: a backticked repository path that does not exist, a relative Markdown link to a missing file, or a README anchor (Markdown or HTML) with no matching heading. The changelog is exempt as a historical record.
- Keep `scripts/smoke.sh` runnable against the known-good production Worker by not asserting new-version-only behavior; query rejection stays covered by the test suite.
- Lint and format `lab/` with the rest of the repository.
- Fix the release convergence procedure so it no longer tells operators to make probes unique with a query string, which the parameterless routes now reject with `400`: probes use a fresh request with a unique `X-Probe-Id` header instead. Clarify that the redaction canary should target `/v1/roast`, and fail the policy check if an operational document puts a query string on a parameterless route.

Tests and documentation:

- Add a repeatable read-only account audit to `docs/security/FREE_TIER.md` that verifies the account holds only the Worker and its rate-limit binding, with the results from production v0.7.0.
- Add HTTP invariant property tests that assert bounded statuses, security headers, valid envelopes, no reflection of any request input, HEAD parity with GET, and fail-closed rate limiting across generated requests, plus full category and level coverage over HTTP.
- Extend `docs/DOCTRINE.md` with sections 21 to 24 (cost is a security property, the contract is the product, learning tools stay outside the production boundary, plain current documentation), tighten the testing, privacy, and agent rules, and bring the release gate list in line with `npm run verify`.
- Improve the repository page: a docs index (`docs/README.md`), a guide to studying an API call end to end with free tools (`docs/LEARNING.md`), a roast submission issue form, security and docs contact links, a social preview image, and README badges, navigation, and cost section. Document the `lab/` boundary and the request-boundary invariant in `docs/ARCHITECTURE.md`.

Housekeeping:

- Serialize the static OpenAPI document once instead of per request, share one URL length constant between routing and validation, remove the test-only `selectSurpriseRoast` helper, remove the unreferenced `scripts/bootstrap-local.sh` scaffold, and renumber the bounded observability ADR to 0004 to resolve a duplicate ADR number.

## 0.7.0 - 2026-09-13

- Enable bounded Cloudflare-native Workers invocation logs at 25 percent head sampling and traces at 1 percent head sampling, with request query-string redaction and no custom application request logging.
- Treat observability as non-versioned Cloudflare service state with independent live control-plane drift checks, a separate human settings gate, zero-percent candidate staging, and dual-anchor failback for Worker version plus configuration.
- Require synthetic query-redaction verification using exact Cloudflare Ray ID plus a narrow timestamp window across persisted Workers Logs and persisted root traces; absence without sampled evidence remains inconclusive.
- Keep preview URLs disabled and preserve zero runtime dependencies, zero application secrets, zero outbound runtime calls, and no external telemetry destinations, paid Workers Logpush, Tail Worker consumers, Smart Placement, or Analytics Engine observability dependency.
- Refresh the landing page and operational documentation for the current v0.6.2 production state, generic release examples, and exact Wrangler configuration pinning.

## 0.6.2 - 2026-09-10

- Harden release provenance with an exact signed-main clean-tree preflight, explicit Wrangler configuration pinning, and a guard against local config redirection.
- Strengthen policy enforcement for outbound fetch aliases and package/service version drift, and add runtime-to-OpenAPI preflight consistency coverage.
- Reject non-canonical batch count encodings such as trailing line terminators while preserving the existing one-to-five bound.
- Clarify that the in-Worker rate limiter does not shield the Cloudflare plan-level request allowance and that the IP-hash namespace is intentionally public rather than secret.

- Hardened post-release deployment documentation to require sustained version convergence, repeated production stability checks, and exact-ID non-interactive failback for scripted recovery.
- Polished the repository landing page with an embedded terminal demo, GitHub Sponsors funding metadata, researcher testing boundaries, and a Cloudflare-specific launch security checklist.

## 0.6.1 - 2026-09-10

- Decoupled Worker candidate upload from production promotion, added zero-percent candidate smoke testing through version overrides, and blocked direct production deployment from package scripts.
- Hardened privacy and supply-chain verification with explicit no-log/no-preview Worker configuration, stricter repository policy, a security operations knowledge base, and a read-only scheduled security audit.
- Expanded adversarial HTTP boundary coverage for URL limits, encoded duplicate and unknown query keys, Unicode confusables, oversized batch counts, method rejection, bodyless HEAD errors, error security headers, and credential-free wildcard CORS behavior.

## 0.6.0 - 2026-09-10

- Standardized the Talking Shit API brand, project descriptions, contributor intake, support guidance, repository badges, and mechanical naming policy without changing the runtime API contract.
- Added optional allowlisted category and level constraints to `GET /v1/surprise` while keeping omitted dimensions cryptographically randomized.

## 0.5.0 - 2026-09-10

- Synchronized README and architecture documentation with the v0.4.0 contract and added a policy guard against category and level documentation drift.
- Added a bounded `GET /v1/batch` contract for one to five unique roasts from a selected category and intensity.

## 0.4.0 - 2026-09-10

- Added `git` and `oncall` as first-class developer-humor categories.
- Expanded the curated catalog from 216 to 288 unique responses while preserving per-bucket quality gates.
- Added `GET /v1/stats` with catalog totals derived directly from the source catalog.
- Added stats route, HEAD, query-rejection, smoke, and OpenAPI contract coverage.
- Hardened the OpenAPI path-set assertion so fixture insertion order cannot create false failures.
- Preserved zero runtime dependencies, no database, no authentication, no application secrets, and no outbound production calls.

## 0.3.0 - 2026-09-10

- Added `GET /v1/surprise` for cryptographically selected category, intensity, and curated roast.
- Hardened the random index rejection sampler with deterministic boundary and bias-resistance tests.
- Added property-based validation fuzzing for hostile category, level, query-key, and query-value inputs.
- Expanded the curated developer-humor catalog from 144 to 216 unique entries.
- Preserved zero runtime dependencies, no database, no authentication, no application secrets, and no outbound production calls.

## 0.2.0 - 2026-09-10

- Hardened rate limiting so one client cannot rotate paths to create independent application buckets.
- Aligned HEAD, OPTIONS, error handling, smoke tests, and OpenAPI with the actual public HTTP contract.
- Hardened GitHub Actions, dependency review, workflow permissions, dependency policy, and production capability checks.
- Added deterministic line-ending policy and clearer contributor and project documentation.
- Expanded the curated developer-humor catalog from 72 to 144 unique entries.


## 0.1.0 - 2026-09-10

Initial production release.

- One Cloudflare Worker.
- Zero runtime dependencies.
- Curated developer-humor catalog with category and level filters.
- Health, category, roast, and OpenAPI endpoints.
- Native Cloudflare rate limiting.
- Strict input validation, security headers, CORS, and URL length limits.
- Signed release tag and protected `main` branch.
