# Talking Shit API

Professional-grade shit talking for unprofessional developer moments.

Talking Shit API is a tiny public API that returns curated developer roasts by category and intensity. It is intentionally boring underneath: one Cloudflare Worker, zero runtime dependencies, no database, no authentication, no arbitrary user text, no application secrets, and no outbound network calls in V1.

Live API: `https://talking-shit-api.codethor0.workers.dev`

## Try it

```bash
curl 'https://talking-shit-api.codethor0.workers.dev/v1/roast?category=code&level=dark'
```

Want the API to make every decision:

```bash
curl 'https://talking-shit-api.codethor0.workers.dev/v1/surprise'
```

Or run it locally:

```bash
npm ci
npm run types
npm run verify
npm run dev
```

Then:

```bash
curl 'http://localhost:8787/v1/roast?category=code&level=dark'
```

## API

```text
GET  /
GET  /v1/health
GET  /v1/categories
GET  /v1/roast?category=code&level=dark
GET  /v1/surprise
GET  /v1/stats
GET  /openapi.json
HEAD <same GET routes>
OPTIONS <same GET routes>
```

Categories: `general`, `code`, `debugging`, `deploy`, `meetings`, `security`, `git`, `oncall`.

Levels: `mild`, `spicy`, `dark`.

Defaults: `general` and `spicy`.

## Design

V1 favors a small attack surface and predictable operation over feature count. Curated content ships inside the Worker. Random selection, including surprise category and intensity selection, uses platform cryptography. Public input is allowlisted and never enters an execution context.

The full architecture and threat model live in `docs/ARCHITECTURE.md` and `docs/THREAT_MODEL.md`.

## Verification

One command is the local release gate:

```bash
npm run verify
```

It checks repository policy, formatting and lint, generated Cloudflare types, strict typechecking, unit and workerd-boundary tests, a Wrangler dry-run build, dependency policy, and the vulnerability audit.

## Contributing

Read `CONTRIBUTING.md` before opening a pull request. If you use an AI coding agent, also read `AGENTS.md` and `docs/AGENT-WORKFLOW.md`.

Security issues must be reported privately as described in `SECURITY.md`.

## Cost model

V1 is designed for the Cloudflare Workers Free plan and a public GitHub repository. No paid database, API, AI model, email service, or custom domain is required.

## License

MIT. See `LICENSE`.
