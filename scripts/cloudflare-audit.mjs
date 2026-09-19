#!/usr/bin/env node
// Read-only audit of the Cloudflare account against the free-tier boundary in
// docs/security/FREE_TIER.md.
//
// It runs Wrangler's own read-only list and view commands, so it uses the login you already have
// (`npx wrangler login` opens a browser and asks you to click Allow). It never reads, prints, or
// stores a token, calls no Cloudflare API itself, and changes nothing on the account.
//
// Usage:
//   node scripts/cloudflare-audit.mjs           run the audit
//   node scripts/cloudflare-audit.mjs --open    also open the two dashboard pages that only a
//                                               person can read: the plan and the live
//                                               observability settings
//
// Exit code is 1 if any check FAILs. REVIEW means the output could not be classified and needs a
// human look.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { platform } from "node:os";

const CONFIG_PATH = new URL("../wrangler.jsonc", import.meta.url);
const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const WORKER = config.name;
const wantOpen = process.argv.includes("--open");

const DASHBOARD_PAGES = [
  {
    label: "Plan (must read Free)",
    url: "https://dash.cloudflare.com/?to=/:account/workers/plans",
  },
  {
    label: `Live observability settings (must match wrangler.jsonc: logs ${config.observability?.logs?.head_sampling_rate}, traces ${config.observability?.traces?.head_sampling_rate})`,
    url: `https://dash.cloudflare.com/?to=/:account/workers/services/view/${WORKER}/production/settings`,
  },
];

function wrangler(args) {
  const result = spawnSync("npx", ["--no-install", "wrangler", ...args], {
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", CI: "1" },
    timeout: 90_000,
  });
  const text = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return { code: result.status, text, lower: text.toLowerCase() };
}

// Wrangler prints banners around its JSON. Take the outermost JSON value in the output.
function extractJson(text) {
  const starts = [text.indexOf("["), text.indexOf("{")].filter((index) => index >= 0);
  if (starts.length === 0) return undefined;
  const start = Math.min(...starts);
  const end = Math.max(text.lastIndexOf("]"), text.lastIndexOf("}"));
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

const results = [];
function record(name, status, detail) {
  results.push({ name, status, detail });
}

function expectEmptyJsonList(name, args) {
  const { text } = wrangler(args);
  const value = extractJson(text);
  if (Array.isArray(value)) {
    record(name, value.length === 0 ? "PASS" : "FAIL", `${value.length} found`);
  } else {
    record(name, "REVIEW", "output was not a JSON list");
  }
}

function expectPhrase(name, args, phrase, passDetail) {
  const { lower } = wrangler(args);
  record(name, lower.includes(phrase) ? "PASS" : "REVIEW", passDetail);
}

expectEmptyJsonList("KV namespaces", ["kv", "namespace", "list"]);
expectEmptyJsonList("D1 databases", ["d1", "list", "--json"]);
expectEmptyJsonList("Worker secrets", [
  "secret",
  "list",
  "--config",
  "./wrangler.jsonc",
  "--format",
  "json",
]);

{
  const { text, lower } = wrangler(["r2", "bucket", "list"]);
  if (lower.includes("10042") || lower.includes("enable r2")) {
    record("R2", "PASS", "not enabled on the account");
  } else if (/name:/i.test(text)) {
    record(
      "R2",
      "FAIL",
      "R2 is enabled and has buckets; billing behavior on Free is not documented",
    );
  } else {
    record("R2", "REVIEW", "R2 may be enabled; check the dashboard");
  }
}

expectPhrase("Vectorize indexes", ["vectorize", "list"], "haven't created any indexes", "none");
expectPhrase("Secrets Store", ["secrets-store", "store", "list", "--remote"], "no stores", "none");

for (const [name, args] of [
  ["Queues", ["queues", "list"]],
  ["Hyperdrive configs", ["hyperdrive", "list"]],
]) {
  const { code, text } = wrangler(args);
  const hasRows = /[|│]\s*\w/.test(text);
  record(name, code === 0 && !hasRows ? "PASS" : "REVIEW", hasRows ? "rows listed" : "none");
}

// Live deployment and version.
let liveVersionId;
{
  const { text } = wrangler(["deployments", "status", "--config", "./wrangler.jsonc", "--json"]);
  const deployment = extractJson(text);
  const versions = Array.isArray(deployment?.versions) ? deployment.versions : [];
  const serving = versions.filter((version) => version.percentage > 0);
  if (serving.length === 1 && serving[0].percentage === 100) {
    liveVersionId = serving[0].version_id;
    record("Deployment", "PASS", `one version at 100 percent (${liveVersionId.slice(0, 8)})`);
  } else {
    record(
      "Deployment",
      "FAIL",
      `expected exactly one version at 100 percent, found ${serving.length}`,
    );
  }
}

if (liveVersionId) {
  const { text } = wrangler([
    "versions",
    "view",
    liveVersionId,
    "--config",
    "./wrangler.jsonc",
    "--json",
  ]);
  const version = extractJson(text);
  const resources = version?.resources;
  if (resources) {
    const bindings = (resources.bindings ?? []).map((binding) => `${binding.type}:${binding.name}`);
    const expectedBindings = (config.ratelimits ?? []).map((limit) => `ratelimit:${limit.name}`);
    record(
      "Live bindings",
      JSON.stringify(bindings.sort()) === JSON.stringify(expectedBindings.sort()) ? "PASS" : "FAIL",
      bindings.join(", ") || "none",
    );

    const runtime = resources.script_runtime ?? {};
    const sameFlags =
      JSON.stringify([...(runtime.compatibility_flags ?? [])].sort()) ===
      JSON.stringify([...(config.compatibility_flags ?? [])].sort());
    record(
      "Compatibility settings",
      runtime.compatibility_date === config.compatibility_date && sameFlags ? "PASS" : "FAIL",
      `${runtime.compatibility_date}, ${(runtime.compatibility_flags ?? []).join(" ")}`,
    );

    const handlers = resources.script?.handlers ?? [];
    record(
      "Handlers",
      JSON.stringify(handlers) === JSON.stringify(["fetch"]) ? "PASS" : "FAIL",
      handlers.join(", "),
    );
  } else {
    record("Live version details", "REVIEW", "could not read the live version");
  }
}

const widest = Math.max(...results.map((entry) => entry.name.length));
console.log(`Cloudflare account audit for ${WORKER} (read-only)\n`);
for (const { name, status, detail } of results) {
  console.log(`${status.padEnd(7)} ${name.padEnd(widest)}  ${detail}`);
}

console.log("\nStill needs a person, because Wrangler cannot read them:");
for (const page of DASHBOARD_PAGES) {
  console.log(`  - ${page.label}\n    ${page.url}`);
}

if (wantOpen) {
  const opener =
    platform() === "darwin" ? "open" : platform() === "win32" ? "explorer" : "xdg-open";
  for (const page of DASHBOARD_PAGES) {
    spawnSync(opener, [page.url], { stdio: "ignore" });
  }
  console.log("\nOpened both pages in your default browser. Sign in there if asked.");
} else {
  console.log("\nRun again with --open to open both pages in your browser.");
}

const failed = results.filter((entry) => entry.status === "FAIL").length;
const review = results.filter((entry) => entry.status === "REVIEW").length;
console.log(`\n${results.length - failed - review} passed, ${failed} failed, ${review} to review.`);
process.exit(failed > 0 ? 1 : 0);
