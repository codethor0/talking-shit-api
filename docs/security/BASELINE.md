# Security Baseline

Baseline reviewed against Talking Shit API v0.6.2.

## Runtime capability baseline

The production service must remain one Cloudflare Worker with:

- zero runtime dependencies;
- no database or persistent application storage;
- no authentication or privileged HTTP operations;
- no application secrets;
- no arbitrary user text;
- no outbound runtime `fetch()` calls;
- no Node.js compatibility layer;
- only GET, HEAD, and OPTIONS methods;
- a fixed public route inventory;
- category, level, and count inputs restricted by explicit allowlists and bounds;
- batch count capped at five;
- request URL length capped at 2048 application characters;
- Cloudflare native rate limiting;
- stable non-reflecting error responses;
- Workers invocation logs enabled with 25 percent head sampling;
- Workers traces enabled with 1 percent head sampling;
- no custom application logging or external telemetry destinations;
- request query strings redacted from Workers Logs and traces;
- Worker preview URLs explicitly disabled.

Any change to this list requires human boundary review. A new runtime dependency, secret, persistence mechanism, authenticated operation, arbitrary-text input, or outbound integration also requires an ADR before implementation.

## Privacy baseline

Application code does not store or intentionally log client addresses. The connecting address is read transiently only to derive the rate-limit key.

Workers Logs are enabled in `wrangler.jsonc` with 25 percent head sampling and invocation logs enabled. Workers traces are enabled with 1 percent head sampling. Preview URLs remain disabled so old and candidate Worker versions do not gain extra public routes by default.

Application code must not add custom console logging, telemetry exporters, analytics bindings, or request-identity fields without a new privacy review. Changes to sampling rates, persistence, trace behavior, or preview URLs require human review.

## Repository and supply-chain baseline

The repository must retain:

- `.github/CODEOWNERS` exactly `* @codethor0`;
- no Dependabot configuration;
- no Dependabot-authored or co-authored reachable history;
- exact development dependency versions;
- an exact lockfile;
- `strict-allow-scripts=true`;
- a versioned lifecycle-script allowlist;
- full commit SHA pins for third-party GitHub Actions;
- read-only GitHub Actions permissions;
- no `pull_request_target`;
- signed maintainer commits and signed release tags;
- protected `main`;
- required `verify`, `dependency-review`, and `CodeQL` status checks on protected `main`;
- daily read-only security verification;
- private vulnerability reporting.

## Deployment baseline

The release path must retain:

- no direct production `deploy` package script;
- candidate creation through `wrangler versions upload --config ./wrangler.jsonc` only after an exact-commit clean-tree preflight, full verification, and registry-signature verification;
- exact known-good and candidate Worker version IDs recorded before any traffic change;
- candidate staging at 0% of normal traffic before promotion;
- targeted candidate smoke through a version override while preview URLs remain disabled;
- an expected service-version assertion during version-override smoke;
- explicit human promotion using the exact candidate Worker version ID and reviewed `./wrangler.jsonc`;
- sustained multi-sample public version convergence after production traffic changes;
- a full ordinary production smoke only after sustained convergence passes;
- a final post-smoke stability window that fails on any reappearance of the previous service version;
- exact-ID non-interactive failback readiness before promotion;
- for releases that change non-versioned Cloudflare settings, an exact known-good `wrangler.jsonc` snapshot retained from the signed prior release;
- zero-percent candidate staging performed with the known-good configuration before any new non-versioned settings are synchronized;
- failback that restores both the known-good Worker version and known-good non-versioned settings;
- no long-lived Cloudflare deployment credential in GitHub Actions.

Package scripts must not contain production traffic-shifting `wrangler deploy`, `wrangler versions deploy`, `wrangler rollback`, or `wrangler triggers deploy` commands. Production promotion and rollback remain explicit operator actions.

## Release blockers

Do not release when any of the following is true:

- a required test, policy check, typecheck, build check, dependency policy, or security audit fails;
- a high or critical vulnerability is known and not explicitly adjudicated;
- code scanning reports an unresolved release-blocking alert;
- a public input is unbounded or reflected into an error;
- a new capability lacks its required security review;
- the Worker configuration differs from the documented privacy baseline;
- release or rollback state cannot be identified;
- sustained production convergence, smoke, stability, or semantic checks fail.

## Required proof

Before release:

```text
export EXPECTED_RELEASE_COMMIT="<exact-reviewed-release-commit>"
npm run release:preflight
npm ci --no-fund --no-audit
npm run verify
npm audit signatures
git diff --check
npm run release:preflight
```

The release process must also verify commit signatures, tag signatures, exact PR file boundaries, branch protection, sustained production version convergence, production semantic behavior, final stability sampling, and exact-ID failback readiness.
