# Rollback Procedure

Rollback is the default response to a release-caused production regression. Restore known-good service and control-plane state before debugging forward.

## Two recovery anchors

Worker versions and observability do not share the same lifecycle. Observability is non-versioned Cloudflare Worker service state, so rolling back only the Worker version does not restore the previous observability configuration.

For any release that changes a non-versioned setting, retain both:

```text
known-good Worker version ID
known-good wrangler.jsonc from the signed prior release
```

## Before every deployment

Record the current deployment and version information:

```bash
npx --no-install wrangler deployments status --config ./wrangler.jsonc --json
npx --no-install wrangler versions list --config ./wrangler.jsonc --json
```

Identify and retain the exact last known-good Worker version ID.

For a release that changes non-versioned settings, materialize the exact signed prior configuration:

```bash
KNOWN_GOOD_RELEASE_TAG="<signed-prior-release-tag>"
KNOWN_GOOD_CONFIG_DIR="$(mktemp -d "${TMPDIR:-/tmp}/talking-shit-known-good.XXXXXX")"
KNOWN_GOOD_CONFIG="$KNOWN_GOOD_CONFIG_DIR/wrangler.jsonc"

git show "${KNOWN_GOOD_RELEASE_TAG}:wrangler.jsonc" > "$KNOWN_GOOD_CONFIG"
shasum -a 256 "$KNOWN_GOOD_CONFIG"
```

Record the source tag and hash. Do not deploy if either recovery anchor cannot be identified exactly.

Do not rely on `wrangler rollback` without an explicit version ID because Cloudflare can otherwise select a previously uploaded version rather than the reviewed rollback target.

## Dual-anchor failback

For a release that changed observability or another non-versioned setting, prefer one exact non-interactive `versions deploy` using the known-good configuration:

```bash
npx --no-install wrangler versions deploy \
  --config "$KNOWN_GOOD_CONFIG" \
  "${KNOWN_GOOD_VERSION_ID}@100%" \
  -y \
  --message "failback: restore known-good Worker and non-versioned settings"
```

The command restores the exact Worker version while also synchronizing non-versioned settings from the recorded known-good configuration.

## Worker-only rollback

If a release did not change non-versioned settings, an explicit Worker-version rollback remains valid:

```bash
npx --no-install wrangler rollback "$KNOWN_GOOD_VERSION_ID" \
  --config ./wrangler.jsonc \
  --message "rollback: production regression"
```

Depending on Wrangler version and terminal context, the rollback command can still request confirmation. The operator must verify the exact target before accepting the prompt.

Do not use Worker-only rollback as the default recovery for an observability-changing release because it does not restore the previous non-versioned telemetry state.

Cloudflare rollback or exact-version failback changes the Worker deployment but does not revert external storage resources or deleted bindings. V1 intentionally has no database or mutable application storage.

## Verify recovery

First confirm deployment state contains exactly the expected known-good Worker version at 100 percent:

```bash
npx --no-install wrangler deployments status --config ./wrangler.jsonc --json
```

For a dual-anchor failback, also verify through the Cloudflare control plane that the non-versioned settings match the recorded known-good configuration.

Then require sustained observations of the expected known-good service version. Do not treat one matching health response as proof that every request path has converged.

After sustained recovery is established, run the full smoke suite:

```bash
EXPECTED_SERVICE_VERSION="<known-good-service-version>" \
bash scripts/smoke.sh \
  https://talking-shit-api.codethor0.workers.dev
```

Recovery is complete only when the exact deployment state, required non-versioned state, sustained service-version observations, and the full smoke suite all pass.

## Security incident exception

If the incident involves suspected Cloudflare or maintainer credential compromise, revoke or rotate the affected control-plane credential before performing additional privileged deployment operations.

## Do not

Do not:

- delete the failing version before evidence is captured;
- debug forward while production remains broken when safe failback is available;
- select a rollback version by age alone;
- assume Worker-version rollback restores non-versioned observability;
- reconstruct the known-good configuration from memory;
- roll back across incompatible storage or binding changes without reviewing Cloudflare rollback constraints.
