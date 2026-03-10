---
name: modelrunner
description: Run prompts through Codex CLI or Claude Code CLI, run debates between agents, or critique loops. Delegates to the modelrunner CLI tool.
argument-hint: <prompt|debate|critique|sessions|resume|serve> [args]
allowed-tools: Bash(bun:*), Bash(modelrunner:*), Bash(cat:*), Read
---

# modelRunner - Agent Orchestration

Run prompts, debates, and critique loops using Codex CLI and Claude Code CLI as backends.

## Commands

### Single Prompt
Send a prompt to an agent and get the response:
```
/modelrunner prompt "What is the capital of France?" --backend claude
/modelrunner prompt "Explain monads" --backend codex --model gpt-5.2
```

### Debate
Two agents explore a topic, push back on each other, with optional contrarian disruption:
```
# Exploratory debate (default) — proposer vs challenger
/modelrunner debate "Best startup to build right now" --tools --sandbox --max-rounds 8

# With personal context from a file
/modelrunner debate "How should I pursue Tarski" --tools --sandbox --context ~/context.md --context-mode strict

# With contrarian agent every 3 rounds
/modelrunner debate "Most impactful AI agents" --tools --sandbox --contrarian-every 3 --max-rounds 10

# Classic adversarial FOR/AGAINST
/modelrunner debate "Tabs vs spaces" --style adversarial --agent1 claude --agent2 codex

# Context as inline text
/modelrunner debate "High-agency moves" --tools --context "19yo EE student, runs software company" --context-mode open
```

### Critique
One agent produces work, another critiques it iteratively:
```
/modelrunner critique "Write a Python fibonacci function"
/modelrunner critique "Write a REST API design" --creator codex --critic claude --max-rounds 5
```

### Sessions
List past sessions or view a specific session transcript:
```
/modelrunner sessions                  # List all sessions
/modelrunner sessions --limit 10       # List recent 10 sessions
/modelrunner sessions <id>             # View full transcript of a session
```

### Resume
Resume an interrupted or errored session from where it left off:
```
/modelrunner resume <session-id>
```

### HTTP Server
Start the API server:
```
/modelrunner serve --port 7420
```

#### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/prompt` | Single prompt execution |
| POST | `/debate` | Start debate (returns `{ sessionId }` immediately) |
| POST | `/critique` | Start critique (returns `{ sessionId }` immediately) |
| GET | `/sessions` | List sessions (`?limit=N` optional) |
| GET | `/sessions/:id` | Get session detail (meta + rounds) |
| GET | `/sessions/:id/stream` | SSE stream — replays completed rounds, then streams live |
| POST | `/sessions/:id/resume` | Resume an interrupted session |

#### SSE Stream Format
```
data: {"type":"round","round":1,"agent":"A","text":"...","conceded":false}
data: {"type":"complete","winner":"Agent B","reason":"concede"}
```

## Implementation

All commands run through the `modelrunner` CLI which is a Bun TypeScript tool located at:
`/Users/eoghancollins/Personal Tools/modelRunner/`

To execute, run from the modelRunner project directory:
```bash
cd "/Users/eoghancollins/Personal Tools/modelRunner" && bun run src/index.ts <subcommand> [args]
```

Or if globally linked:
```bash
modelrunner <subcommand> [args]
```

### Debate Options
| Flag | Description | Default |
|------|-------------|---------|
| `--style` | `exploratory` (proposer/challenger) or `adversarial` (FOR/AGAINST) | `exploratory` |
| `--sandbox` | Sandbox agents in temp dirs, strip all credentials | `false` |
| `--context` | Context string or path to .txt/.md file | none |
| `--context-mode` | `open` (use loosely), `strict` (stay grounded), `none` (ignore) | `open` |
| `--contrarian-every` | Inject contrarian agent every N rounds | disabled |
| `--contrarian-backend` | Backend for contrarian agent | `codex` |
| `--contrarian-model` | Model for contrarian agent | backend default |

### General Options
| Flag | Description | Default |
|------|-------------|---------|
| `--backend` | Agent backend (prompt mode) | `claude` |
| `--model` | Model name (e.g. `gpt-5.2`, `sonnet`, `opus`) | backend default |
| `--tools` | Enable tool use (web search, code, file access) | `false` |
| `--agent1` | First agent backend (debate) | `claude` |
| `--agent2` | Second agent backend (debate) | `codex` |
| `--creator` | Creator backend (critique) | `codex` |
| `--critic` | Critic backend (critique) | `claude` |
| `--max-rounds` | Max rounds for debate/critique | `5` |
| `--port` | Server port | `7420` |
| `--limit` | Max sessions to list | all |

### Sandbox Details
When `--sandbox` is enabled:
- Each agent gets its own temp directory (`/tmp/modelrunner-<session>-<agent>-*`)
- Credentials stripped from env: GH_TOKEN, GITHUB_TOKEN, AWS keys, API keys, SSH_AUTH_SOCK, plus any env var containing "token", "secret", "password", or "credential"
- Agents can READ files anywhere but are cwd-locked and instructed to only WRITE in their sandbox
- Sandboxes auto-cleanup when debate ends

### Contrarian Agent
When `--contrarian-every N` is set:
- Every N rounds, a separate agent receives the full transcript and tears into both agents' ideas
- Finds lazy agreements, blind spots, missing alternatives, and echo chamber effects
- Output is injected into the next round — both debaters see it but aren't obligated to agree
- Always gets `--tools` for independent research

### Session Storage
Sessions are persisted to `~/.modelrunner/sessions/<id>/` with:
- `meta.json` — config, status, timestamps, results
- `rounds.jsonl` — append-only round log (crash-safe)

### Important
- Output goes to stdout. For long-running debates, consider running in background.
- The `--tools` flag gives agents file/shell access (`--full-auto` for codex, `--dangerously-skip-permissions` for claude). Only use when needed.
- Debates end when an agent outputs `CONCEDE` or max rounds are reached.
- Sessions persist across crashes — use `resume` to continue interrupted sessions.
