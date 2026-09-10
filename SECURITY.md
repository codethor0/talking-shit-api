# Security Policy

## Supported version

Security fixes target the current release and `main`.

## Reporting

Do not publish exploitable details in a public issue. Before the first public release, maintainers must enable GitHub Private Vulnerability Reporting for this repository. Report vulnerabilities through that channel.

Include the affected endpoint/component, reproduction steps, impact, and any suggested mitigation. Do not access data that is not yours, degrade service availability, or perform destructive testing.

## Release policy

A known high/critical vulnerability or release-blocking security defect blocks release unless maintainers document why the finding is not exploitable in this project and record the decision.

## Temporary development-toolchain override

The development toolchain temporarily overrides transitive `sharp` to exactly `0.35.4`. This is a build/test-only dependency inherited through Cloudflare tooling, not a production Worker dependency. The override exists because `sharp` versions below `0.35.4` are affected by the libheif advisory GHSA-rgj7-g3m4-5g8c. Remove the override only after the pinned stable Cloudflare toolchain resolves `sharp >=0.35.4` without it and the full verification gate remains green.
