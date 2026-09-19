# Studying how API calls work

Talking Shit API is small on purpose so a single request can be followed end to end. Everything here uses free tools and no extra Cloudflare resources. See `docs/security/FREE_TIER.md` for the cost boundary.

Use the public API, or `npm run dev` for a local copy at `http://localhost:8787`. Keep experiments low-volume. Load testing the public API is not authorized research; see `SECURITY.md`.

## 1. Watch one request from the client

Break a request into its phases with curl:

```bash
curl -s -o /dev/null \
  -w 'dns=%{time_namelookup}s connect=%{time_connect}s tls=%{time_appconnect}s ttfb=%{time_starttransfer}s total=%{time_total}s http=%{http_version} status=%{http_code} size=%{size_download}B\n' \
  'https://talking-shit-api.codethor0.workers.dev/v1/roast?category=git&level=dark'
```

Each field is cumulative from the start of the request. Subtract adjacent values to get the cost of a phase: name lookup, TCP connect, TLS handshake, then time to the first byte. The gap between `tls` and `ttfb` is network round trip plus Worker execution.

## 2. Read what the edge tells you

```bash
curl -sI 'https://talking-shit-api.codethor0.workers.dev/v1/roast?category=git&level=dark'
```

- `server: cloudflare` shows the request was served through Cloudflare's network.
- `cf-ray` is a per-request identifier. Its suffix is the airport code of the data center that handled the request, for example `ORD`.
- `alt-svc: h3=":443"` advertises HTTP/3 support.
- `cache-control: no-store` is the API telling every cache not to keep the response.
- The `access-control-*` headers are the CORS policy a browser applies before letting a page read the response.

Repeat the request from another network or region and compare the `cf-ray` suffix and the timing.

## 3. Trigger the error paths on purpose

Each failure is a designed, stable response. The message names the allowed values.

```bash
curl -s 'https://talking-shit-api.codethor0.workers.dev/v1/roast?category=nope'
curl -s 'https://talking-shit-api.codethor0.workers.dev/v1/batch?count=9'
curl -s -X POST -i 'https://talking-shit-api.codethor0.workers.dev/v1/roast'
```

Observe the status code, the `code` field, and whether the rejected input is ever echoed back. It is not.

## 4. See the server side

The Worker writes no application logs. Cloudflare's platform records a sample of invocations, with query strings redacted.

Live stream, needs an authenticated Wrangler on the maintainer machine:

```bash
npx --no-install wrangler tail --config ./wrangler.jsonc --format pretty --status error
```

`wrangler tail` shows live invocations and is not stored. Because the platform samples, not every request appears.

For history, use the Workers Logs query builder in the Cloudflare dashboard. Filter by status code or path, and group by the `cf-ray` value you captured in step 2. Retention on the Free plan is three days.

## 5. Watch a model use the API

The agent lab turns the OpenAPI contract into tools for a Claude model and traces every tool call, HTTP request, and recovery. See `lab/README.md`.

```bash
node lab/agent-lab.mjs --list-tools
```

Compare how the model recovers from a bad request in the trace: the validation error names the allowed values, so it can correct itself without a second lookup.

## 6. Read the contract

`GET /openapi.json` is the machine-readable contract. The test suite verifies live responses against its schemas, so the document and the behavior cannot drift apart. Compare a response you captured with the schema for that operation.
