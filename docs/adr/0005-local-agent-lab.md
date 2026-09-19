# ADR 0005: Local agent lab

Status: Proposed
Date: 2026-09-18

## Context

The API contract is now written so that automated clients can turn it directly into tools. Verifying that claim needs a real model to discover the API, choose operations, build arguments, and recover from validation errors. `lab/agent-lab.mjs` does that by calling the Anthropic Messages API.

ADR 0001 keeps an AI provider out of production. DOCTRINE section 18 requires an ADR before an AI provider is added at all, so this ADR records why a development-only integration is acceptable and where its boundary sits.

## Decision

Keep a local agent lab under `lab/` with these boundaries:

- It is never imported by, bundled into, or deployed with the Worker. `wrangler.jsonc` `main` stays `src/index.ts`, and the production policy checks continue to scan `src/` for outbound fetch and non-relative imports.
- It adds no npm dependencies. It uses only Node built-ins and the platform `fetch`.
- It reads `ANTHROPIC_API_KEY` from the environment only. The key is never written to disk, to traces, to source, or to the repository.
- It sends only what the operator types as a prompt plus the public OpenAPI-derived tool definitions. The Worker still accepts no free-form text, so nothing a model produces can reach the production API except a category, level, and count that the strict allowlists validate.
- Traces are written to `lab/traces/`, which is git-ignored. They contain the prompt, model output, and API responses, and no credentials.
- It is linted and formatted with the rest of the repository, and the repository text policy (no emoji) applies to it.

## Threat and privacy changes

Production threat model: unchanged. The Worker gains no capability, dependency, secret, or network path.

Operator machine: the lab sends the operator's prompt and the API's responses to the Anthropic API, and sends the API key to the configured `ANTHROPIC_BASE_URL`. That variable defaults to the official endpoint and is under the operator's control. Prompts should not contain secrets.

## Cost ceiling

Every run is bounded by `--max-turns` (at most 20) and a 1024 token output limit per turn. The lab makes no calls unless an operator runs it with a key, and CI never runs it.

## Failure mode

Network, provider, and API failures end the run with a clear message and a partial trace. A failed lab run has no effect on the Worker or on `npm run verify`.

## Rollback

Delete `lab/`, its `.gitignore` entry, the `lab` term in the lint and format scripts and their pinned copy in `scripts/policy-check.mjs`, and the README section. Nothing else depends on it.

## Consequences

Any change that moves lab code, a model call, or a provider dependency into `src/`, `package.json` dependencies, or the deployed bundle crosses ADR 0001 and requires a new ADR and a threat-model update.
