# Release Procedure

1. Start from clean `main` and a clean working tree.
2. Run `npm ci`.
3. Run `npm run verify`.
4. Review dependency and security alerts.
5. Review the diff since the previous release for attack-surface changes.
6. Confirm `README.md`, `src/openapi.ts`, threat model, and version agree.
7. Deploy manually from a trusted maintainer workstation with `npm run deploy` for V1.
8. Smoke test `/v1/health`, `/v1/categories`, `/v1/roast`, and `/openapi.json` over HTTPS.
9. If smoke tests fail, roll back to the previous Cloudflare Worker version before debugging forward.
10. Only after smoke tests pass, create the Git tag/release.

V1 deliberately avoids storing a long-lived Cloudflare deployment credential in GitHub Actions. Deployment automation can be introduced later only with a documented security benefit and least-privilege credential design.

While the temporary `sharp` override exists, confirm `npm ls sharp` resolves only `sharp@0.35.4` before release. Do not use `npm audit fix --force` to bypass a dependency-chain advisory.
