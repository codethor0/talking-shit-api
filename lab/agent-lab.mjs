#!/usr/bin/env node
// Agent lab: watch a Claude model discover and call the Talking Shit API as tools.
//
// This script is a local learning harness. It is not part of the Worker bundle, is never
// deployed, and adds no dependencies. It reads the API key from the environment only.
//
// Flow:
//   1. Fetch /openapi.json from the target API.
//   2. Convert every GET operation that has an operationId into a Claude tool definition.
//   3. Send the user prompt plus the tools to the Messages API.
//   4. When the model asks for a tool, perform the real HTTP request and return the result.
//   5. Repeat until the model stops asking for tools or the turn budget runs out.
//
// Every step is printed to the terminal and written to lab/traces/<timestamp>.jsonl.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const ANTHROPIC_API = `${(process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com").replace(/\/+$/, "")}/v1`;
const ANTHROPIC_VERSION = "2023-06-01";
const LAB_DIRECTORY = dirname(fileURLToPath(import.meta.url));

const DEFAULT_SYSTEM_PROMPT = [
  "You have tools that call the Talking Shit API, a public API of curated developer roasts.",
  "Always get roasts from the tools; never write your own.",
  "If a tool returns an error, read the message, correct the request, and try again.",
  "When you are done, reply to the user with the roasts you retrieved.",
].join(" ");

