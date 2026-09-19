# Agent lab

A local harness for watching a Claude model discover the Talking Shit API, decide which operation to call, build the arguments, and recover from errors.

The lab is a learning tool. It is not part of the Worker bundle, is never deployed, adds no npm dependencies, and reads the Anthropic API key only from the environment. Nothing under `lab/` changes the production security boundary.

## How it works

```text
openapi.json --> tool definitions --> Messages API --> tool_use block
                                          ^                  |
                                          |                  v
                                     tool_result <-- real HTTP GET to the API
```

1. The lab fetches `/openapi.json` and turns every `GET` operation that has an `operationId` into a tool. The `operationId` becomes the tool name, the summary and description become the tool description, and the query parameters (with their enums, bounds, defaults, and descriptions) become the input schema.
2. It sends your prompt, a short system prompt, and the tools to the Messages API.
3. When the model replies with `stop_reason: "tool_use"`, the lab performs the real HTTP request and sends the JSON body back as a `tool_result`, marked `is_error` when the API returned `ok: false`.
4. It repeats until the model stops asking for tools or the turn budget runs out.

Every step is printed with a millisecond timestamp and written to `lab/traces/<timestamp>.jsonl`, which is git-ignored.

## Run it

Terminal one:

```bash
npm run dev
```

Terminal two:

```bash
# See exactly what the model sees. No API key needed.
node lab/agent-lab.mjs --list-tools

# Run an agent loop.
export ANTHROPIC_API_KEY=...   # never commit this
node lab/agent-lab.mjs --prompt "roast my git habits, three of them, brutal"
```

Use `--base-url https://talking-shit-api.codethor0.workers.dev` to point at production instead, once the deployed release includes the agent-friendly contract (`operationId` on every operation). An older release has none, and the lab stops with a message saying so. Keep experiments low-volume; the production rate limit is 120 requests per minute per client.

The model defaults to `ANTHROPIC_MODEL`, or the newest Sonnet model the Models API lists. Override it with `--model`.

## Experiments worth running

| Question | Try |
| --- | --- |
| Does it pick batch over repeated single calls? | `--prompt "give me four meeting roasts"` |
| How does it map words to the enum? | `--prompt "roast my kubernetes rollout"` (no `kubernetes` category exists) |
| Does it use error messages to self-correct? | `--prompt "roast my CI, 10 of them"` (count is capped at 5) |
| When does it choose surprise? | `--prompt "hit me with anything"` |
| What changes if it must call a tool? | add `--tool-choice any` or `--tool-choice getRoast` |
| How much do descriptions matter? | `--base-url` against an older release without operation descriptions and compare traces |
| How does the system prompt steer it? | `--system "Only call one tool, ever."` |

## Reading a trace

Each JSONL line has `at_ms`, `kind`, and details:

- `setup`: the model, the exact tool definitions, the system prompt, and the user prompt.
- `model_response`: `stop_reason`, token `usage`, and the raw content blocks, including any text the model wrote before calling a tool.
- `tool_call`: the tool name and input the model chose, the resulting HTTP request, status, latency, and body.
- `summary`: totals for calls, errors, and tokens, plus the final text.

`jq` makes traces easy to slice:

```bash
jq -c 'select(.kind == "tool_call") | {name, input, status: .http.status}' lab/traces/*.jsonl
```
