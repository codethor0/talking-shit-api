# Contributing

Talking Shit API is deliberately small. Prefer the smallest change that solves the actual problem and keeps the production Worker boring.

Read `docs/DOCTRINE.md` before opening a pull request. Architecture boundaries are documented in `docs/ARCHITECTURE.md` and `docs/THREAT_MODEL.md`.

## Before changing code

Search existing issues first. If a change alters the public API, security boundary, persistence model, network behavior, or runtime dependencies, discuss it before implementation and update the relevant architecture record.

Bug fixes should include a test that reproduces the failure when practical. Behavior changes require tests and public documentation or OpenAPI updates in the same pull request.

## Verify locally

```bash
npm ci
npm run verify
git diff --check
```

Do not weaken, delete, or skip a test or security gate merely to make a change pass.

## Roast contributions

Roasts belong to an existing category and level unless the API contract is intentionally changing. Keep submissions concise, original, developer-focused, and meaningfully different from existing entries.

Dark and profane humor is welcome. Harassment, threats, doxxing, protected-class abuse, sexual violence, encouragement of self-harm, content targeting minors, and attacks on private individuals are not.

AI-assisted contributions are allowed, but the contributor remains responsible for originality, safety, correctness, and review. Bulk-generated filler will not be accepted.

## Dependencies

A new runtime dependency is not a routine change. Open an architecture discussion first and explain why native platform APIs cannot solve the requirement cleanly.

Development-tool updates are maintainer-controlled, exact-version changes. Update the dependency policy intentionally and run the complete verification gate.

## Security reports

Do not open a public issue for a suspected vulnerability. Use the private vulnerability reporting channel described in `SECURITY.md`.
