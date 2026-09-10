# ADR 0001: V1 is one dependency-free Worker

Status: Accepted
Date: 2026-09-09

## Decision

V1 uses one Cloudflare Worker written in TypeScript. Production has no npm dependencies, database, secrets, user accounts, AI provider, outbound HTTP calls, or arbitrary user-generated roast targets.

## Why

The product requirement is tiny. Keeping the system tiny minimizes cost, attack surface, failure modes, operational work, and agent-generated complexity.

## Consequences

Curated content ships with the Worker. The API cannot personalize a roast from arbitrary text in V1. Any change to these boundaries requires another ADR and threat-model update.
