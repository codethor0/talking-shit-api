import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const packageJson = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const packageLock = JSON.parse(await readFile(new URL("package-lock.json", root), "utf8"));

const expectedSharp = "0.35.4";

if (packageJson.overrides?.sharp !== expectedSharp) {
  throw new Error(`DEPENDENCY POLICY: expected sharp override ${expectedSharp}.`);
}

const sharpPackages = Object.entries(packageLock.packages ?? {}).filter(([path]) =>
  /(?:^|\/)node_modules\/sharp$/.test(path),
);

if (sharpPackages.length === 0) {
  throw new Error("DEPENDENCY POLICY: package-lock.json contains no resolved sharp package.");
}

const versions = new Set();
for (const [, metadata] of sharpPackages) {
  if (typeof metadata?.version !== "string") {
    throw new Error("DEPENDENCY POLICY: resolved sharp package is missing a version.");
  }
  versions.add(metadata.version);
}

if (versions.size !== 1 || !versions.has(expectedSharp)) {
  throw new Error(
    `DEPENDENCY POLICY: sharp must resolve only to ${expectedSharp}; found ${[...versions].sort().join(", ")}.`,
  );
}

console.log(`DEPENDENCY POLICY: PASS - sharp resolves only to patched ${expectedSharp}.`);
