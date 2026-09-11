# Security Policy

## Supported version

Security fixes target the current release and `main`.

## Reporting

GitHub Private Vulnerability Reporting is enabled for this repository. Report exploitable security issues through the repository Security tab instead of opening a public issue.

Include the affected endpoint or component, reproduction steps, impact, and any suggested mitigation. Do not access data that is not yours, degrade service availability, or perform destructive testing.

Do not publish credentials, tokens, raw client addresses, exploit details, or private vulnerability information in public issues.

Operational security guidance is indexed in `docs/security/README.md`.

## Security research scope

The public Talking Shit API Worker and the public API behavior documented in `openapi.json` are in scope for good-faith, non-destructive research.

Reasonable low-volume testing includes malformed and encoded query parameters, duplicate parameters, boundary values, unsupported methods, CORS behavior, response headers, route handling, and other protocol or validation edge cases.

The following are not authorized:

- denial-of-service, stress, volumetric, or resource-exhaustion testing;
- distributed traffic intended to bypass or exhaust rate limits or the Cloudflare Workers daily request allowance;
- attempts to compromise maintainer GitHub, Cloudflare, Stripe, email, or other accounts;
- social engineering, credential phishing, or token theft;
- testing unrelated Cloudflare, GitHub, Stripe, or third-party infrastructure;
- destructive testing or attempts to access data that is not yours.

Do not intentionally bypass service protections. If your research requires sustained load or a test that could affect availability, coordinate privately before running it.

A good-faith report should contain the smallest reproduction needed to demonstrate impact.

## Release policy

A known high or critical vulnerability or release-blocking security defect blocks release unless maintainers document why the finding is not exploitable in this project and record the decision.

Changes involving dependencies, deployment, permissions, bindings, logging, privacy, public API contracts, compatibility flags, rate limits, or security controls require human boundary review.

## Temporary development-toolchain override

The development toolchain temporarily overrides transitive `sharp` to exactly `0.35.4`. This is a build/test-only dependency inherited through Cloudflare tooling, not a production Worker dependency. The override exists because `sharp` versions below `0.35.4` are affected by the libheif advisory GHSA-rgj7-g3m4-5g8c. Remove the override only after the pinned stable Cloudflare toolchain resolves `sharp >=0.35.4` without it and the full verification gate remains green.
