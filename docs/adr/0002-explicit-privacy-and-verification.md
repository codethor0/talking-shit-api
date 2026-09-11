# ADR 0002: Explicit Privacy and Continuous Verification

Status: Partially superseded by ADR 0003 (observability decision only)
Date: 2026-09-10

## Context

Talking Shit API follows privacy by absence. Cloudflare Workers can persist invocation logs through Workers Logs, and preview URLs can expose additional version-specific public routes. Both capabilities are unnecessary for the current V1 service.

Known vulnerabilities can also be disclosed after a release even when the repository is idle. The project intentionally does not use Dependabot for version updates.

## Decision

Set the Worker configuration to:

```json
"preview_urls": false,
"observability": {
  "enabled": false
}
```

Keep `workers_dev` enabled for the current public endpoint.

Add one scheduled GitHub Actions security audit that:

- has read-only repository permission;
- has no secrets;
- does not run on pull requests or pushes;
- installs the exact lockfile;
- runs the full project verification;
- verifies npm registry signatures and provenance;
- fails if verification changes tracked generated files.

Keep dependency updates maintainer-controlled. Do not add Dependabot.

## Consequences

The Worker does not persist request-level Workers Logs and does not expose version preview URLs by default. This reduces data retention and public route inventory.

Forensics has less request-level historical data. That tradeoff is intentional for the current anonymous, stateless service. A future need for persistent observability requires human review and an updated privacy decision.

The scheduled audit detects security drift without granting an automated dependency updater authority to modify the repository.

## References

- https://developers.cloudflare.com/workers/observability/logs/workers-logs/
- https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/
- https://docs.github.com/en/actions/reference/security/secure-use
- https://docs.npmjs.com/cli/v11/commands/npm-audit/
