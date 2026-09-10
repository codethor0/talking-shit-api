# Incident Response

## Goal

Restore safe service first, preserve evidence, and avoid making the incident worse while debugging.

The API stores no user records and has no application secrets, so the primary incident classes are availability failure, release regression, repository or maintainer compromise, dependency/toolchain compromise, unexpected public exposure, and security-control drift.

## Detection sources

Use:

- GitHub CodeQL and dependency review;
- the scheduled read-only security audit;
- GitHub private vulnerability reports;
- Cloudflare aggregate service metrics and deployment history;
- production health and smoke checks;
- maintainer or user reports.

Persisted request-level Workers Logs are intentionally disabled.

## Immediate triage

Record:

```text
UTC timestamp
production service version
current GitHub main SHA
current Cloudflare deployment/version ID
last known good deployment/version ID
observed HTTP status or failure
affected routes
whether the issue is security, availability, or both
```

Do not publish exploit details in an issue or public chat.

## Containment

For a production regression, prefer rollback before forward debugging.

For suspected maintainer or repository compromise:

1. Stop releases and deployments.
2. Revoke or rotate affected GitHub and Cloudflare control-plane credentials.
3. Verify branch protection, release tags, commit signatures, workflow files, CODEOWNERS, and repository settings.
4. Compare `main` to the last trusted signed release anchor.
5. Restore only from a known-good signed state.

For dependency or CI compromise:

1. Stop merges.
2. Preserve the lockfile and failing evidence.
3. Do not run `npm audit fix --force`.
4. Verify package registry signatures and provenance.
5. Review any affected action SHA or package version before changing it.

## Recovery gate

Recovery is complete only after:

```text
trusted main SHA verified
required signatures verified
npm run verify passes
npm audit signatures passes
code scanning reviewed
dependency review clean
sustained production version convergence passed
production semantic checks pass
production smoke passes after sustained convergence
final production stability samples pass
repository surface clean
```

## Evidence handling

Keep only the minimum evidence needed. Do not collect user data that the application does not normally retain. Do not paste credentials, tokens, raw client addresses, or private vulnerability details into public issues.

## Post-incident

Document root cause, affected control, containment, recovery, and the smallest preventive change. Update the threat model or security baseline if the incident exposed an undocumented assumption.
