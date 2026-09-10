#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

for command_name in node npm git; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "ERROR: required command not found: $command_name" >&2
    exit 1
  fi
done

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [[ "$NODE_MAJOR" != "24" ]]; then
  echo "ERROR: Node.js 24 is required. Found: $(node -v)" >&2
  exit 1
fi

echo "==> Node $(node -v), npm $(npm -v), Git $(git --version | awk '{print $3}')"
echo "==> Checking pre-install source policy"
node scripts/policy-check.mjs

echo "==> Resolving exact development toolchain into package-lock.json"
npm install --package-lock-only --ignore-scripts --no-fund --no-audit

echo "==> Checking resolved dependency policy before install scripts"
node scripts/dependency-policy.mjs

echo "==> Installing from lockfile"
npm ci --no-fund --no-audit

echo "==> Formatting scaffold"
npm run format

echo "==> Running full verification gate"
npm run verify

echo "==> Initializing local Git repository"
git init -q -b main
git add -A
git diff --cached --check

echo
echo "BOOTSTRAP PASSED"
echo "Repository: $ROOT"
echo "Next: inspect with 'git status' and 'git diff --cached'."
