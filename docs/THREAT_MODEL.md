# Threat Model

## Assets

The project protects availability, release integrity, repository integrity, maintainer credentials, user privacy, and predictable API behavior.

V1 stores no user records and has no application secrets.

## Trust boundaries

1. Public Internet -> Cloudflare edge.
2. Cloudflare edge -> Worker runtime.
3. Contributor pull request -> GitHub Actions.
4. Maintainer workstation -> GitHub / Cloudflare deployment control planes.

## Primary threats and controls

### Denial of service / quota exhaustion

Controls: constant-small request work with batch output hard-capped at five roasts, URL length cap, fixed response catalog, no remote subrequests, one rate-limit bucket per observed client across all public paths, and Cloudflare platform limits.

The rate-limit key deliberately does not include the requested path. A client therefore cannot rotate arbitrary paths to create independent application rate buckets.

Residual risk: Cloudflare Worker rate-limit counters are local to a Cloudflare location, permissive, and eventually consistent. The binding is evaluated after Worker execution begins, so application-level rate limiting does not shield the account-level Workers request allowance. Persistent or distributed abuse can still exhaust the free daily request quota. Shared NAT/proxy clients and some Worker-origin traffic can also aggregate into one application rate-limit identity. The service is non-critical and should fail closed rather than create paid overages.

### Injection

Controls: no command execution, SQL, templates, dynamic imports, filesystem, eval, or free-form content generation; strict allowlists for query keys/values.

The surprise route accepts only the existing category and level allowlists. Any omitted dimension is randomized, so the route adds no free-form input surface.

Residual risk: low in V1 because public input is never used in an execution context.

### SSRF / unsafe upstream consumption

Control: production code performs no outbound `fetch()` and has no upstream integrations.

### Broken authentication / authorization

Control: V1 has no authenticated or privileged operations. There are no write/admin endpoints.

### Information disclosure

Controls: stable generic errors, no stack traces, no rejected-input reflection, no database, no application secrets, no application-level IP logging, persisted Workers Logs explicitly disabled, and Worker preview URLs explicitly disabled.

### Supply-chain compromise

Controls: zero runtime dependencies, exact dev versions, lockfile, `npm ci`, version-pinned install-script approvals with strict enforcement, audit gate, minimal GitHub Actions permissions, immutable action SHAs, dependency review, and a scheduled read-only verification job that also checks registry signatures and provenance.

### CI pull-request attacks

Controls: `pull_request` only; no `pull_request_target`; no deployment secrets in PR workflows; read-only token permissions.

### Abuse as a harassment service

Controls: V1 does not accept real-person names, free-form targets, protected traits, or arbitrary text. Content is curated in repository review.

## Rate-limit privacy note

For an anonymous API, a stable authenticated user identifier is not available. V1 transiently reads Cloudflare's connecting address and hashes it with a fixed API-version namespace before calling the rate-limit binding. The namespace is public and is not a secret salt; the derived value is pseudonymization for the limiter, not cryptographic anonymization. The raw address is not persisted or intentionally logged by application code, and the hash is not returned to clients. Shared NAT/proxy users may share a rate bucket; this is an accepted V1 availability tradeoff. If application logging or exposure of the derived key is ever introduced, this privacy decision must be reviewed again.

## Explicitly out of scope for V1

Accounts, billing, API keys, user-generated content, file upload, email, AI inference, webhooks, databases, analytics profiles, and administrative HTTP operations.
