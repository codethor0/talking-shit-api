import { execFileSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
const invocationRoot = realpathSync(process.cwd());
const expectedReleaseCommit = process.env.EXPECTED_RELEASE_COMMIT ?? "";
const githubRepository = "codethor0/talking-shit-api";

function git(args) {
  return execFileSync("git", args, {
    cwd: scriptRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

if (!/^[0-9a-f]{40}$/.test(expectedReleaseCommit)) {
  throw new Error(
    "RELEASE PREFLIGHT: EXPECTED_RELEASE_COMMIT must be the exact 40-character reviewed commit SHA.",
  );
}

if (invocationRoot !== scriptRoot) {
  throw new Error("RELEASE PREFLIGHT: run candidate upload from the repository root.");
}

if (realpathSync(git(["rev-parse", "--show-toplevel"])) !== scriptRoot) {
  throw new Error("RELEASE PREFLIGHT: Git repository root does not match the project root.");
}

const githubCommit = JSON.parse(
  execFileSync(
    "gh",
    [
      "api",
      "--hostname",
      "github.com",
      `repos/${githubRepository}/commits/${expectedReleaseCommit}`,
    ],
    {
      cwd: scriptRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  ),
);
const githubVerification = githubCommit.commit?.verification;

if (
  githubCommit.sha !== expectedReleaseCommit ||
  githubVerification?.verified !== true ||
  githubVerification.reason !== "valid"
) {
  throw new Error(
    "RELEASE PREFLIGHT: GitHub does not report EXPECTED_RELEASE_COMMIT as a valid verified commit.",
  );
}

if (git(["branch", "--show-current"]) !== "main") {
  throw new Error("RELEASE PREFLIGHT: candidate upload must run from main.");
}

if (git(["rev-parse", "HEAD"]) !== expectedReleaseCommit) {
  throw new Error("RELEASE PREFLIGHT: HEAD does not match EXPECTED_RELEASE_COMMIT.");
}

if (git(["status", "--porcelain=v1", "--untracked-files=all"]) !== "") {
  throw new Error("RELEASE PREFLIGHT: working tree must be completely clean.");
}

const remoteMain = git(["ls-remote", "--heads", "origin", "refs/heads/main"]).split(/\s+/)[0] ?? "";
if (remoteMain !== expectedReleaseCommit) {
  throw new Error("RELEASE PREFLIGHT: origin/main does not match EXPECTED_RELEASE_COMMIT.");
}

const committedConfigBlob = git(["rev-parse", `${expectedReleaseCommit}:wrangler.jsonc`]);
const workingConfigBlob = git(["hash-object", "wrangler.jsonc"]);

if (workingConfigBlob !== committedConfigBlob) {
  throw new Error("RELEASE PREFLIGHT: wrangler.jsonc does not match the reviewed commit.");
}

if (existsSync(resolve(scriptRoot, ".wrangler/deploy/config.json"))) {
  throw new Error(
    "RELEASE PREFLIGHT: local .wrangler/deploy/config.json redirect is forbidden for release operations.",
  );
}

console.log(
  "RELEASE PREFLIGHT: PASS - exact clean signed main commit, remote main anchor, reviewed wrangler.jsonc, and no local config redirect.",
);
