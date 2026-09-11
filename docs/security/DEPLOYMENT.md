# Deployment Safety

Talking Shit API separates Worker version creation, non-versioned Cloudflare settings, and production traffic changes.

The deployment invariant is:

```text
VERIFY -> SNAPSHOT VERSION + CONFIG -> UPLOAD -> IDENTIFY -> STAGE 0% WITH KNOWN-GOOD CONFIG -> TARGETED SMOKE -> HUMAN CONTROL-PLANE GATE -> SYNC REVIEWED NON-VERSIONED SETTINGS -> REDACTION VERIFY -> HUMAN TRAFFIC GATE -> PROMOTE -> SUSTAINED VERIFY -> RECORD
```

Direct `wrangler deploy` is not part of the release path because it creates a version and immediately sends 100 percent of production traffic to it.

## Cloudflare state model

Worker code versions and some Worker service settings have different lifecycles.

For this project, observability and Logpush are non-versioned Worker settings. `wrangler versions upload` creates the candidate Worker version without applying observability. `wrangler versions deploy`, however, can synchronize non-versioned settings from the configuration supplied to that command.

Therefore an observability-changing release has two independent recovery anchors:

```text
known-good Worker version ID
known-good wrangler.jsonc from the signed prior release
```

A Worker-version rollback alone is not sufficient to restore the previous telemetry state.

## Security properties

The deployment process must preserve these properties:

- the candidate is built from an exact signed `main` commit;
- production continues serving the known-good Worker while candidate code is first validated;
- preview URLs remain disabled;
- the candidate is identified by its exact Cloudflare Worker version ID;
- the candidate receives 0 percent of normal traffic during targeted smoke testing;
- targeted smoke uses Cloudflare Worker version overrides;
- a release that changes non-versioned settings retains the exact prior signed `wrangler.jsonc` as a separate recovery anchor;
- zero-percent staging for such a release uses the known-good configuration before the new non-versioned settings are synchronized;
- non-versioned settings require a separate explicit human gate;
- production promotion requires a separate explicit human action and the exact candidate version ID;
- rollback or failback restores the exact known-good Worker version and, when applicable, the known-good non-versioned settings;
- release publication requires sustained public version convergence, full production smoke, a final stability window, and required control-plane verification;
- GitHub Actions does not hold a long-lived Cloudflare deployment credential;
- no script silently promotes, rolls back, or changes paid service state.

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

Verify the `main` commit signature and signed release tag before any production or control-plane change.

## 2. Snapshot the active deployment and known-good configuration

Run:

```bash
npm run deployment:state
```

Record:

```text
release commit SHA
current production service version
current deployment ID
known-good Worker version ID
candidate Worker version ID
```

For a release that changes non-versioned Cloudflare settings, also materialize the prior signed release configuration exactly:

```bash
KNOWN_GOOD_RELEASE_TAG="<signed-prior-release-tag>"
KNOWN_GOOD_CONFIG_DIR="$(mktemp -d "${TMPDIR:-/tmp}/talking-shit-known-good.XXXXXX")"
KNOWN_GOOD_CONFIG="$KNOWN_GOOD_CONFIG_DIR/wrangler.jsonc"

git show "${KNOWN_GOOD_RELEASE_TAG}:wrangler.jsonc" > "$KNOWN_GOOD_CONFIG"
shasum -a 256 "$KNOWN_GOOD_CONFIG"
```

Record the tag and hash. Do not reconstruct the old configuration manually. Keep the temporary file until the release is complete or failback is no longer required.

Stop if the known-good Worker version or required known-good configuration cannot be identified exactly.

## 3. Upload a candidate without production traffic

The repository intentionally provides a candidate-upload command but no direct production-deploy command.

Example:

```bash
EXPECTED_RELEASE_COMMIT="<exact-reviewed-release-commit>" npm run candidate:upload -- \
  --tag "<release-version>-rc.1" \
  --message "Talking Shit API <release-version> release candidate"
```

`wrangler versions upload` creates a Worker version without deploying that version to production traffic. The package script runs the release preflight before verification and again immediately before upload, and it passes `--config ./wrangler.jsonc` explicitly so a local Wrangler config redirect cannot substitute a different deployment configuration.

Observability and Logpush are non-versioned Worker settings and are not applied by the version upload itself.

Immediately run:

```bash
npx --no-install wrangler versions list --config ./wrangler.jsonc --json
```

Identify the new version by its exact tag/message and record its Worker version ID. Do not select a candidate only because it is the newest entry.

## 4. Stage the candidate at zero percent without changing non-versioned state

Set shell variables to exact reviewed values:

```bash
KNOWN_GOOD_VERSION_ID="<known-good-worker-version-id>"
CANDIDATE_VERSION_ID="<candidate-worker-version-id>"
```

For a release that changes observability or another non-versioned setting, stage with `KNOWN_GOOD_CONFIG`:

```bash
npx --no-install wrangler versions deploy \
  --config "$KNOWN_GOOD_CONFIG" \
  "${KNOWN_GOOD_VERSION_ID}@100%" \
  "${CANDIDATE_VERSION_ID}@0%" \
  -y \
  --message "stage release candidate at zero percent with known-good non-versioned settings"
```

For a release that does not change non-versioned settings, `./wrangler.jsonc` remains appropriate.

Confirm the deployment contains exactly the expected version IDs and percentages:

```bash
npx --no-install wrangler deployments status --config ./wrangler.jsonc --json
```

Stop on any mismatch.

## 5. Target the exact zero-percent candidate

Cloudflare version overrides can target a version that is present in the current deployment even when that version receives 0 percent of normal traffic.

The smoke script supports this without enabling preview URLs:

