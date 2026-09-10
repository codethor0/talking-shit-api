import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const packageJson = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const tsconfig = JSON.parse(await readFile(new URL("tsconfig.json", root), "utf8"));
const testTsconfig = JSON.parse(await readFile(new URL("test/tsconfig.json", root), "utf8"));

const typesSource = await readFile(new URL("src/types.ts", root), "utf8");
const readmeSource = await readFile(new URL("README.md", root), "utf8");
const wranglerSource = await readFile(new URL("wrangler.jsonc", root), "utf8");
const openapiSource = await readFile(new URL("src/openapi.ts", root), "utf8");
const securityAuditSource = await readFile(
  new URL(".github/workflows/security-audit.yml", root),
  "utf8",
);

const canonicalProductName = "Talking Shit API";
const canonicalSlug = "talking-shit-api";

if (packageJson.name !== canonicalSlug) {
  throw new Error("POLICY: package name must remain talking-shit-api.");
}

if (!readmeSource.startsWith(`# ${canonicalProductName}\n`)) {
  throw new Error("POLICY: README must use the canonical Talking Shit API product name.");
}

if (!wranglerSource.includes(`"name": "${canonicalSlug}"`)) {
  throw new Error("POLICY: Cloudflare Worker name must remain talking-shit-api.");
}

if (!wranglerSource.includes('"preview_urls": false')) {
  throw new Error("POLICY: Cloudflare Worker preview URLs must remain explicitly disabled.");
}

if (!wranglerSource.includes('"observability": {\n    "enabled": false\n  }')) {
  throw new Error("POLICY: persisted Cloudflare Workers Logs must remain explicitly disabled.");
}

if (!openapiSource.includes(`title: "${canonicalProductName}"`)) {
  throw new Error("POLICY: OpenAPI title must use the canonical Talking Shit API product name.");
}

