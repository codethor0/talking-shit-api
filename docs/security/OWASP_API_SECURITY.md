# OWASP API Security Top 10 Mapping

Reference: OWASP API Security Top 10 (2023).

This mapping documents how the current V1 architecture addresses each category. "Not applicable by architecture" means the capability required for the weakness does not exist in the current service. If that capability is later introduced, the item must be reassessed.

| OWASP item | Current status | Project control |
| --- | --- | --- |
| API1: Broken Object Level Authorization | Not applicable by architecture | No accounts, user-owned objects, object identifiers, or privileged object reads/writes. |
| API2: Broken Authentication | Not applicable by architecture | No authentication, sessions, API keys, login flow, or authenticated operation. |
| API3: Broken Object Property Level Authorization | Not applicable by architecture | No user-controlled object model, writable resource properties, or role-specific response fields. |
| API4: Unrestricted Resource Consumption | Mitigated with residual risk | Constant-small work, URL cap, batch cap of five, fixed catalog, no subrequests, native rate limiter. Distributed abuse can still consume the Workers Free daily quota; on Free an exhausted allowance costs availability, not money (see `FREE_TIER.md`). |
| API5: Broken Function Level Authorization | Not applicable by architecture | No admin, write, privileged, or role-based functions. |
| API6: Unrestricted Access to Sensitive Business Flows | Low exposure | No sensitive business transaction exists. Curated content does not accept targets, identities, protected traits, or arbitrary user text. |
| API7: Server Side Request Forgery | Structurally mitigated | Production code has no outbound runtime `fetch()` capability or upstream integration. |
| API8: Security Misconfiguration | Actively mitigated | Explicit methods and routes, security headers, no Node compatibility, pinned compatibility date, preview URLs disabled, bounded sampled Workers Logs and traces with query strings redacted, query strings rejected on parameterless routes, unreviewed `wrangler.jsonc` keys rejected by the policy check, strict repository policy. |
| API9: Improper Inventory Management | Actively mitigated | OpenAPI path inventory is tested, live responses are verified against the published response schemas, README route inventory is maintained, documentation references are checked by the policy check, service version is explicit, preview URLs are disabled, and releases are signed. |
| API10: Unsafe Consumption of APIs | Not applicable by architecture | The Worker consumes no third-party runtime API or remote response. |

## Highest residual API risk

API4 remains the main residual risk because the anonymous API has no stable authenticated identity and Cloudflare Worker rate-limit counters are local to a Cloudflare location and intentionally permissive.

The Workers Free plan also has a finite daily request allowance. This is an availability limitation, not an application authorization defect. See `AVAILABILITY.md`.

## Reassessment rule

Re-run this mapping before merging any change that adds:

- accounts or authentication;
- user-owned objects;
- write or admin endpoints;
- arbitrary user text;
- outbound HTTP;
- storage;
- file upload;
- webhooks;
- billing;
- analytics profiles;
- AI inference;
- third-party runtime APIs.
