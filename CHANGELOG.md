# Changelog

Notable project changes are recorded here. The API follows semantic versioning once a change is released.

## Unreleased

No unreleased changes.

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
