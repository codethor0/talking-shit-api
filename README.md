# Talking Shit API

Professional-grade shit talking for unprofessional developer moments.

Talking Shit API is intentionally tiny: one Cloudflare Worker, zero runtime dependencies, no database, no authentication, no arbitrary user text, and no outbound network calls in V1.

## Quick start

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
GET  /openapi.json
HEAD <same GET routes>
OPTIONS <same routes>
```

Categories: `general`, `code`, `debugging`, `deploy`, `meetings`, `security`.

Levels: `mild`, `spicy`, `dark`.

## Project rules

Read [AGENTS.md](AGENTS.md) first if you are using an AI coding agent. The engineering rules live in [docs/DOCTRINE.md](docs/DOCTRINE.md). Architecture and security decisions live in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).

## Verification

One command is the local release gate:

```bash
npm run verify
```

It regenerates Cloudflare types, checks formatting/lint, type-checks production source and authored TypeScript tests in separate type environments, runs the Worker boundary inside workerd plus property tests, audits dependencies, and performs a Wrangler dry-run build.

## Cost model

V1 is designed for the Cloudflare Workers Free plan and a public GitHub repository. No paid database, API, AI model, email service, or custom domain is required.

## License

MIT. See [LICENSE](LICENSE).
