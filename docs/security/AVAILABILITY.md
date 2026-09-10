# Availability Model

## Current posture

Talking Shit API is a non-critical public API running on Cloudflare Workers. The design minimizes preventable outages by keeping each request constant-small, avoiding runtime dependencies and upstream services, bounding public input, and failing closed when rate limiting is unavailable.

No honest architecture can guarantee zero downtime. The objective is to remove avoidable failure modes and make recovery mechanical.

## Current platform limits

As reviewed on 2026-09-10, Cloudflare documents these Workers Free limits:

- 100,000 Worker requests per day;
- 10 ms CPU time per invocation;
- 128 MB memory.

The application is designed to remain well below CPU and memory limits during normal operation.

## Abuse limitation

The current rate limiter allows 120 requests per 60 seconds per derived client key, but Cloudflare documents Worker rate-limit counters as local to a Cloudflare location and intentionally permissive/eventually consistent.

Therefore distributed abuse can still consume the account-wide daily Free-plan request quota. This is the largest known availability risk in the current architecture.

## Failure modes and response

### Application regression

Control: full verification, signed releases, production semantic smoke, and immediate rollback.

### Rate-limit service failure

Control: fail closed with HTTP 503. Do not bypass the limiter to preserve availability.

### Distributed quota exhaustion

Control: application-level resource bounds reduce amplification, but cannot eliminate distributed request volume.

If the service becomes business-critical or must remain available under distributed abuse, re-evaluate the deployment plan before making that claim. A Workers Paid plan, custom domain, and edge abuse controls may become justified. That is a deliberate architecture and cost decision, not a silent upgrade.

### Cloudflare platform incident

Control: no application-side dependency can eliminate provider failure. Record platform status and avoid destructive recovery changes during a provider-wide incident.

### Maintainer or repository compromise

Control: signed commits/tags, protected main, exact CODEOWNERS, minimal workflow permissions, and rollback to a trusted signed release.

## Availability change gate

Any proposal to add caching state, Durable Objects, KV, D1, queues, third-party uptime services, WAF-specific application assumptions, or paid infrastructure must document:

```text
requirement
security benefit
new failure modes
privacy impact
cost ceiling
rollback path
operational owner
```

Complexity is not an availability feature unless it removes a measured failure mode.
