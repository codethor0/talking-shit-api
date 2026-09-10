# Release Procedure

1. Start from clean, protected `main` and a clean working tree.
2. Run `npm ci --no-fund --no-audit`.
3. Run `npm run verify`.
4. Run `npm audit signatures`.
5. Review dependency, CodeQL, and security findings.
6. Review the diff since the previous release for attack-surface, privacy, permission, binding, logging, and cost changes.
7. Confirm `README.md`, `src/openapi.ts`, `docs/THREAT_MODEL.md`, `docs/security/BASELINE.md`, package version, and service version agree.
8. Require signed release commits, green required checks, and a clean exact release-file boundary.
9. Follow `docs/security/DEPLOYMENT.md`: snapshot the current deployment and exact known-good Worker version ID before creating a candidate.
10. Upload the candidate with `npm run candidate:upload` from the exact reviewed release commit. Candidate upload must not change production traffic.
11. Identify and record the exact candidate Worker version ID from Cloudflare version state.
12. Stage the known-good version at 100% and the candidate at 0%, then confirm the deployment state exactly.
13. Run the full smoke suite against the exact 0% candidate using a Worker version override and an expected service-version assertion.
14. Run the ordinary production smoke suite and prove the known-good version remains healthy before promotion.
15. Cross the human promotion gate only after candidate smoke, production smoke, CI, security audit, and rollback readiness all pass.
16. Promote the exact candidate Worker version to 100% using `wrangler versions deploy` as an explicit operator command.
17. Wait for production version convergence and run the complete smoke suite without a version override.
18. If production verification fails, roll back to the exact recorded known-good Worker version before debugging forward.
19. Verify branch protection, repository cleanliness, release/tag signatures, open PRs, remote branches, code-scanning alerts, and Dependabot absence.
20. Record the final release anchor, Worker version ID, deployment state, and rollback anchor.

The repository intentionally has no direct production `deploy` package script. Candidate upload and production promotion are separate operations. V1 does not store a long-lived Cloudflare deployment credential in GitHub Actions.

While the temporary `sharp` override exists, confirm `npm ls sharp` resolves only `sharp@0.35.4` before release. Do not use `npm audit fix --force` to bypass a dependency-chain advisory.
