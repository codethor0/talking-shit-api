# Deployment Safety

Talking Shit API separates Worker version creation from production traffic changes.

The deployment invariant is:

```text
VERIFY -> SNAPSHOT -> UPLOAD -> IDENTIFY -> STAGE AT 0% -> TARGETED SMOKE -> HUMAN GATE -> PROMOTE -> VERIFY -> RECORD
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
- rollback requires an explicit known-good version ID;
- GitHub Actions does not hold a long-lived Cloudflare deployment credential;
- no script silently promotes or rolls back production traffic.

## 1. Verify the release source

From a trusted maintainer workstation:

```bash
git switch main
git pull --ff-only origin main
git status --short

npm ci --no-fund --no-audit
npm run verify
npm audit signatures
git diff --check
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
npm run candidate:upload -- \
  --tag "v0.6.1-rc.1" \
  --message "Talking Shit API v0.6.1 release candidate"
```

`wrangler versions upload` creates a Worker version without deploying that version to production traffic.

Immediately run:

```bash
npx wrangler versions list --json
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
npx wrangler versions deploy \
  "${KNOWN_GOOD_VERSION_ID}@100%" \
  "${CANDIDATE_VERSION_ID}@0%" \
  -y \
  --message "stage release candidate at zero percent"
```

This changes deployment metadata but does not intentionally route normal production requests to the candidate.

Confirm the deployment contains exactly the expected version IDs and percentages:

```bash
npx wrangler deployments status --json
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
npx wrangler versions deploy \
  "${CANDIDATE_VERSION_ID}@100%" \
  -y \
  --message "promote reviewed release candidate"
```

No repository package script performs this traffic shift.

## 7. Verify production convergence

After promotion, confirm the public endpoint reports the expected release version and then run the complete smoke suite without a version override:

```bash
EXPECTED_SERVICE_VERSION="0.6.1" \
bash scripts/smoke.sh \
  "https://talking-shit-api.codethor0.workers.dev"
```

Record the final Worker version ID and deployment state.

## 8. Roll back on failure

If production verification fails, restore the exact recorded known-good Worker version:

```bash
npx wrangler rollback "$KNOWN_GOOD_VERSION_ID" \
  --message "rollback: production verification failed"
```

Then verify the known-good service version and full smoke suite.

Do not debug forward while production remains broken when a safe rollback is available.

## Why zero-percent staging instead of public preview URLs

Preview URLs remain disabled under the privacy and attack-surface baseline.

Cloudflare version overrides let the maintainer exercise the exact candidate through the production route only after the candidate is deliberately included in the current deployment at 0%. This preserves the smaller public route inventory while still proving the candidate before normal traffic reaches it.

## Gradual traffic

The default V1 procedure is targeted 0% validation followed by an explicit 100% promotion because the service is stateless, has no database migration risk, and intentionally disables persisted request-level observability.

A non-zero gradual rollout is not forbidden, but it requires a separate monitoring plan that can distinguish candidate failures from known-good failures. Do not add canary percentages merely because the platform supports them.
