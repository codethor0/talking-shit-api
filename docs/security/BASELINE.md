# Security Baseline

Baseline established against Talking Shit API v0.6.0.

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
- persisted Workers Logs explicitly disabled;
- Worker preview URLs explicitly disabled.

Any change to this list requires human boundary review. A new runtime dependency, secret, persistence mechanism, authenticated operation, arbitrary-text input, or outbound integration also requires an ADR before implementation.

## Privacy baseline

Application code does not store or intentionally log client addresses. The connecting address is read transiently only to derive the rate-limit key.

Persisted Workers Logs are disabled in `wrangler.jsonc`. Preview URLs are disabled so old and candidate Worker versions do not gain extra public routes by default.

Do not enable logging, tracing, analytics bindings, or preview URLs as an ad hoc debugging step. Treat those as privacy and attack-surface changes requiring review.

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
- dependency review and CodeQL checks;
- daily read-only security verification;
- private vulnerability reporting.

## Release blockers

Do not release when any of the following is true:

- a required test, policy check, typecheck, build check, dependency policy, or security audit fails;
- a high or critical vulnerability is known and not explicitly adjudicated;
- code scanning reports an unresolved release-blocking alert;
- a public input is unbounded or reflected into an error;
- a new capability lacks its required security review;
- the Worker configuration differs from the documented privacy baseline;
- release or rollback state cannot be identified;
- production smoke or semantic checks fail.

## Required proof

Before release:

```text
npm ci --no-fund --no-audit
npm run verify
npm audit signatures
git diff --check
```

The release process must also verify commit signatures, tag signatures, exact PR file boundaries, branch protection, production version convergence, production semantic behavior, and rollback readiness.
