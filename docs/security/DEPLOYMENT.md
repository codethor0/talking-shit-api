# Deployment Safety

Talking Shit API separates Worker version creation from production traffic changes.

The deployment invariant is:

```text
VERIFY -> SNAPSHOT -> UPLOAD -> IDENTIFY -> STAGE AT 0% -> TARGETED SMOKE -> HUMAN GATE -> PROMOTE -> SUSTAINED VERIFY -> RECORD
```

Direct `wrangler deploy` is not part of the release path because it creates a version and immediately sends 100% of production traffic to it.

## Security properties

The deployment process must preserve these properties:

- the candidate is built from an exact signed `main` commit;
- production continues serving the known-good version while the candidate is first validated;
- preview URLs remain disabled;
- the candidate is identified by its exact Cloudflare Worker version ID;
- the candidate receives 0% of normal traffic during targeted smoke testing;
- targeted smoke uses Cloudflare Worker version overrides;
- promotion requires an explicit human action and the exact candidate version ID;
- rollback or failback requires an explicit known-good version ID;
- release publication requires sustained public version convergence, full production smoke, and a final stability window;
- GitHub Actions does not hold a long-lived Cloudflare deployment credential;
- no script silently promotes or rolls back production traffic.

## 1. Verify the release source

From a trusted maintainer workstation:

```bash
git switch main
git pull --ff-only origin main
git status --short

export EXPECTED_RELEASE_COMMIT="<exact-reviewed-release-commit>"
npm run release:preflight
npm ci --no-fund --no-audit
npm run verify
npm audit signatures
git diff --check
npm run release:preflight
```

Verify the `main` commit signature and signed release tag before any production traffic change.

## 2. Snapshot the active deployment

Run:

```bash
npm run deployment:state
```

The command is read-only. Record:

```text
release commit SHA
current production service version
current deployment ID
known-good Worker version ID
candidate Worker version ID
```

Stop if the known-good Worker version cannot be identified exactly.

## 3. Upload a candidate without production traffic

The repository intentionally provides a candidate-upload command but no direct production-deploy command.

Example:

```bash
EXPECTED_RELEASE_COMMIT="<exact-reviewed-release-commit>" npm run candidate:upload -- \
  --tag "v0.6.1-rc.1" \
  --message "Talking Shit API v0.6.1 release candidate"
```

`wrangler versions upload` creates a Worker version without deploying that version to production traffic. The package script runs the release preflight before verification and again immediately before upload, and it passes `--config ./wrangler.jsonc` explicitly so a local Wrangler config redirect cannot substitute a different deployment configuration.

Immediately run:

```bash
npx --no-install wrangler versions list --config ./wrangler.jsonc --json
```

Identify the new version by its exact tag/message and record its Worker version ID. Do not select a candidate only because it is the newest entry.

## 4. Stage the candidate at zero percent

Set shell variables to exact reviewed values:

```bash
KNOWN_GOOD_VERSION_ID="<known-good-worker-version-id>"
CANDIDATE_VERSION_ID="<candidate-worker-version-id>"
```

Create a deployment containing the known-good version at 100% and the candidate at 0%:

```bash
npx --no-install wrangler versions deploy \
  --config ./wrangler.jsonc \
  "${KNOWN_GOOD_VERSION_ID}@100%" \
  "${CANDIDATE_VERSION_ID}@0%" \
  -y \
  --message "stage release candidate at zero percent"
```

This changes deployment metadata but does not intentionally route normal production requests to the candidate.

Confirm the deployment contains exactly the expected version IDs and percentages:

```bash
npx --no-install wrangler deployments status --config ./wrangler.jsonc --json
```

Stop on any mismatch.

## 5. Target the exact zero-percent candidate

Cloudflare version overrides can target a version that is present in the current deployment even when that version receives 0% of normal traffic.

The smoke script supports this without enabling preview URLs:

```bash
WORKER_VERSION_ID="$CANDIDATE_VERSION_ID" \
EXPECTED_SERVICE_VERSION="0.6.1" \
bash scripts/smoke.sh \
  "https://talking-shit-api.codethor0.workers.dev"
```

