import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const packageJson = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const tsconfig = JSON.parse(await readFile(new URL("tsconfig.json", root), "utf8"));
const testTsconfig = JSON.parse(await readFile(new URL("test/tsconfig.json", root), "utf8"));

const codeOwners = (await readFile(new URL(".github/CODEOWNERS", root), "utf8")).trim();
if (!codeOwners.split(/\r?\n/).includes("* @codethor0")) {
  throw new Error("POLICY: .github/CODEOWNERS must retain the catch-all @codethor0 owner.");
}

let dependabotConfigPresent = true;
try {
  await readFile(new URL(".github/dependabot.yml", root), "utf8");
} catch (error) {
  if (error?.code === "ENOENT") dependabotConfigPresent = false;
  else throw error;
}

if (dependabotConfigPresent) {
  throw new Error(
    "POLICY: .github/dependabot.yml is forbidden; dependency updates are maintainer-controlled.",
  );
}

if (packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0) {
  throw new Error("POLICY: V1 production dependencies must remain empty.");
}

if (packageJson.overrides?.sharp !== "0.35.4") {
  throw new Error(
    "POLICY: sharp must remain pinned to patched 0.35.4 until the stable Cloudflare toolchain no longer resolves a vulnerable version.",
  );
}

if (packageJson.allowScripts?.["sharp@0.35.4"] !== true) {
  throw new Error(
    "POLICY: only the explicitly reviewed sharp@0.35.4 lifecycle script may be enabled.",
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
  { pattern: /from\s+["']node:/, name: "Node.js module import" },
  {
    pattern: /from\s+["'](?:http|https|fs|net|tls|child_process)["']/,
    name: "server module import",
  },
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

  const imports = source.matchAll(/from\s+["']([^"']+)["']/g);
  for (const match of imports) {
    const specifier = match[1];
    if (specifier && !specifier.startsWith(".")) {
      throw new Error(`POLICY: non-relative production import '${specifier}' found in ${file}`);
    }
  }
}

const entrySource = await readFile(new URL("src/index.ts", root), "utf8");
const namedExportPattern =
  /export\s+(?:async\s+)?(?:function|class|const|let|var|type|interface)\b|export\s*\{/;
if (namedExportPattern.test(entrySource)) {
  throw new Error("POLICY: src/index.ts must expose only the default Worker entrypoint in V1.");
}

console.log(
  "POLICY: PASS - zero runtime dependencies, patched sharp override, strict production Worker types, isolated test typing, one workerd boundary test, one public entrypoint, CODEOWNERS present, Dependabot version updates absent, repository text emoji-free.",
);
