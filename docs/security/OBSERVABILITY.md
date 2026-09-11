# Observability Operations

## Purpose

Talking Shit API uses Cloudflare-native observability to learn from real production behavior without adding an external telemetry stack or new runtime dependencies.

The observability boundary is deliberately narrow:

```text
Workers Metrics          always available
Workers Logs             enabled, 25 percent head sampling
Invocation Logs          enabled
Workers Traces           enabled, 1 percent head sampling
Query-string redaction   observability.redact_query_string = true
Custom application logs  forbidden
External destinations    none
Workers Logpush          forbidden
Tail Worker consumers    none
Smart Placement          not configured
Analytics Engine         not a production observability dependency
Preview URLs             disabled
```

## Free-plan guardrail

As reviewed on 2026-09-11, Cloudflare documents Workers Free at 200,000 observability events per day with three-day retention.

Tracing is currently free during beta. Cloudflare documents that beginning October 1, 2026, trace spans will share the Workers observability event quota.

The project must remain useful when observability is sampled or old events expire. Do not upgrade the Workers plan merely to retain more telemetry.

## Data-minimization rules

Invocation logs and traces are platform telemetry. Application code must not add custom logging of:

- client addresses;
- request headers;
- cookies;
- authorization material;
- rate-limit keys;
- response roast text;
- arbitrary request bodies;
- user-supplied identifiers.

Request query strings are redacted from platform logs and traces. The API accepts no arbitrary user text; query values are bounded to documented categories, levels, and count controls.

## Query Builder learning views

Use dashboard queries for:

```text
traffic by path
response status distribution
404 responses
429 responses
5xx responses
invocation outcome
CPU duration percentiles
wall-time percentiles
memory percentiles
Cloudflare execution location
deployment/version behavior
slowest sampled invocations
errors around deployment windows
```

Saved dashboard queries are operator conveniences, not part of the runtime contract.

## Real-time Logs

Use Cloudflare Real-time Logs during active debugging or deployment windows.

CLI:

```bash
npx --no-install wrangler tail --config ./wrangler.jsonc --format json
```

Do not redirect raw tail output to a long-lived local file by default. If incident evidence must be retained, minimize it and handle it according to the incident-response procedure.

## Traces

Tracing is intentionally sampled at 1 percent because one request can generate multiple spans and trace events share the observability event model.

Use traces to understand Worker execution flow and latency. Do not add custom spans until a concrete diagnostic need justifies additional event volume and privacy review.

## Sampling review

Review the initial 25 percent log and 1 percent trace rates after enough traffic exists to answer:

```text
Are logs helping diagnose real behavior?
Are traces producing useful information?
What is the daily event volume?
Are important errors visible?
Is 25 percent logging excessive or insufficient?
Is 1 percent tracing excessive or insufficient?
Has Cloudflare pricing or retention changed?
```

Reduce or disable telemetry that is not useful.

## Billing boundary

The following require explicit human review and are not enabled by this design:

```text
Workers Paid
Workers Logpush
external OpenTelemetry destinations
paid retention
Analytics Engine as a production dependency
third-party telemetry vendors
```

Budget alerts are not treated as hard spending caps. The primary billing control is remaining on Workers Free and refusing paid-only product dependencies.

## Verification

Before release, verify:

```bash
npm run policy
npm test
npm run build:check
npm audit signatures
npx --no-install wrangler secret list --config ./wrangler.jsonc --format json
npx --no-install wrangler deployments status --config ./wrangler.jsonc --json
```

Observability configuration changes follow the normal candidate upload, exact-version smoke, human promotion, convergence, production smoke, and stability process.
