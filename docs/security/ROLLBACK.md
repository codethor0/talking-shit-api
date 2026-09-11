# Rollback Procedure

Rollback is the default response to a release-caused production regression. Restore known-good service before debugging forward.

## Before every deployment

Record the current deployment and version information:

```bash
npx --no-install wrangler deployments status --config ./wrangler.jsonc --json
npx --no-install wrangler versions list --config ./wrangler.jsonc --json
```

Identify and retain the exact last known good Worker version ID.

Do not deploy if the previous stable version cannot be identified. Do not rely on `wrangler rollback` without an explicit version ID because Cloudflare can otherwise select the previously uploaded version rather than the reviewed rollback target.

## Scripted failback

For an automated or error-handler recovery path, prefer an exact non-interactive deployment of the known-good version:

```bash
KNOWN_GOOD_VERSION_ID="<known-good-worker-version-id>"

npx --no-install wrangler versions deploy \
  --config ./wrangler.jsonc \
  "${KNOWN_GOOD_VERSION_ID}@100%" \
  -y \
  --message "failback: production regression"
```

This avoids relying on interactive rollback prompts during unattended recovery.

## Interactive rollback

For an explicit operator-driven rollback, use the exact last known good version ID:

```bash
npx --no-install wrangler rollback "$KNOWN_GOOD_VERSION_ID" \
  --config ./wrangler.jsonc \
  --message "rollback: production regression"
```

Depending on Wrangler version and terminal context, the rollback command can still request confirmation. The operator must verify the exact target before accepting the prompt.

Cloudflare rollback or exact-version failback changes the Worker deployment but does not revert external storage resources or deleted bindings.

## Verify recovery

First confirm deployment state contains exactly the expected known-good Worker version at 100%:

```bash
npx --no-install wrangler deployments status --config ./wrangler.jsonc --json
```

Then require sustained observations of the expected known-good service version. Do not treat one matching health response as proof that every request path has converged.

After sustained recovery is established, run the full smoke suite:

```bash
EXPECTED_SERVICE_VERSION="<known-good-service-version>" \
bash scripts/smoke.sh \
  https://talking-shit-api.codethor0.workers.dev
```

Recovery is complete only when the exact deployment state, sustained service-version observations, and the full smoke suite all pass.

## Security incident exception

If the incident involves suspected Cloudflare or maintainer credential compromise, revoke or rotate the affected control-plane credential before performing additional privileged deployment operations.

## Do not

Do not:

- delete the failing version before evidence is captured;
- debug forward while production remains broken when a safe rollback is available;
- select a rollback version by age alone;
- roll back across incompatible storage or binding changes without reviewing Cloudflare rollback constraints.

V1 intentionally has no database or mutable storage, which keeps rollback risk small.
