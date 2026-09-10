# Rollback Procedure

Rollback is the default response to a release-caused production regression. Restore known-good service before debugging forward.

## Before every deployment

Record the current deployment and version information:

```bash
npx wrangler deployments status --json
npx wrangler versions list --json
```

Identify and retain the exact last known good Worker version ID.

Do not deploy if the previous stable version cannot be identified. Do not rely on `wrangler rollback` without an explicit version ID because Cloudflare can otherwise select the previously uploaded version rather than the reviewed rollback target.

## Roll back

Use the exact last known good version ID:

```bash
npx wrangler rollback <VERSION_ID> --message "rollback: production regression"
```

Cloudflare rollback immediately creates a deployment that sends production traffic to the selected prior version. Rollback changes the Worker deployment but does not revert external storage resources or deleted bindings.

## Verify recovery

After rollback, verify:

```bash
curl --fail --silent --show-error \
  https://talking-shit-api.codethor0.workers.dev/v1/health

bash scripts/smoke.sh \
  https://talking-shit-api.codethor0.workers.dev
```

Also confirm the reported service version is the expected known-good version.

## Security incident exception

If the incident involves suspected Cloudflare or maintainer credential compromise, revoke or rotate the affected control-plane credential before performing additional privileged deployment operations.

## Do not

Do not:

- delete the failing version before evidence is captured;
- debug forward while production remains broken when a safe rollback is available;
- select a rollback version by age alone;
- roll back across incompatible storage or binding changes without reviewing Cloudflare rollback constraints.

V1 intentionally has no database or mutable storage, which keeps rollback risk small.
