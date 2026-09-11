# Release Procedure

1. Start from clean, protected `main`, set `EXPECTED_RELEASE_COMMIT` to the exact reviewed signed commit SHA, and pass `npm run release:preflight`.
2. Run `npm ci --no-fund --no-audit`.
3. Run `npm run verify`.
4. Run `npm audit signatures`.
5. Review dependency, CodeQL, and security findings.
6. Review the diff since the previous release for attack-surface, privacy, permission, binding, logging, non-versioned Cloudflare settings, and cost changes.
7. Confirm `README.md`, `CHANGELOG.md`, `src/openapi.ts`, `docs/THREAT_MODEL.md`, `docs/security/BASELINE.md`, package version, and service version agree.
8. Require signed release commits, green required checks, and a clean exact release-file boundary.
9. Follow `docs/security/DEPLOYMENT.md`: snapshot the current deployment, exact known-good Worker version ID, and, when the release changes non-versioned Cloudflare settings, the exact known-good `wrangler.jsonc` from the signed prior release.
10. Upload the candidate with `EXPECTED_RELEASE_COMMIT="<exact-reviewed-release-commit>" npm run candidate:upload` from the exact reviewed release commit. The package script reruns the preflight immediately before upload and explicitly pins `./wrangler.jsonc`. Candidate upload must not change production traffic. Observability and Logpush are non-versioned Worker settings and are not part of the uploaded Worker version.
11. Identify and record the exact candidate Worker version ID from Cloudflare version state.
12. If the release changes non-versioned settings, materialize the prior signed release's exact `wrangler.jsonc` into a temporary `KNOWN_GOOD_CONFIG` and record its source tag and hash. Do not reconstruct the old settings by hand.
13. Stage the known-good Worker at 100 percent and the candidate at 0 percent using `KNOWN_GOOD_CONFIG`, then confirm the deployment state exactly. This preserves the known-good non-versioned settings during candidate code validation.
14. Run the full smoke suite against the exact 0 percent candidate using a Worker version override and an expected service-version assertion.
15. Run the ordinary production smoke suite and prove the known-good Worker remains healthy before changing non-versioned settings or production traffic.
16. If the release changes non-versioned settings, cross a separate human control-plane gate. Reissue the same 100/0 deployment using the reviewed release `./wrangler.jsonc` only to synchronize the reviewed non-versioned settings. Confirm the Worker traffic split remains exactly 100/0.
17. For an observability change, perform the synthetic query-redaction verification in `docs/security/OBSERVABILITY.md`. Success requires at least one sampled Workers Log and at least one sampled trace from the canary window; absence without a sampled record is inconclusive.
18. Cross the human production-promotion gate only after candidate smoke, production smoke, CI, security audit, non-versioned-state verification, redaction verification, and dual-anchor failback readiness all pass.
19. Promote the exact candidate Worker version to 100 percent using `wrangler versions deploy --config ./wrangler.jsonc` as an explicit operator command.
20. After promotion, confirm deployment state is the exact candidate at 100 percent, then require sustained public convergence. Use unique probe URLs or equivalent cache-busting and no-cache request headers. At minimum, require 10 consecutive paired observations where `/v1/health` reports the expected `meta.service_version` and `/openapi.json` reports the expected `info.version`. Reset the streak on any mismatch.
21. Run the complete ordinary production smoke suite without a version override only after sustained convergence passes, then require at least 10 additional health-version samples with no regression to the previous release.
22. Treat any reappearance of the old version as incomplete convergence. Continue only within a bounded verification window; if sustained stability cannot be established or any non-transient production check fails, restore both the exact known-good Worker version and the exact known-good non-versioned configuration before debugging forward.
23. Publish the GitHub release only after sustained convergence, the full production smoke suite, the final stability window, and any required control-plane verification all pass.
24. Verify branch protection, repository cleanliness, release/tag signatures, open PRs, remote branches, code-scanning alerts, private vulnerability reporting, and Dependabot absence.
25. Record the final release anchor, Worker version ID, deployment state, non-versioned configuration state, rollback anchors, production service version, and release URL.

The repository intentionally has no direct production `deploy` package script. Candidate upload, non-versioned control-plane synchronization, and production promotion are separate operations. V1 does not store a long-lived Cloudflare deployment credential in GitHub Actions.

While the temporary `sharp` override exists, confirm `npm ls sharp` resolves only `sharp@0.35.4` before release. Do not use `npm audit fix --force` to bypass a dependency-chain advisory.
