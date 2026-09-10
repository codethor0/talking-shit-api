# Engineering Doctrine

## Mission

Build the smallest system that completely satisfies the requirement, then make correctness mechanical.

The project is designed for a tiny maintainer team. Operational simplicity is a security feature.

## 1. Complexity must earn its existence

Every dependency, service, endpoint, permission, datastore, background job, and abstraction creates maintenance and attack surface. Add one only when a concrete requirement cannot be met cleanly without it.

## 2. Secure defaults are architecture, not cleanup

Security requirements are defined before implementation. The V1 boundary intentionally removes credentials, persistence, arbitrary input, remote fetches, and server-side plugin execution.

This follows the spirit of NIST SP 800-218 SSDF: integrate secure development practices into the normal lifecycle rather than bolt them on after release.

## 3. Treat every public byte as adversarial

Allowlist methods, paths, query keys, and values. Bound URL size. Do not reflect invalid user input into error messages. Never execute, interpolate into commands, or dynamically import public input.

## 4. Bound resource consumption

Public APIs are abuse targets. Keep computation constant and small. Rate-limit requests. Avoid user-controlled loops, fan-out, object sizes, and remote calls. V1 performs no subrequests.

This directly addresses OWASP API Security API4:2023, Unrestricted Resource Consumption.

## 5. Least capability beats defensive configuration

If V1 does not need a capability, it does not receive it. No Node compatibility, database, filesystem, outbound fetch, secrets, write endpoints, admin endpoints, or background workers.

## 6. Production dependencies default to zero

The Worker uses Web Platform / Workers runtime APIs only. A new production package requires a written architecture decision explaining why the standard runtime is insufficient.

Development tools are exact-pinned and captured in `package-lock.json`.

## 7. Reproducibility is part of correctness

Use exact dependency versions, `npm ci` in CI, immutable GitHub Action SHAs, a committed lockfile, an explicit compatibility date, and a version-pinned `allowScripts` policy. `strict-allow-scripts=true` is mandatory: an unreviewed dependency lifecycle script is a build failure.

## 8. Tests run where the code runs

Primary HTTP tests execute in Cloudflare's Workers runtime through `@cloudflare/vitest-plugin`. Pure functions are property-tested where useful. Tests cover success, invalid inputs, rate-limit failure, unsupported methods, CORS, security headers, and the API contract.

## 9. No known-defect releases

"Zero bugs" cannot be guaranteed honestly. The enforceable standard is: no known release-blocking defects, all gates green, and no unresolved high-severity security finding.

## 10. Make invalid states hard to express

Use strict TypeScript, narrow union types, readonly catalogs, exhaustive allowlists, stable response envelopes, and centralized validation.

## 11. Errors reveal behavior, not internals

Public errors have stable codes and short messages. Do not return stack traces, platform details, raw exceptions, secrets, IP addresses, or rejected input.

## 12. Privacy by absence

Do not collect what we do not need. V1 stores no user data. A client address may be read transiently to derive a one-way rate-limit key; application code does not persist or log it.

## 13. CI is hostile infrastructure

Treat pull requests as untrusted input. Workflows use minimal permissions, no contributor-accessible secrets, no `pull_request_target` execution, and full-SHA-pinned actions.

## 14. Agents are contributors, not authorities

AI agents may implement and review changes, but they do not redefine architecture or security invariants on their own. They must inspect authoritative project documents, make the smallest patch, run gates, and report uncertainty.

An agent must never:

- delete or weaken tests to get green CI;
- silently add dependencies or services;
- increase permissions without need;
- disable security checks;
- suppress findings without rationale;
- bypass review/release gates;
- hide a failed command.

## 15. Human review focuses on boundaries

Human review is mandatory for changes involving dependencies, deployment, permissions, compatibility flags, bindings, security controls, public API contracts, logging, privacy, or contribution policy.

## 16. The repository is the source of truth

Architecture, threat model, API behavior, commands, release rules, and agent rules belong in version control. Chat transcripts and agent memory are not authoritative project state.

## 17. Optimize for deletion

Prefer code that can be removed cleanly. Avoid speculative abstractions. Dead code is removed, not preserved "just in case."

## 18. One-way doors require explicit decisions

Before adding persistent storage, authentication, arbitrary user text, an AI provider, email integration, analytics, or third-party runtime APIs, write an ADR describing the requirement, threat changes, privacy impact, cost ceiling, failure mode, and rollback path.

## 19. Content and platform safety are separate concerns

The service may be profane, dark, or offensive in an engineering-comedy sense. The platform must not become an anonymous targeted-harassment primitive. V1 therefore accepts categories and intensity only, not people or free-form targets.

## 20. Release gate

A release candidate requires:

```text
policy check
formatter/linter
Workers type generation
strict TypeScript
runtime + property tests
Wrangler dry-run build
npm security audit
clean git diff check
human boundary review
```

## Reference baseline

- NIST SP 800-218, Secure Software Development Framework (SSDF)
- OWASP API Security Top 10 (2023)
- GitHub Actions Secure Use Reference
- Cloudflare Workers TypeScript and Vitest documentation
- OpenSSF supply-chain guidance and Scorecard concepts

## TypeScript runtime authority

`wrangler types` is the only source of Worker runtime globals for production application compilation. Do not add TypeScript `WebWorker` libraries beside `worker-configuration.d.ts`; doing so creates two competing declarations for the same runtime. Keep `skipLibCheck` disabled. Authored TypeScript unit tests use a separate standard Web API type environment so third-party test-runner declarations cannot redefine production Worker globals. A JavaScript runtime-boundary test executes the real default Worker entrypoint inside workerd through `cloudflare:workers`. The production module `src/index.ts` exposes only the default Worker entrypoint; internal helpers live in non-entrypoint modules.
