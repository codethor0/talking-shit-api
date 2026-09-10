# AI Agent Workflow

Use agents as high-speed contributors, not as autonomous release authorities.

## Task packet

Every non-trivial task should provide:

- Goal: one observable outcome.
- Scope: files/areas expected to change.
- Non-goals: what must remain untouched.
- Security constraints: relevant doctrine/threat-model rules.
- Acceptance criteria: concrete tests or outputs.
- Verification: `npm run verify` plus any task-specific command.

## Loop

```text
SPEC -> INSPECT -> TEST/PLAN -> PATCH -> VERIFY -> DIFF REVIEW -> HUMAN GATE -> MERGE
```

## Agent privileges

Local development agents may edit the working tree and run unprivileged build/test commands. Production secrets, GitHub admin permissions, Cloudflare account-wide credentials, branch-rule changes, release publishing, and destructive operations stay human-controlled unless explicitly delegated for a specific operation.

## Failure rule

When verification fails, fix the product or the test setup. Do not bypass a check, delete a regression test, lower a security threshold, or expand permissions simply to make CI green.