function extractConstStringArray(source, name) {
  const startMarker = "export const " + name + " = [";
  const start = source.indexOf(startMarker);
  if (start < 0) {
    throw new Error("POLICY: could not find " + name + " in src/types.ts.");
  }

  const bodyStart = start + startMarker.length;
  const end = source.indexOf("] as const;", bodyStart);
  if (end < 0) {
    throw new Error("POLICY: could not parse " + name + " in src/types.ts.");
  }

  return [...source.slice(bodyStart, end).matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function extractReadmeCodeList(label) {
  const line = readmeSource.split(/\r?\n/).find((entry) => entry.startsWith(label + ": "));
  if (!line) {
    throw new Error("POLICY: README is missing the " + label + " line.");
  }

  return [...line.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
}

function assertReadmeList(label, sourceValues) {
  const documentedValues = extractReadmeCodeList(label);
  if (JSON.stringify(documentedValues) !== JSON.stringify(sourceValues)) {
    throw new Error("POLICY: README " + label + " must exactly match src/types.ts.");
  }
}

assertReadmeList("Categories", extractConstStringArray(typesSource, "CATEGORIES"));
assertReadmeList("Levels", extractConstStringArray(typesSource, "LEVELS"));

function sameRecord(actual, expected) {
  const actualEntries = Object.entries(actual ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const expectedEntries = Object.entries(expected).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(actualEntries) === JSON.stringify(expectedEntries);
}

const codeOwners = (await readFile(new URL(".github/CODEOWNERS", root), "utf8")).trim();
if (codeOwners !== "* @codethor0") {
  throw new Error("POLICY: .github/CODEOWNERS must remain exactly * @codethor0.");
}

for (const path of [".github/dependabot.yml", ".github/dependabot.yaml"]) {
  let present = true;
  try {
    await readFile(new URL(path, root), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") present = false;
    else throw error;
  }

  if (present) {
    throw new Error(`POLICY: ${path} is forbidden; dependency updates are maintainer-controlled.`);
  }
}

if (
  !securityAuditSource.includes("schedule:") ||
  !securityAuditSource.includes("workflow_dispatch:")
) {
  throw new Error("POLICY: security audit workflow must support scheduled and manual execution.");
}

if (!securityAuditSource.includes("permissions:\n  contents: read")) {
  throw new Error("POLICY: security audit workflow must remain read-only.");
}

if (!securityAuditSource.includes("persist-credentials: false")) {
  throw new Error("POLICY: security audit checkout must not persist GitHub credentials.");
}

if (!securityAuditSource.includes("npm audit signatures")) {
  throw new Error(
    "POLICY: security audit workflow must verify registry signatures and provenance.",
  );
}

if (/\bsecrets\./.test(securityAuditSource)) {
  throw new Error("POLICY: security audit workflow must not consume repository secrets.");
}

if (/^\s+(?:push|pull_request|pull_request_target)\s*:/m.test(securityAuditSource)) {
  throw new Error("POLICY: security audit workflow must run only on schedule or manual dispatch.");
}

if (packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0) {
  throw new Error("POLICY: V1 production dependencies must remain empty.");
}

const expectedDevDependencies = {
  "@biomejs/biome": "2.5.12",
  "@cloudflare/vitest-plugin": "1.1.5",
  "fast-check": "4.9.0",
  typescript: "7.0.2",
  vitest: "4.1.11",
  wrangler: "4.130.0",
};

if (!sameRecord(packageJson.devDependencies, expectedDevDependencies)) {
  throw new Error(
    "POLICY: development dependencies must remain on the reviewed exact-version allowlist.",
  );
}

if (!sameRecord(packageJson.overrides, { sharp: "0.35.4" })) {
  throw new Error("POLICY: dependency overrides must remain exactly sharp@0.35.4.");
}

const expectedAllowedScripts = {
  "esbuild@0.28.1": true,
  "fsevents@2.3.3": true,
  "sharp@0.35.4": true,
  "workerd@1.20260907.1": true,
  "workerd@1.20260908.1": true,
};

if (!sameRecord(packageJson.allowScripts, expectedAllowedScripts)) {
  throw new Error(
    "POLICY: lifecycle-script permissions must remain exactly on the reviewed versioned allowlist.",
  );
}

const configuredLibs = tsconfig.compilerOptions?.lib ?? [];
if (configuredLibs.some((entry) => /^webworker(?:\.|$)/i.test(entry))) {
  throw new Error(
    "POLICY: TypeScript WebWorker libs are forbidden; wrangler-generated runtime types are authoritative.",
  );
}

const configuredTypes = tsconfig.compilerOptions?.types ?? [];
if (configuredTypes.length !== 1 || configuredTypes[0] !== "./worker-configuration.d.ts") {
  throw new Error(
    "POLICY: production tsconfig must use only ./worker-configuration.d.ts as its runtime type source.",
  );
}

if (tsconfig.compilerOptions?.skipLibCheck !== false) {
  throw new Error("POLICY: production skipLibCheck must remain false.");
}

const testTypes = testTsconfig.compilerOptions?.types ?? [];
if (testTypes.length !== 0) {
  throw new Error(
    "POLICY: authored TypeScript tests must not load Cloudflare Vitest vendor globals; runtime integration lives in runtime.spec.mjs.",
  );
}

if ((testTsconfig.include ?? []).some((entry) => entry.includes("worker-configuration.d.ts"))) {
  throw new Error(
    "POLICY: unit-test typechecking must stay isolated from Wrangler runtime declarations.",
  );
}

const runtimeSpec = await readFile(new URL("test/runtime.spec.mjs", root), "utf8");
if (!runtimeSpec.includes('from "cloudflare:workers"')) {
  throw new Error("POLICY: runtime.spec.mjs must exercise the Worker through cloudflare:workers.");
}

const forbiddenPatterns = [
  { pattern: /\beval\s*\(/, name: "eval()" },
  { pattern: /\bnew\s+Function\s*\(/, name: "new Function()" },
  { pattern: /\bimportScripts\s*\(/, name: "importScripts()" },
  { pattern: /\bWebSocket\s*\(/, name: "WebSocket()" },
  { pattern: /\bimport\s*\(/, name: "dynamic import()" },
  { pattern: /\bglobalThis\.fetch\s*\(/, name: "global outbound fetch()" },
];

const emojiPattern =
  /\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|\uFE0F|\u20E3/u;

const repositoryTextExtensions = new Set([
  ".cjs",
  ".js",
  ".json",
  ".jsonc",
  ".md",
  ".mdx",
  ".mjs",
  ".sh",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const ignoredRepositoryDirectories = new Set([
  ".build",
  ".git",
  ".wrangler",
  "coverage",
  "dist",
  "node_modules",
]);

async function walkRepositoryText(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredRepositoryDirectories.has(entry.name)) {
        files.push(...(await walkRepositoryText(path)));
      }
      continue;
    }

    if (entry.isFile() && repositoryTextExtensions.has(extname(entry.name))) {
      files.push(path);
    }
  }

  return files;
}

for (const file of await walkRepositoryText(fileURLToPath(root))) {
  const source = await readFile(file, "utf8");

  if (emojiPattern.test(source)) {
    throw new Error(
      `POLICY: emoji characters are forbidden in repository code and documentation: ${file}`,
    );
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (entry.isFile() && entry.name.endsWith(".ts")) files.push(path);
  }
  return files;
}

const srcDirectory = fileURLToPath(new URL("src/", root));
for (const file of await walk(srcDirectory)) {
  const source = await readFile(file, "utf8");

  for (const { pattern, name } of forbiddenPatterns) {
    if (pattern.test(source)) {
      throw new Error(`POLICY: forbidden production capability ${name} found in ${file}`);
    }
  }

  const importPatterns = [/from\s+["']([^"']+)["']/g, /import\s+["']([^"']+)["']/g];

  for (const importPattern of importPatterns) {
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1];
      if (specifier && !specifier.startsWith(".")) {
        throw new Error(`POLICY: non-relative production import '${specifier}' found in ${file}`);
      }
    }
  }

  if (!file.endsWith("/index.ts") && /\bfetch\s*\(/.test(source)) {
    throw new Error(`POLICY: outbound fetch() capability found in ${file}`);
  }
}

const entrySource = await readFile(new URL("src/index.ts", root), "utf8");
const entryFetchCalls = entrySource.match(/\bfetch\s*\(/g) ?? [];
if (entryFetchCalls.length !== 1) {
  throw new Error("POLICY: src/index.ts must contain only the single Worker fetch entrypoint.");
}

const namedExportPattern =
  /export\s+(?:async\s+)?(?:function|class|const|let|var|type|interface)\b|export\s*\{/;
if (namedExportPattern.test(entrySource)) {
  throw new Error("POLICY: src/index.ts must expose only the default Worker entrypoint in V1.");
}

const workflowDirectory = fileURLToPath(new URL(".github/workflows/", root));
const workflowEntries = await readdir(workflowDirectory, { withFileTypes: true });
for (const entry of workflowEntries) {
  if (!entry.isFile() || !(entry.name.endsWith(".yml") || entry.name.endsWith(".yaml"))) continue;

  const workflowPath = join(workflowDirectory, entry.name);
  const source = await readFile(workflowPath, "utf8");

  if (/\bpull_request_target\s*:/.test(source)) {
    throw new Error(`POLICY: pull_request_target is forbidden in ${workflowPath}`);
  }

  if (/^\s*permissions\s*:\s*write-all\s*$/m.test(source)) {
    throw new Error(`POLICY: write-all workflow permissions are forbidden in ${workflowPath}`);
  }

  if (/^\s*[A-Za-z_-]+\s*:\s*write\s*$/m.test(source)) {
    throw new Error(
      `POLICY: write workflow permissions require explicit policy review: ${workflowPath}`,
    );
  }

  for (const match of source.matchAll(/^\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/gm)) {
    const action = match[1];
    if (!action || action.startsWith("./")) continue;

    const separator = action.lastIndexOf("@");
    const ref = separator >= 0 ? action.slice(separator + 1) : "";
    if (!/^[0-9a-f]{40}$/.test(ref)) {
      throw new Error(`POLICY: GitHub Action must be pinned to a full commit SHA: ${action}`);
    }
  }
}

console.log(
  "POLICY: PASS - zero runtime dependencies, exact reviewed dev toolchain, exact lifecycle-script allowlist, strict production Worker capabilities, explicit no-log/no-preview privacy controls, isolated test typing, immutable read-only CI actions, exact CODEOWNERS, scheduled signature verification, Dependabot absent, repository text emoji-free.",
);
