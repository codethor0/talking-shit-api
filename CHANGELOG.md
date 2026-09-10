# Changelog

Notable project changes are recorded here. The API follows semantic versioning once a change is released.

## Unreleased

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
