# Changelog

Notable project changes are recorded here. The API follows semantic versioning once a change is released.

## Unreleased

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
