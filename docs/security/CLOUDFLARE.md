# Cloudflare Security Posture

This document defines the Cloudflare-specific security boundary for Talking Shit API.

The Worker is intentionally public. The security objective is not to authenticate callers. It is to keep the implementation small, inputs bounded, deployment controlled, maintainer credentials protected, and abuse impact predictable.

## Current production posture

The source configuration requires:

- Worker name `talking-shit-api`;
- compatibility flags `no_nodejs_compat` and `no_nodejs_compat_v2`;
- `preview_urls: false`;
- native Workers Logs enabled with 25 percent head sampling and invocation logs enabled;
- native Workers traces enabled with 1 percent head sampling;
- no custom application logging or external telemetry destinations;
- one native rate-limit binding at 120 requests per 60 seconds;
- no declared application secrets;
- no database, KV, R2, D1, Durable Object, queue, AI, or other stateful runtime binding.

Production source code has zero runtime dependencies and no outbound `fetch()` capability.

## Bounded native observability

Cloudflare-native observability is enabled as a deliberate learning and operations capability while preserving the small runtime boundary. Workers Logs use a 25 percent head sampling rate and redact request query strings from platform logs and traces. Workers traces use a 1 percent head sampling rate. Preview URLs remain disabled.

The application does not add custom console logging. No external log or trace destination is configured. Workers Logpush, Tail Workers, Smart Placement, Analytics Engine, and third-party OpenTelemetry export are not part of this production boundary.

On the Workers Free plan, Workers Logs are currently documented at 200,000 events per day with three-day retention. Tracing is free during the current beta period and Cloudflare documents that trace spans will share the Workers observability event quota beginning October 1, 2026. Sampling rates must be reviewed before any pricing or quota change is accepted.

The application hashes the Cloudflare-provided client address before using it as the application rate-limit key. Raw client addresses are not persisted by the application.

## Public routing

The production API currently uses:

`https://talking-shit-api.codethor0.workers.dev`

Cloudflare documents `workers.dev` as appropriate for personal and hobby projects and recommends a Worker route or custom domain for business-critical production workloads.

For this project, `workers.dev` is an accepted simplicity and cost tradeoff. Revisit that decision if the API becomes business-critical, needs zone-level WAF controls, or receives sustained hostile traffic.

## Availability and abuse boundary

The application rate limiter is a defense-in-depth control, not a promise that distributed traffic can never consume the account-level Workers allowance.

On the Workers Free plan, Cloudflare currently documents a daily request allowance of 100,000 requests. A sufficiently distributed traffic source can therefore create availability pressure even when per-client application limits work correctly.

Do not treat load testing, distributed rate-limit bypass, or daily-quota exhaustion as authorized security research.

If abuse risk materially increases, evaluate these controls before adding application complexity:

1. move the public Worker to a custom domain or Worker route;
2. apply appropriate zone-level WAF and edge rate-limiting controls;
3. evaluate the Workers Paid plan if availability requirements exceed the Free-plan boundary;
4. keep application-level rate limiting as defense in depth.

## Maintainer authentication

Cloudflare account access should use two-factor authentication. A phishing-resistant security key is preferred when practical, with TOTP and recovery codes maintained as appropriate.

For local Wrangler OAuth on macOS, store credentials through the OS keychain:

```bash
npx --no-install wrangler login --use-keyring
```

Verify storage without printing secrets:

```bash
npx --no-install wrangler whoami
```

The expected credential-storage description should report an encrypted Wrangler credential file with its encryption key held in macOS Keychain.

Do not use the Cloudflare Global API Key for normal project operations.

If an API token is ever required, give it only the permissions and resource scope needed for the task, set an expiration where practical, and revoke or roll it when no longer needed.

No long-lived Cloudflare deployment credential belongs in GitHub Actions for this project. Production promotion remains a human-gated maintainer action.

## Worker secrets

The current Worker does not require application secrets.

Read-only verification:

```bash
npx --no-install wrangler secret list --config ./wrangler.jsonc --format json
```

The expected result is an empty list. A newly added secret is a security-boundary change and requires human review, documentation, and threat-model reconciliation.

## Deployment verification

Before any production traffic change, record the active Worker deployment and the exact known-good Worker version ID:

```bash
npx --no-install wrangler deployments status --config ./wrangler.jsonc --json
npx --no-install wrangler versions list --config ./wrangler.jsonc --json
```

Candidate code must be uploaded without immediate production promotion, validated by exact Worker version override, and promoted only after the human gate defined in `docs/security/DEPLOYMENT.md`.

After promotion, sustained version convergence, ordinary production smoke, and a final stability window are mandatory.

## Account-side launch checklist

Before a public launch:

- Cloudflare account 2FA is enabled.
- Local Wrangler OAuth credentials are stored through macOS Keychain or an equivalently protected mechanism.
- No Global API Key is exposed in shell configuration, repository files, CI, or logs.
- Worker secret list is empty.
- Preview URLs remain disabled.
- Workers Logs remain enabled at 25 percent head sampling and traces remain enabled at 1 percent head sampling.
- No custom application logging or external telemetry destination is present.
- Production deployment contains exactly the reviewed Worker version at 100 percent traffic.
- The full public smoke suite passes.
- The known-good failback Worker version ID is recorded.

## External references

- Cloudflare Workers `workers.dev`: https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Workers Rate Limiting API: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Wrangler authentication and keychain storage: https://developers.cloudflare.com/workers/wrangler/commands/general/
- Cloudflare account 2FA: https://developers.cloudflare.com/fundamentals/user-profiles/2fa/
- Cloudflare API tokens: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
