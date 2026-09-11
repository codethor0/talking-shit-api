# Security Knowledge Base

This directory is the operational security knowledge base for Talking Shit API.

The project protects availability, release integrity, repository integrity, maintainer credentials, user privacy, and predictable API behavior. The primary strategy is capability reduction: one read-only Worker, no database, no authentication, no application secrets, no arbitrary user text, no outbound runtime calls, and zero runtime dependencies.

## Documents

- `BASELINE.md` defines the security controls that must remain true.
- `OWASP_API_SECURITY.md` maps the current API to OWASP API Security Top 10 (2023).
- `INCIDENT_RESPONSE.md` defines containment, recovery, and evidence handling.
- `DEPLOYMENT.md` defines candidate upload, zero-percent validation, human promotion, sustained production verification, and the release-publication gate.
- `ROLLBACK.md` defines the Cloudflare rollback procedure.
- `AVAILABILITY.md` documents failure modes, limits, and residual availability risk.
- `CLOUDFLARE.md` defines Cloudflare routing, account-authentication, secret, abuse, and launch-hardening controls.

## Authority

The repository is the source of truth. `docs/DOCTRINE.md` defines engineering invariants. `docs/THREAT_MODEL.md` defines threats and controls. This knowledge base turns those rules into operational procedures.

A mismatch between code, configuration, policy checks, the threat model, or this knowledge base is a defect and blocks release until reconciled.

## Mandatory review triggers

Human security review is required for any change involving runtime dependencies, public routes, input shape, bindings, permissions, logging, observability, preview URLs, secrets, storage, authentication, deployment mechanics, compatibility flags, rate limits, or billing exposure.

## External references

Reviewed against:

- OWASP API Security Top 10 (2023): https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- GitHub Actions secure use: https://docs.github.com/en/actions/reference/security/secure-use
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Workers rate limiting: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Cloudflare Workers versions and deployments: https://developers.cloudflare.com/workers/versions-and-deployments/
- Cloudflare Workers authentication and keychain storage: https://developers.cloudflare.com/workers/wrangler/commands/general/
- npm audit signatures: https://docs.npmjs.com/cli/v11/commands/npm-audit/