const { values: options } = parseArgs({
  options: {
    prompt: { type: "string", short: "p" },
    "base-url": { type: "string", default: "http://localhost:8787" },
    model: { type: "string" },
    system: { type: "string", default: DEFAULT_SYSTEM_PROMPT },
    "max-turns": { type: "string", default: "6" },
    "tool-choice": { type: "string", default: "auto" },
    "list-tools": { type: "boolean", default: false },
    "no-trace-file": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

const USAGE = `Usage:
  node lab/agent-lab.mjs --list-tools [--base-url URL]
  node lab/agent-lab.mjs --prompt "roast my git habits, three of them, brutal" [options]

Options:
  --base-url URL       API to call (default http://localhost:8787 from npm run dev)
  --model ID           Claude model ID (default: ANTHROPIC_MODEL, else newest Sonnet listed)
  --system TEXT        Override the system prompt
  --max-turns N        Maximum model round trips (default 6)
  --tool-choice MODE   auto | any | none | <operationId> for the first turn (default auto)
  --list-tools         Print the tool definitions the model will see, then exit
  --no-trace-file      Do not write a JSONL trace under lab/traces/

Environment:
  ANTHROPIC_API_KEY    Required unless --list-tools is used
  ANTHROPIC_MODEL      Optional default model ID
  ANTHROPIC_BASE_URL   Optional Messages API base URL (default https://api.anthropic.com)`;

if (options.help) {
  console.log(USAGE);
  process.exit(0);
}

const baseUrl = options["base-url"].replace(/\/+$/, "");
const maxTurns = /^\d{1,2}$/.test(options["max-turns"]) ? Number(options["max-turns"]) : Number.NaN;
if (!Number.isSafeInteger(maxTurns) || maxTurns < 1 || maxTurns > 20) {
  fail("--max-turns must be a whole number from 1 to 20.");
}

// ---------------------------------------------------------------------------
// Terminal and trace output
// ---------------------------------------------------------------------------

const traceEvents = [];
const startedAt = Date.now();

function elapsed() {
  return `${String(Date.now() - startedAt).padStart(6, " ")}ms`;
}

function trace(kind, detail) {
  traceEvents.push({ at_ms: Date.now() - startedAt, kind, ...detail });
}

function section(title) {
  console.log(`\n${elapsed()}  == ${title} ==`);
}

function line(label, text) {
  const body = String(text).split("\n").join("\n                ");
  console.log(`${elapsed()}  ${label.padEnd(8, " ")}${body}`);
}

function truncate(text, limit = 400) {
  return text.length > limit ? `${text.slice(0, limit)}... (${text.length} chars)` : text;
}

function fail(message) {
  console.error(`agent-lab: ${message}`);
  process.exit(1);
}

// Node reports network failures as "fetch failed" and hides the useful part in error.cause.
function describeError(error) {
  const cause = error?.cause?.code ?? error?.cause?.message;
  return cause ? `${error.message}: ${cause}` : String(error?.message ?? error);
}

// ---------------------------------------------------------------------------
// OpenAPI -> tool definitions
// ---------------------------------------------------------------------------

async function loadTools() {
  let response;
  try {
    response = await fetch(`${baseUrl}/openapi.json`);
  } catch (error) {
    fail(
      `could not reach ${baseUrl} (${describeError(error)}). Is the API running? Try npm run dev.`,
    );
  }
  if (!response.ok) {
    fail(`could not load ${baseUrl}/openapi.json (HTTP ${response.status}).`);
  }
  let spec;
  try {
    spec = await response.json();
  } catch {
    fail(`${baseUrl}/openapi.json did not return JSON. Is --base-url the API root?`);
  }
  const tools = [];
  const routes = new Map();

  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    const operation = item.get;
    if (!operation?.operationId) continue;

    const properties = {};
    const required = [];
    for (const parameter of operation.parameters ?? []) {
      if (parameter.in !== "query") continue;
      properties[parameter.name] = {
        ...parameter.schema,
        ...(parameter.description ? { description: parameter.description } : {}),
      };
      if (parameter.required) required.push(parameter.name);
    }

    tools.push({
      name: operation.operationId,
      description: [operation.summary, operation.description].filter(Boolean).join(". "),
      input_schema: { type: "object", properties, required, additionalProperties: false },
    });
    routes.set(operation.operationId, { path, parameterNames: Object.keys(properties) });
  }

  if (tools.length === 0) {
    fail(
      `${baseUrl}/openapi.json (v${spec.info?.version}) has no GET operations with an operationId, ` +
        "so there is nothing to turn into tools. Point --base-url at a build that includes the " +
        "agent-friendly contract, such as npm run dev.",
    );
  }

  return { tools, routes, specVersion: spec.info?.version };
}

// ---------------------------------------------------------------------------
// Tool execution: a real HTTP GET against the API
// ---------------------------------------------------------------------------

async function executeTool(routes, name, input) {
  const route = routes.get(name);
  if (!route) {
    return { isError: true, content: `Unknown tool ${name}.` };
  }

  const url = new URL(`${baseUrl}${route.path}`);
  for (const [key, value] of Object.entries(input ?? {})) {
    if (value === undefined || value === null) continue;
    // Pass through exactly what the model chose, including invalid keys, so the
    // API's own validation and error messages are what the model learns from.
    url.searchParams.set(key, String(value));
  }

  const started = Date.now();
  let response;
  let text;
  try {
    response = await fetch(url);
    text = await response.text();
  } catch (error) {
    // Hand transport failures back to the model as a tool error instead of ending the run.
    return {
      isError: true,
      content: `Request failed before the API responded: ${describeError(error)}.`,
      http: { method: "GET", url: url.toString(), status: null, latency_ms: Date.now() - started },
    };
  }
  const latencyMs = Date.now() - started;

  let ok = response.ok;
  try {
    ok = ok && JSON.parse(text).ok === true;
  } catch {
    ok = false;
  }

  return {
    isError: !ok,
    content: text,
    http: { method: "GET", url: url.toString(), status: response.status, latency_ms: latencyMs },
  };
}

// ---------------------------------------------------------------------------
// Anthropic Messages API
// ---------------------------------------------------------------------------

function anthropicHeaders(apiKey) {
  return {
    "x-api-key": apiKey,
    "anthropic-version": ANTHROPIC_VERSION,
    "content-type": "application/json",
  };
}

async function resolveModel(apiKey) {
  if (options.model) return options.model;
  if (process.env.ANTHROPIC_MODEL) return process.env.ANTHROPIC_MODEL;

  const response = await fetch(`${ANTHROPIC_API}/models?limit=100`, {
    headers: anthropicHeaders(apiKey),
  });
  if (!response.ok) {
    fail(`could not list models (HTTP ${response.status}); pass --model explicitly.`);
  }
  const { data = [] } = await response.json();
  const pick = data.find((model) => model.id.includes("sonnet")) ?? data[0];
  if (!pick) fail("no models were listed; pass --model explicitly.");
  return pick.id;
}

function toolChoice(mode) {
  if (mode === "auto" || mode === "any" || mode === "none") return { type: mode };
  return { type: "tool", name: mode };
}

async function createMessage(apiKey, body) {
  const response = await fetch(`${ANTHROPIC_API}/messages`, {
    method: "POST",
    headers: anthropicHeaders(apiKey),
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Messages API returned non-JSON (HTTP ${response.status}): ${truncate(text)}`);
  }
  if (!response.ok) {
    throw new Error(
      `Messages API error (HTTP ${response.status}): ${JSON.stringify(payload.error ?? payload)}`,
    );
  }
  return payload;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const { tools, routes, specVersion } = await loadTools();

if (options["list-tools"]) {
  console.log(JSON.stringify(tools, null, 2));
  console.error(
    `\n${tools.length} tools generated from ${baseUrl}/openapi.json (v${specVersion}).`,
  );
  process.exit(0);
}

if (!options.prompt) fail(`--prompt is required.\n\n${USAGE}`);
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) fail("ANTHROPIC_API_KEY is not set.");

const forcedModes = new Set(["auto", "any", "none"]);
if (!forcedModes.has(options["tool-choice"]) && !routes.has(options["tool-choice"])) {
  fail(`--tool-choice must be auto, any, none, or one of: ${[...routes.keys()].join(", ")}.`);
}

const model = await resolveModel(apiKey);

section("setup");
line("api", `${baseUrl} (contract v${specVersion})`);
line("model", model);
line("tools", tools.map((tool) => tool.name).join(", "));
line("user", options.prompt);
trace("setup", { base_url: baseUrl, model, tools, system: options.system, prompt: options.prompt });

const messages = [{ role: "user", content: options.prompt }];
const totals = { input_tokens: 0, output_tokens: 0, tool_calls: 0, tool_errors: 0 };
let finalText = "";
let failure = null;

try {
  for (let turn = 1; turn <= maxTurns; turn += 1) {
    section(`turn ${turn}`);
    const request = {
      model,
      max_tokens: 1024,
      system: options.system,
      tools,
      // A forced tool choice applies to the first turn only, so the model can still finish.
      tool_choice: turn === 1 ? toolChoice(options["tool-choice"]) : { type: "auto" },
      messages,
    };
    const reply = await createMessage(apiKey, request);

    totals.input_tokens += reply.usage?.input_tokens ?? 0;
    totals.output_tokens += reply.usage?.output_tokens ?? 0;
    trace("model_response", {
      turn,
      stop_reason: reply.stop_reason,
      usage: reply.usage,
      content: reply.content,
    });

    const toolResults = [];
    for (const block of reply.content) {
      if (block.type === "text" && block.text.trim()) {
        line("model", block.text.trim());
        finalText = block.text.trim();
      } else if (block.type === "tool_use") {
        totals.tool_calls += 1;
        line("call", `${block.name}(${JSON.stringify(block.input)})`);
        const result = await executeTool(routes, block.name, block.input);
        if (result.http) {
          line(
            "http",
            `${result.http.method} ${result.http.url} -> ${result.http.status ?? "no response"} in ${result.http.latency_ms}ms`,
          );
        }
        line(result.isError ? "error" : "result", truncate(result.content));
        if (result.isError) totals.tool_errors += 1;
        trace("tool_call", {
          turn,
          tool_use_id: block.id,
          name: block.name,
          input: block.input,
          http: result.http,
          is_error: result.isError,
          result: result.content,
        });
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result.content,
          ...(result.isError ? { is_error: true } : {}),
        });
      }
    }
    line("stop", reply.stop_reason);

    messages.push({ role: "assistant", content: reply.content });
    if (reply.stop_reason !== "tool_use") break;
    messages.push({ role: "user", content: toolResults });

    if (turn === maxTurns) line("stop", "turn budget exhausted");
  }
} catch (error) {
  failure = describeError(error);
  line("failed", failure);
  trace("failure", { message: failure });
}

section("summary");
line("calls", `${totals.tool_calls} tool calls, ${totals.tool_errors} returned errors`);
line("tokens", `${totals.input_tokens} input, ${totals.output_tokens} output`);
trace("summary", { ...totals, final_text: finalText, failed: failure !== null });

// Written on failure too: a partial trace is the most useful artifact of a broken run.
if (!options["no-trace-file"]) {
  const traceDirectory = join(LAB_DIRECTORY, "traces");
  await mkdir(traceDirectory, { recursive: true });
  const file = join(traceDirectory, `${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`);
  await writeFile(file, `${traceEvents.map((event) => JSON.stringify(event)).join("\n")}\n`);
  line("trace", file);
}

if (failure !== null) process.exit(1);
