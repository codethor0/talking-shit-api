# Brand and naming

## Canonical names

Brand: Talking Shit

Product: Talking Shit API

Repository: `talking-shit-api`

Cloudflare Worker: `talking-shit-api`

API version namespace: `v1`

Release name format: `Talking Shit API vX.Y.Z`

Git tag format: `vX.Y.Z`

## Tagline

Professional-grade shit talking for unprofessional developer moments.

## Descriptions

Short description:

A tiny, read-only API for curated developer roasts by category and intensity.

Technical description:

A stateless Cloudflare Workers API for curated developer humor with zero runtime dependencies.

## Naming rules

Use "Talking Shit" for the umbrella brand.

Use "Talking Shit API" when referring to this service or product.

Use singular "API". This repository contains one API with multiple endpoints.

Use `talking-shit-api` for infrastructure and repository slugs unless an external platform imposes a different format.

Do not rename public API paths for branding reasons. Route names are part of the API contract.

Do not introduce a custom production domain until ownership, renewal cost, DNS control, and migration behavior are explicitly reviewed. The `workers.dev` hostname remains the zero-cost canonical endpoint until then.

## Future products

If the project expands, new products should remain under the Talking Shit brand and receive descriptive product names, for example Talking Shit CLI or Talking Shit SDK. New products should not be added to this repository unless the repository architecture is intentionally changed.
