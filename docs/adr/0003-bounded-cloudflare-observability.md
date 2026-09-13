# ADR 0003: Bounded Cloudflare Observability

Status: Accepted
Date: 2026-09-11
Supersedes: ADR 0002 observability decision only

## Context

Talking Shit API originally disabled persisted Workers observability to maximize privacy by absence. The project is now also being used as a learning platform, and bounded operational telemetry is useful for understanding real traffic, failures, latency, resource use, Cloudflare execution locations, release behavior, and abuse pressure.

The runtime architecture does not need a logging vendor, database, queue, Analytics Engine binding, or other application infrastructure to gain those lessons. Cloudflare provides native Workers Logs, Query Builder, Real-time Logs, metrics, and traces.

This change intentionally revises only the observability portion of ADR 0002. Preview URLs remain disabled and all other privacy and verification decisions remain in force.

## Decision

Enable bounded native Cloudflare observability in `wrangler.jsonc`:

```json
"observability": {
  "enabled": true,
  "redact_query_string": true,
  "logs": {
    "enabled": true,
    "invocation_logs": true,
    "head_sampling_rate": 0.25
  },
  "traces": {
    "enabled": true,
    "head_sampling_rate": 0.01
  }
}
```

The stable Wrangler field `observability.redact_query_string` is intentionally a sibling of `logs` and `traces`. It removes request query strings from request URLs represented in Workers Logs and traces.

Operational rules:

- sample Workers invocation logs at 25 percent;
- redact request query strings from Workers Logs and traces;
- sample Workers traces at 1 percent;
- do not add custom application console logging;
- do not configure external log or trace destinations;
- do not enable paid Workers Logpush;
- do not add Tail Worker consumers;
- do not enable Smart Placement for the current no-upstream Worker;
- do not add Analytics Engine solely for observability;
- keep preview URLs disabled;
- keep zero runtime dependencies, zero application secrets, and zero outbound runtime calls;
- treat any sampling, persistence, billing, or export change as a human-reviewed boundary change.

## Privacy consequence

Cloudflare platform observability can retain sampled request, response, execution, and trace metadata. This is no longer privacy by total telemetry absence.

The project instead uses bounded platform telemetry with short retention, query-string redaction, and no custom application request logging. Public query values are allowlisted API controls and the service accepts no arbitrary user text.

Application code must not intentionally log client addresses, headers, cookies, rate-limit keys, roast payloads, or other request-specific identifiers.

## Cost consequence

The project remains designed for the Workers Free plan. The service must not depend on paid retention or paid telemetry export.

As reviewed on 2026-09-11, Workers Free provides 200,000 observability events per day with three-day retention. Workers tracing is free during the current beta period. Cloudflare documents that beginning October 1, 2026, trace spans will share the Workers observability event quota.

Before accepting any future Cloudflare pricing or quota change, re-review sampling and disable traces or reduce sampling if needed. Do not silently upgrade the plan.

## Operational consequence

The project gains native historical logs, Query Builder, Real-time Logs, and trace inspection while preserving the existing runtime architecture.

The initial sampling rates are deliberately conservative. They are configuration values, not permanent promises. Change them only after reviewing actual event volume, diagnostic value, privacy impact, and current Cloudflare pricing.

## References

- https://developers.cloudflare.com/workers/observability/
- https://developers.cloudflare.com/workers/observability/logs/workers-logs/
- https://developers.cloudflare.com/workers/observability/logs/real-time-logs/
- https://developers.cloudflare.com/workers/observability/query-builder/
- https://developers.cloudflare.com/workers/observability/traces/
- https://developers.cloudflare.com/workers/platform/pricing/