```bash
WORKER_VERSION_ID="$CANDIDATE_VERSION_ID" \
EXPECTED_SERVICE_VERSION="<candidate-service-version>" \
bash scripts/smoke.sh \
  "https://talking-shit-api.codethor0.workers.dev"
```

When `WORKER_VERSION_ID` is supplied, `EXPECTED_SERVICE_VERSION` is mandatory. This prevents an invalid or unapplied override from being mistaken for candidate success when production is still serving the old version.

Also prove the ordinary production path is still healthy:

```bash
EXPECTED_SERVICE_VERSION="<known-good-service-version>" \
bash scripts/smoke.sh \
  "https://talking-shit-api.codethor0.workers.dev"
```

The expected versions above are examples. Use the actual known-good and candidate release versions.

## 6. Human non-versioned settings gate

Do not change non-versioned Cloudflare settings until candidate targeted smoke, ordinary production smoke, CI, security review, and dual-anchor failback readiness all pass.

For the reviewed observability change, preserve the 100/0 Worker traffic split while synchronizing the new `./wrangler.jsonc`:

```bash
npx --no-install wrangler versions deploy \
  --config ./wrangler.jsonc \
  "${KNOWN_GOOD_VERSION_ID}@100%" \
  "${CANDIDATE_VERSION_ID}@0%" \
  -y \
  --message "enable reviewed non-versioned observability while candidate remains at zero percent"
```

This creates a new deployment record with the same traffic split and synchronizes the reviewed non-versioned settings. It must not be treated as candidate promotion.

Immediately confirm the deployment still contains exactly the known-good Worker at 100 percent and candidate at 0 percent. Then verify the expected observability state through the Cloudflare control plane before continuing.

If the command, traffic split, or non-versioned state is unexpected, restore both anchors using the failback procedure before debugging forward.

## 7. Verify query-string redaction with a synthetic canary

Follow `docs/security/OBSERVABILITY.md`.

Use only a generated, non-sensitive canary because the purpose of the test is to prove that it is not persisted. Capture request timing and Cloudflare Ray IDs without retaining full request URLs.

Success requires:

```text
at least one sampled Workers Log from the canary window
at least one sampled trace from the canary window
no cleartext canary value in the sampled log
no cleartext canary value in the sampled trace
no unexpected query value in URL or query attributes
```

Because logs and traces are sampled, zero search results without a corresponding sampled record are inconclusive. Send only a bounded number of canary requests and remain below the project's rate-limit and abuse boundaries.

Stop and restore the known-good configuration if redaction is not demonstrated.

## 8. Human production promotion gate

Do not promote unless all of these are true:

```text
candidate source commit trusted
candidate Worker version ID recorded
known-good Worker version ID recorded
known-good configuration anchor recorded when required
candidate targeted smoke passed
ordinary production smoke passed
required GitHub checks passed
security audit passed
reviewed non-versioned state verified
synthetic redaction verification passed when required
dual-anchor failback command prepared
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

## 9. Verify sustained production convergence

After promotion, first confirm `wrangler deployments status --json` reports exactly the candidate Worker version at 100 percent.

Do not treat one matching HTTP response or one matching health/OpenAPI pair as proof of convergence. Production verification requires a bounded sustained window:

1. Send unique, cache-busting requests to both `/v1/health` and `/openapi.json`.
2. Send request headers that disable cache reuse, such as `Cache-Control: no-cache, no-store, max-age=0` and `Pragma: no-cache`.
3. Require at least 10 consecutive paired observations where `/v1/health` reports the expected `meta.service_version` and `/openapi.json` reports the expected `info.version`.
4. Reset the consecutive-success streak to zero if either endpoint reports the previous version or any other unexpected version.
5. After sustained convergence passes, run the complete smoke suite without a Worker version override.
6. After smoke passes, require at least 10 additional health-version samples with no regression.

Example full-smoke command after the sustained gate:

```bash
EXPECTED_SERVICE_VERSION="<candidate-service-version>" \
bash scripts/smoke.sh \
  "https://talking-shit-api.codethor0.workers.dev"
```

Publish the GitHub release only after sustained convergence, the complete production smoke suite, the final stability window, and any required control-plane checks all pass.

## 10. Restore both recovery anchors on failure

If production or control-plane verification fails, restore the exact known-good Worker version and exact known-good non-versioned configuration before debugging forward.

For an observability-changing release:

```bash
npx --no-install wrangler versions deploy \
  --config "$KNOWN_GOOD_CONFIG" \
  "${KNOWN_GOOD_VERSION_ID}@100%" \
  -y \
  --message "failback: restore known-good Worker and non-versioned settings"
```

This is preferred over a Worker-only rollback because `wrangler rollback` changes the deployed Worker version but does not restore non-versioned observability state.

After recovery, confirm deployment state reports exactly the known-good Worker at 100 percent, verify the prior non-versioned configuration through the Cloudflare control plane, require sustained observations of the known-good service version, and run the full smoke suite.

Do not debug forward while production or control-plane state remains outside the recorded baseline when safe failback is available.

## Why zero-percent staging instead of public preview URLs

Preview URLs remain disabled under the privacy and attack-surface baseline.

Cloudflare version overrides let the maintainer exercise the exact candidate through the production route only after the candidate is deliberately included in the current deployment at 0 percent. This preserves the smaller public route inventory while still proving the candidate before normal traffic reaches it.

## Gradual traffic

The default V1 procedure is targeted 0 percent validation followed by explicit non-versioned-state verification and then an explicit 100 percent promotion because the service is stateless and has no database migration risk.

A non-zero gradual rollout is not forbidden, but it requires a separate monitoring plan that can distinguish candidate failures from known-good failures. Do not add canary percentages merely because the platform supports them.
