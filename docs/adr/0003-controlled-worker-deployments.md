# ADR 0003: Controlled Worker Deployments

Status: Accepted
Date: 2026-09-10

## Context

The historical `npm run deploy` command ran the project verification and then invoked `wrangler deploy`.

Cloudflare documents `wrangler deploy` as a coupled operation: it creates a new Worker version and immediately deploys it to production traffic. The repository now has stronger release and rollback requirements, so this coupling is no longer acceptable.

Preview URLs are intentionally disabled under the privacy baseline.

## Decision

Remove the direct `deploy` package script.

Add:

```text
deployment:state
candidate:upload
shell:check
```

`deployment:state` is read-only and retrieves deployment/version state.

`candidate:upload` verifies the repository, verifies npm registry signatures and provenance, and then uses `wrangler versions upload`. It creates a version but does not change production traffic.

Production traffic changes remain explicit human commands using exact Worker version IDs.

Before promotion, the candidate is placed in the deployment at 0% and tested through the production route with the `Cloudflare-Workers-Version-Overrides` request header. The smoke script requires an expected service version whenever a version override is used.

Rollback or failback always names the exact known-good Worker version ID.

Post-promotion and post-failback verification requires sustained public version convergence rather than a single matching response. Deployment state and one successful probe are not sufficient evidence of request-path stability.

## Consequences

An accidental `npm run deploy` can no longer shift production traffic.

A candidate can be uploaded and identified without immediately serving users.

Candidate validation does not require enabling public preview URLs.

The process adds one explicit 0% staging deployment before promotion. This is deliberate because the deployment now carries both the known-good and candidate version IDs needed for targeted version-override testing.

The human operator must record exact version IDs and perform promotion or rollback explicitly.

Release publication waits for a bounded run of consecutive version-consistent probes, the complete ordinary production smoke suite, and a final stability window. A reappearance of the previous version resets convergence evidence.

## Rejected alternatives

### Keep `wrangler deploy`

Rejected because version creation and 100% production cutover remain coupled.

### Enable preview URLs

Rejected because it expands the public route inventory and conflicts with the current privacy baseline.

### Automated GitHub deployment

Rejected because V1 does not need a long-lived Cloudflare deployment credential in GitHub Actions.

### Non-zero canary by default

Rejected because persisted request-level observability is intentionally disabled and a canary without a version-specific monitoring signal does not provide enough evidence to justify additional deployment complexity.

## References

- https://developers.cloudflare.com/workers/versions-and-deployments/
- https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/
- https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/
- https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/
