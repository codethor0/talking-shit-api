# Free-Tier Operating Boundary

This document is the resource catalog behind the project's no-charge rule. It records which Cloudflare resources the project may use, what each one does when its free allowance runs out, and how much headroom the current configuration has.

The rule itself is in `docs/DOCTRINE.md` section 21 and `docs/adr/0006-free-tier-operating-boundary.md`. Availability risk is in `AVAILABILITY.md`. Telemetry detail is in `OBSERVABILITY.md`.

Figures below were read from the Cloudflare documentation on 2026-09-18. Cloudflare changes limits and pricing. Re-read the linked pages before changing `wrangler.jsonc` and update this file in the same change.

## How a charge can happen

On the Workers Free plan Cloudflare documents no overage billing: when a Free allowance is exhausted, further operations of that type fail with an error. The project therefore cannot be billed for Workers usage while the account stays on Free.

Money can still change hands in three ways, and each one is a deliberate act:

1. Upgrading the account to Workers Paid.
2. Enabling a product whose usage is billable on a payment method, such as R2 storage beyond its free tier.
3. Buying something outside Workers, such as a domain registration or a zone add-on.

Nothing in this repository can do any of these. The policy check refuses any `wrangler.jsonc` key that has not been reviewed, so a new binding cannot arrive by accident.

Confirm the plan in the Cloudflare dashboard under Workers and Pages, then Plans. It must read Free. A billing alert is a notification, not a spending cap.

## Resource catalog

Stance values: **in use** is deployed today. **Candidate** may be proposed through an ADR. **Excluded** must not be used until the stated condition changes.

| Resource | Free allowance | At the limit | Stance |
| --- | --- | --- | --- |
| Workers requests | 100,000 per day, resets at 00:00 UTC | Error 1027, no overage charge | In use |
| Workers CPU time | 10 ms per invocation | The invocation fails | In use |
| Workers subrequests | 50 per invocation | The subrequest fails | Unused by design; see DOCTRINE section 4 |
| Rate Limiting binding | No separate charge documented in the pages reviewed | Not stated | In use, 120 per 60 seconds |
| Workers Logs | 200,000 events per day, 3-day retention | Writes stop, no overage charge | In use, 25 percent sampling |
| Workers traces | Free during beta; from 2026-10-01 each span counts as one observability event against the Logs quota | Shares the Logs limit | In use, 1 percent sampling |
| Workers KV | 100,000 reads, 1,000 writes and deletes per day, 1 GB | Operations fail | Candidate |
| D1 | 5 million rows read, 100,000 rows written per day, 5 GB | Queries fail on Free since 2026-09-01 | Candidate |
| Durable Objects | SQLite-backed only on Free; 100,000 requests and 13,000 GB-seconds per day | Operations fail | Candidate |
| Queues | 10,000 operations per day | Operations fail | Candidate |
| Workers AI | 10,000 Neurons per day | Requests fail, paid plan needed to exceed | Excluded: ADR 0001 keeps an AI model out of production |
| Workers Analytics Engine | 100,000 data points written, 10,000 read queries per day | Behavior at the limit is not documented; billing is announced for "the coming months" | Excluded until Cloudflare publishes Free-plan limit behavior and a billing date |
| R2 | 10 GB-month, 1 million Class A, 10 million Class B operations per month | Overage handling on Free was not stated in the pages reviewed | Excluded until a hard-fail Free behavior is documented |
| Workers Logpush, Tail Workers | Not available on Free, or billable | Not applicable | Excluded by policy |

## Sampling headroom

The Free plan caps Worker requests at 100,000 per day, so that is the worst case for observability volume.

| Signal | Rate | Worst case per day |
| --- | --- | --- |
| Invocation logs | 25 percent of 100,000 requests | 25,000 events |
| Traces | 1 percent of 100,000 requests, assumed at most 10 spans each | 10,000 events |
| Total | | 35,000 events, 17.5 percent of the 200,000 quota |

The span count is an assumption for a small Worker, not a Cloudflare figure. Check real span counts in the dashboard after 2026-10-01 and update this table.

Headroom is large. Even at 100 percent log sampling the worst case is about 110,000 events per day, 55 percent of the quota. The reason sampling is 25 percent is privacy, not quota: ADR 0004 chose to retain a bounded sample of platform request metadata. Raising it is a privacy decision that requires an ADR update and a change to the pinned policy value, not a quota decision.

## Observed CPU headroom

The Free plan allows 10 ms of CPU per invocation. A live `wrangler tail` of production v0.7.0 on 2026-09-18 recorded `cpuTime` of 0 to 1 ms and `wallTime` of 1 to 2 ms for four requests covering a success, a validation error, and a 404. This is a small sample at whole-millisecond resolution, so read it as an order of magnitude, roughly a tenfold margin, not as a guarantee. Re-measure after a release that changes request handling.

## Verify the account matches the boundary

One command runs the whole read-only audit. It uses the Wrangler login you already have (`npx wrangler login` opens a browser and asks you to click Allow), never reads or prints a token, calls no Cloudflare API itself, and changes nothing:

```bash
node scripts/cloudflare-audit.mjs --open
```

`--open` also opens the two dashboard pages that only a person can read. Without it the script prints their links. It exits 1 if any check fails.

What it checks:

| Check | Expected |
| --- | --- |
| KV namespaces, D1 databases, Worker secrets | none |
| R2 | not enabled on the account (API error 10042). Enabling R2 is a billable-risk decision, see the catalog above |
| Vectorize, Secrets Store, Queues, Hyperdrive | none |
| Deployment | exactly one Worker version at 100 percent |
| Live bindings | only the `ratelimit` binding declared in `wrangler.jsonc` |
| Compatibility date and flags | equal to `wrangler.jsonc` |
| Handlers | `fetch` only |

Last verified 2026-09-18 against production v0.7.0: all twelve checks passed.

Two facts cannot be read with Wrangler and need a person in the Cloudflare dashboard, which the script links: the plan (Workers and Pages, then Plans, must read Free) and the live non-versioned observability settings (the Worker's settings must show the sampling rates in `wrangler.jsonc`). Reading the plan through the API needs a separate token with the Billing Read permission, which this project does not create. Record both facts when a release changes them.

## Adding a free resource

A new binding is a one-way door under DOCTRINE section 18. Before the change:

1. Confirm in the current Cloudflare documentation that the resource is available on Free and fails, rather than bills, at its limit.
2. Write or update an ADR with the requirement, threat and privacy change, worst-case daily usage against the allowance, failure mode, and rollback path.
3. Add the reviewed key to the allowlist in `scripts/policy-check.mjs` in the same pull request, so the guard and the decision change together.
4. Update the catalog above and `docs/THREAT_MODEL.md`.
5. Provision the resource by hand from a maintainer machine. No workflow, script, or agent creates account resources.

## References

- Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Workers pricing and Free allowances: https://developers.cloudflare.com/workers/platform/pricing/
- Workers tracing: https://developers.cloudflare.com/workers/observability/traces/
- Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Workers Analytics Engine pricing: https://developers.cloudflare.com/analytics/analytics-engine/pricing/
- R2 pricing: https://developers.cloudflare.com/r2/pricing/