When `WORKER_VERSION_ID` is supplied, `EXPECTED_SERVICE_VERSION` is mandatory. This prevents an invalid or unapplied override from being mistaken for candidate success when production is still serving the old version.

Also prove the ordinary production path is still healthy:

```bash
EXPECTED_SERVICE_VERSION="0.6.0" \
bash scripts/smoke.sh \
  "https://talking-shit-api.codethor0.workers.dev"
```

The expected versions above are examples. Use the actual known-good and candidate release versions.

## 6. Human promotion gate

Do not promote unless all of these are true:

```text
candidate source commit trusted
candidate Worker version ID recorded
known-good Worker version ID recorded
candidate targeted smoke passed
ordinary production smoke passed
required GitHub checks passed
security audit passed
rollback command prepared
```

Promotion is a separate explicit command:

```bash
npx --no-install wrangler versions deploy \
  --config ./wrangler.jsonc \
  "${CANDIDATE_VERSION_ID}@100%" \
  -y \
  --message "promote reviewed release candidate"
```

No repository package script performs this traffic shift.

## 7. Verify sustained production convergence

After promotion, first confirm `wrangler deployments status --json` reports exactly the candidate Worker version at 100%.

Do not treat one matching HTTP response or one matching health/OpenAPI pair as proof of convergence. Production verification requires a bounded sustained window:

1. Send unique, cache-busting requests to both `/v1/health` and `/openapi.json`.
2. Send request headers that disable cache reuse, such as `Cache-Control: no-cache, no-store, max-age=0` and `Pragma: no-cache`.
3. Require at least 10 consecutive paired observations where `/v1/health` reports the expected `meta.service_version` and `/openapi.json` reports the expected `info.version`.
4. Reset the consecutive-success streak to zero if either endpoint reports the previous version or any other unexpected version.
5. After sustained convergence passes, run the complete smoke suite without a Worker version override.
6. After smoke passes, require at least 10 additional health-version samples with no regression.

Example full-smoke command after the sustained gate:

```bash
EXPECTED_SERVICE_VERSION="0.6.1" \
bash scripts/smoke.sh \
  "https://talking-shit-api.codethor0.workers.dev"
```

The expected version above is an example. Use the actual candidate release version.

Publish the GitHub release only after sustained convergence, the complete production smoke suite, and the final stability window all pass.

Record the final Worker version ID, deployment state, service version, and release URL.

## 8. Roll back or fail back on failure

If production verification fails, restore the exact recorded known-good Worker version before debugging forward.

For scripted or non-interactive failback, prefer an exact version deployment:

```bash
npx --no-install wrangler versions deploy \
  --config ./wrangler.jsonc \
  "${KNOWN_GOOD_VERSION_ID}@100%" \
  -y \
  --message "failback: production verification failed"
```

For an explicit interactive operator rollback, the exact-ID rollback command remains valid:

```bash
npx --no-install wrangler rollback "$KNOWN_GOOD_VERSION_ID" \
  --message "rollback: production verification failed"
```

Depending on Wrangler version and terminal context, `wrangler rollback` can still request interactive confirmation. Do not place an interactive rollback command inside an unattended error trap.

After recovery, confirm deployment state reports exactly the known-good Worker at 100%, require sustained observations of the known-good service version, and run the full smoke suite.

Do not debug forward while production remains broken when a safe failback is available.

## Why zero-percent staging instead of public preview URLs

Preview URLs remain disabled under the privacy and attack-surface baseline.

Cloudflare version overrides let the maintainer exercise the exact candidate through the production route only after the candidate is deliberately included in the current deployment at 0%. This preserves the smaller public route inventory while still proving the candidate before normal traffic reaches it.

## Gradual traffic

The default V1 procedure is targeted 0% validation followed by an explicit 100% promotion because the service is stateless, has no database migration risk, and intentionally disables persisted request-level observability.

A non-zero gradual rollout is not forbidden, but it requires a separate monitoring plan that can distinguish candidate failures from known-good failures. Do not add canary percentages merely because the platform supports them.
