# Release Procedure

1. Start from clean, protected `main` and a clean working tree.
2. Run `npm ci --no-fund --no-audit`.
3. Run `npm run verify`.
4. Run `npm audit signatures`.
5. Review dependency, CodeQL, and security findings.
6. Review the diff since the previous release for attack-surface, privacy, permission, binding, logging, and cost changes.
7. Confirm `README.md`, `src/openapi.ts`, `docs/THREAT_MODEL.md`, `docs/security/BASELINE.md`, package version, and service version agree.
8. Require signed release commits, green required checks, and a clean exact release-file boundary.
9. Before deployment, record the currently active Cloudflare deployment and last known good Worker version ID as described in `docs/security/ROLLBACK.md`.
10. Deploy manually from a trusted maintainer workstation. V1 does not store a long-lived Cloudflare deployment credential in GitHub Actions.
11. Wait for production version convergence, then run endpoint-specific semantic checks and the full production smoke script.
12. If production verification fails, roll back to the recorded known-good Worker version before debugging forward.
13. Verify branch protection, repository cleanliness, release/tag signatures, open PRs, remote branches, code-scanning alerts, and Dependabot absence.
14. Record the final release anchor and Cloudflare Worker version ID.

The current `npm run deploy` command performs verification and an immediate Wrangler deployment. Decoupling Worker version upload from production promotion is the next deployment-hardening change and must be implemented and reviewed separately rather than silently changing this procedure.

While the temporary `sharp` override exists, confirm `npm ls sharp` resolves only `sharp@0.35.4` before release. Do not use `npm audit fix --force` to bypass a dependency-chain advisory.
